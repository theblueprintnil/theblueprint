from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

import jwt
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from jwt import InvalidTokenError

ALGORITHMS = ("RS256", "ES256")
ADMIN_SCOPE = "a2a:admin"
MAX_DELEGATION_DEPTH = 5
REQUIRED_CLAIMS = (
    "sub",
    "iss",
    "aud",
    "exp",
    "iat",
    "jti",
    "tenant_id",
    "org_id",
    "agent_id",
    "scopes",
)


class AgentTokenError(Exception):
    pass


class AgentTokenInvalid(AgentTokenError):
    pass


class AgentTokenExpired(AgentTokenError):
    pass


@dataclass(frozen=True)
class AgentPrincipal:
    subject: str
    agent_id: str
    tenant_id: str
    org_id: str
    scopes: frozenset[str]
    jti: str
    issuer: str
    audience: str
    issued_at: int
    expires_at: int
    delegation_depth: int

    def has_scope(self, scope: str) -> bool:
        return ADMIN_SCOPE in self.scopes or scope in self.scopes


def _parse_scopes(raw: Any) -> frozenset[str]:
    if isinstance(raw, str):
        parts = raw.replace(",", " ").split()
    elif isinstance(raw, (list, tuple)):
        if not all(isinstance(item, str) for item in raw):
            raise AgentTokenInvalid("scopes entries must be strings")
        parts = [item for item in raw if item]
    else:
        raise AgentTokenInvalid("scopes claim missing or invalid")
    if not parts:
        raise AgentTokenInvalid("scopes must not be empty")
    return frozenset(parts)


def principal_from_claims(claims: Mapping[str, Any]) -> AgentPrincipal:
    missing = [claim for claim in REQUIRED_CLAIMS if claim not in claims]
    if missing:
        raise AgentTokenInvalid("missing claims: " + ", ".join(missing))
    for claim in ("sub", "tenant_id", "org_id", "agent_id", "iss", "aud", "jti"):
        value = claims[claim]
        if not isinstance(value, str) or not value:
            raise AgentTokenInvalid(f"{claim} must be a non-empty string")
    for claim in ("exp", "iat"):
        if not isinstance(claims[claim], (int, float)) or isinstance(claims[claim], bool):
            raise AgentTokenInvalid(f"{claim} must be numeric")
    depth = claims.get("delegation_depth", 0)
    if not isinstance(depth, int) or isinstance(depth, bool) or not 0 <= depth <= MAX_DELEGATION_DEPTH:
        raise AgentTokenInvalid(f"delegation_depth must be an integer in [0, {MAX_DELEGATION_DEPTH}]")
    return AgentPrincipal(
        subject=claims["sub"],
        agent_id=claims["agent_id"],
        tenant_id=claims["tenant_id"],
        org_id=claims["org_id"],
        scopes=_parse_scopes(claims["scopes"]),
        jti=claims["jti"],
        issuer=claims["iss"],
        audience=claims["aud"],
        issued_at=int(claims["iat"]),
        expires_at=int(claims["exp"]),
        delegation_depth=depth,
    )


def load_jwks_public_keys(path: str | Path) -> dict[str, str]:
    document = json.loads(Path(path).read_text(encoding="utf-8"))
    keys: dict[str, str] = {}
    for entry in document.get("keys", []):
        kid = entry.get("kid")
        chain = entry.get("x5c")
        if not kid or not chain:
            continue
        der = base64.b64decode(chain[0])
        certificate = x509.load_der_x509_certificate(der)
        keys[kid] = (
            certificate.public_key()
            .public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
            .decode("ascii")
        )
    if not keys:
        raise AgentTokenInvalid("jwks document contains no usable certificate keys")
    return keys


def load_pinned_pem(path: str | Path) -> str:
    text = Path(path).read_text(encoding="utf-8")
    if "BEGIN" not in text:
        raise AgentTokenInvalid("pinned key file is not PEM encoded")
    return text


def key_fingerprint(pem: str) -> str:
    key = serialization.load_pem_public_key(pem.encode("utf-8"))
    der = key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return "sha256:" + hashlib.sha256(der).hexdigest()


def verify_agent_token(
    token: str,
    *,
    key_candidates: Mapping[str | None, str],
    issuer: str,
    audience: str,
    leeway: int = 60,
) -> AgentPrincipal:
    if not token:
        raise AgentTokenInvalid("empty token")
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise AgentTokenInvalid("malformed token header") from exc
    if header.get("alg") not in ALGORITHMS:
        raise AgentTokenInvalid("unsupported algorithm")
    kid = header.get("kid")
    if kid is not None:
        if kid not in key_candidates:
            raise AgentTokenInvalid("unknown key id")
        selected = [key_candidates[kid]]
    else:
        selected = list(key_candidates.values())
    last_error: Exception | None = None
    for key in selected:
        try:
            claims = jwt.decode(
                token,
                key=key,
                algorithms=list(ALGORITHMS),
                audience=audience,
                issuer=issuer,
                leeway=leeway,
                options={"require": list(REQUIRED_CLAIMS)},
            )
            return principal_from_claims(claims)
        except jwt.ExpiredSignatureError as exc:
            raise AgentTokenExpired("token expired") from exc
        except (InvalidTokenError, AgentTokenInvalid) as exc:
            last_error = exc
    raise AgentTokenInvalid(str(last_error) if last_error else "verification failed")
