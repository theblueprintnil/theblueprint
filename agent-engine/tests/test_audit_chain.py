from __future__ import annotations

import os

import pytest

from agent_engine.audit import (
    GENESIS_PREV_HASH,
    canonical_json,
    entry_hash,
    verify_chain,
)


def _entries(count: int, *, payload_base=None):
    entries = []
    prev = GENESIS_PREV_HASH
    payloads = payload_base or [{"event": i} for i in range(count)]
    for sequence in range(1, count + 1):
        payload = payloads[sequence - 1]
        digest = entry_hash("org-1", sequence, prev, payload)
        entries.append(
            {
                "organizationId": "org-1",
                "sequence": sequence,
                "prevHash": prev,
                "entryHash": digest,
                "payload": payload,
            }
        )
        prev = digest
    return entries


def test_canonical_json_is_key_ordered_and_compact():
    assert canonical_json({"b": 1, "a": 2}) == '{"a":2,"b":1}'
    assert canonical_json({}) == "{}"
    assert canonical_json({"z": {"y": [3, 1], "x": None}}) == '{"z":{"x":null,"y":[3,1]}}'


def test_entry_hash_is_deterministic_and_genesis_linked():
    first = entry_hash("org-1", 1, GENESIS_PREV_HASH, {"a": 1})
    assert first == entry_hash("org-1", 1, GENESIS_PREV_HASH, {"a": 1})
    assert first != entry_hash("org-2", 1, GENESIS_PREV_HASH, {"a": 1})
    assert first != entry_hash("org-1", 2, GENESIS_PREV_HASH, {"a": 1})
    assert first != entry_hash("org-1", 1, "f" * 64, {"a": 1})
    assert first != entry_hash("org-1", 1, GENESIS_PREV_HASH, {"a": 2})


def test_verify_chain_accepts_intact_chain():
    assert verify_chain(_entries(5)) is None
    assert verify_chain(_entries(1)) is None
    assert verify_chain([]) is None


def test_verify_chain_detects_modified_payload():
    entries = _entries(4)
    entries[2]["payload"] = {"event": "tampered"}
    assert verify_chain(entries) == 3


def test_verify_chain_detects_broken_link():
    entries = _entries(4)
    entries[3]["prevHash"] = "0" * 64
    assert verify_chain(entries) == 4


def test_verify_chain_detects_reordered_sequence():
    entries = _entries(3)
    reordered = [entries[0], entries[2], entries[1]]
    assert verify_chain(reordered) == 3


def test_null_payload_hashes_as_empty_object():
    assert entry_hash("org-1", 1, GENESIS_PREV_HASH, None) == entry_hash(
        "org-1", 1, GENESIS_PREV_HASH, {}
    )


DB_TESTS_ENABLED = bool(os.environ.get("ENGINE_DB_TESTS"))


@pytest.mark.skipif(not DB_TESTS_ENABLED, reason="set ENGINE_DB_TESTS=1 to run DB-backed chain tests")
def test_concurrent_append_does_not_fork():
    from concurrent.futures import ThreadPoolExecutor

    from agent_engine.store import AuditActor, Store

    actor = AuditActor(actor_type="agent", actor_id="test-agent", actor_jti=None, scopes=())
    store = Store.from_settings()
    organization_id = "chain-concurrency-test-org"

    def append(index: int) -> int:
        with store.org_transaction(organization_id) as conn:
            return store.append_audit_entry(
                conn,
                organization_id=organization_id,
                action="CHAIN_TEST_APPEND",
                actor=actor,
                payload={"index": index},
            )

    with ThreadPoolExecutor(max_workers=4) as pool:
        sequences = list(pool.map(append, range(12)))
    assert sorted(sequences) == list(range(1, 13))
    assert store.verify_tenant_chain(organization_id) is None
