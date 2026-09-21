from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable, Mapping

GENESIS_PREV_HASH = "0" * 64


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def entry_hash(organization_id: str, sequence: int, prev_hash: str, payload: Any) -> str:
    material = "|".join(
        [
            organization_id,
            str(sequence),
            prev_hash,
            canonical_json({} if payload is None else payload),
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def verify_chain(entries: Iterable[Mapping[str, Any]]) -> int | None:
    """Recompute a tenant's chain and report the first divergent sequence.

    Each entry mapping must carry organizationId, sequence, prevHash, entryHash,
    and payload in ascending sequence order, matching the store's row shape.
    Returns None when the chain is intact.
    """
    prev = GENESIS_PREV_HASH
    for entry in entries:
        sequence = int(entry["sequence"])
        if entry["prevHash"] != prev:
            return sequence
        expected = entry_hash(entry["organizationId"], sequence, prev, entry.get("payload"))
        if entry["entryHash"] != expected:
            return sequence
        prev = entry["entryHash"]
    return None
