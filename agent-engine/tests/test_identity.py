import base64
import json
import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from agent_engine.identity import (
    ADMIN_SCOPE,
    MAX_DELEGATION_DEPTH,
    AgentTokenExpired,
    AgentTokenInvalid,
    key_fingerprint,
    load_jwks_public_keys,
    load_pinned_pem,
    principal_from_claims,
    verify_agent_token,
)

ISSUER = "https://keys.blueprint.test"
AUDIENCE = "blueprint-agent-gateway"


def _public_pem(key):
    return key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


def _claims(**overrides):
    now = int(time.time())
    claims = {
        "sub": "agent-subject-1",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": now + 600,
        "iat": now,
        "jti": "jti-1",
        "tenant_id": "tenant-a",
        "org_id": "org-1",
        "agent_id": "agent-outreach",
        "scopes": ["a2a:read", "a2a:task:execute"],
        "delegation_depth": 0,
    }
    claims.update(overrides)
    return claims


def _token(key, *, algorithm="RS256", kid="k1", claims=None):
    payload = _claims()
    if claims:
        payload.update(claims)
    headers = {"kid": kid} if kid else {}
    return jwt.encode(payload, key, algorithm=algorithm, headers=headers)


def _verify(token, public_pem, **kwargs):
    options = {"key_candidates": {"k1": public_pem}, "issuer": ISSUER, "audience": AUDIENCE}
    options.update(kwargs)
    return verify_agent_token(token, **options)


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="module")
def ec_key():
    return ec.generate_private_key(ec.SECP256R1())


def test_happy_path_returns_principal(rsa_key):
    pem = _public_pem(rsa_key)
    principal = _verify(_token(rsa_key), pem)
    assert principal.tenant_id == "tenant-a"
    assert principal.org_id == "org-1"
    assert principal.agent_id == "agent-outreach"
    assert principal.jti == "jti-1"
    assert principal.has_scope("a2a:read")
    assert not principal.has_scope("a2a:sign")
    assert principal.delegation_depth == 0
    assert principal.expires_at is not None


def test_admin_scope_grants_wildcard(rsa_key):
    pem = _public_pem(rsa_key)
    principal = _verify(_token(rsa_key, claims={"scopes": ["a2a:read", ADMIN_SCOPE]}), pem)
    assert principal.has_scope("a2a:sign")
    assert principal.has_scope("a2a:delete")


@pytest.mark.parametrize(
    "dropped",
    ["sub", "iss", "aud", "exp", "iat", "jti", "tenant_id", "org_id", "agent_id", "scopes"],
)
def test_missing_claim_rejected(dropped):
    claims = _claims()
    del claims[dropped]
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(claims)


def test_empty_scopes_rejected():
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(_claims(scopes=[]))


def test_scopes_string_and_list_forms_equivalent():
    spaced = principal_from_claims(_claims(scopes="a2a:read a2a:task:execute"))
    listed = principal_from_claims(_claims(scopes=["a2a:read", "a2a:task:execute"]))
    assert spaced.scopes == listed.scopes


def test_scopes_non_string_entries_rejected():
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(_claims(scopes=["a2a:read", 7]))


def test_expired_token_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    now = int(time.time())
    token = _token(rsa_key, claims={"exp": now - 3600, "iat": now - 4000})
    with pytest.raises(AgentTokenExpired):
        _verify(token, pem)


def test_wrong_issuer_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    with pytest.raises(AgentTokenInvalid):
        _verify(_token(rsa_key, claims={"iss": "https://evil.test"}), pem)


def test_wrong_audience_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    with pytest.raises(AgentTokenInvalid):
        _verify(_token(rsa_key, claims={"aud": "other-service"}), pem)


def test_depth_above_cap_rejected():
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(_claims(delegation_depth=MAX_DELEGATION_DEPTH + 1))


def test_depth_at_cap_accepted(rsa_key):
    pem = _public_pem(rsa_key)
    principal = _verify(_token(rsa_key, claims={"delegation_depth": MAX_DELEGATION_DEPTH}), pem)
    assert principal.delegation_depth == MAX_DELEGATION_DEPTH


def test_depth_non_integer_rejected():
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(_claims(delegation_depth="3"))


def test_alg_none_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    forged = jwt.encode(_claims(), None, algorithm="none", headers={"kid": "k1"})
    with pytest.raises(AgentTokenInvalid):
        _verify(forged, pem)


def test_hs256_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    forged = jwt.encode(_claims(), "shared-secret", algorithm="HS256", headers={"kid": "k1"})
    with pytest.raises(AgentTokenInvalid):
        _verify(forged, pem)


def test_unknown_kid_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    with pytest.raises(AgentTokenInvalid):
        _verify(_token(rsa_key, kid="ghost"), pem)


def test_token_without_kid_tries_all_candidates(rsa_key):
    pem = _public_pem(rsa_key)
    principal = _verify(_token(rsa_key, kid=None), pem)
    assert principal.tenant_id == "tenant-a"


def test_tampered_payload_rejected(rsa_key):
    pem = _public_pem(rsa_key)
    head, body, signature = _token(rsa_key).split(".")
    mangled = body[:-1] + ("A" if body[-1] != "A" else "B")
    with pytest.raises(AgentTokenInvalid):
        _verify(f"{head}.{mangled}.{signature}", pem)


def test_es256_accepted(ec_key):
    pem = _public_pem(ec_key)
    principal = _verify(
        _token(ec_key, algorithm="ES256", kid="ec-1"),
        pem,
        key_candidates={"ec-1": pem},
    )
    assert principal.org_id == "org-1"


def test_jwks_x5c_roundtrip(rsa_key, tmp_path):
    pem = _public_pem(rsa_key)
    now = datetime.now(timezone.utc)
    name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, "blueprint-agent-signer")])
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(rsa_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=1))
        .sign(rsa_key, hashes.SHA256())
    )
    der = certificate.public_bytes(serialization.Encoding.DER)
    jwks_path = tmp_path / "jwks.json"
    jwks_path.write_text(
        json.dumps({"keys": [{"kid": "k1", "x5c": [base64.b64encode(der).decode("ascii")]}]})
    )
    candidates = load_jwks_public_keys(jwks_path)
    assert set(candidates) == {"k1"}
    principal = _verify(_token(rsa_key), candidates["k1"], key_candidates=candidates)
    assert principal.agent_id == "agent-outreach"


def test_pinned_pem_and_fingerprint(rsa_key, tmp_path):
    pem = _public_pem(rsa_key)
    pem_path = tmp_path / "k1.pem"
    pem_path.write_text(pem)
    assert load_pinned_pem(pem_path) == pem
    fingerprint = key_fingerprint(pem)
    assert fingerprint.startswith("sha256:")
    assert len(fingerprint) == len("sha256:") + 64


def test_empty_jti_rejected():
    with pytest.raises(AgentTokenInvalid):
        principal_from_claims(_claims(jti=""))