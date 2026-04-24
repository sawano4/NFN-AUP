from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .enums import Role

SECRET_KEY = os.getenv("NFN_SECRET_KEY", "nfn-demo-secret")
ACCESS_LIFETIME = timedelta(hours=8)
REFRESH_LIFETIME = timedelta(days=7)
security = HTTPBearer(auto_error=False)


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("utf-8")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def create_token(payload: dict[str, Any], token_type: str, expires_in: timedelta) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    body = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_in).timestamp()),
        "token_type": token_type,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        f"{header_b64}.{body_b64}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{header_b64}.{body_b64}.{_b64url_encode(signature)}"


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    try:
        header_b64, body_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token") from exc
    expected_signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        f"{header_b64}.{body_b64}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    payload = json.loads(_b64url_decode(body_b64))
    if payload["exp"] < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    if expected_type and payload.get("token_type") != expected_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unexpected token type")
    return payload


def issue_token_pair(user_id: str, email: str, role: Role) -> dict[str, str]:
    payload = {"sub": user_id, "email": email, "role": role.value}
    return {
        "access_token": create_token(payload, "access", ACCESS_LIFETIME),
        "refresh_token": create_token(payload, "refresh", REFRESH_LIFETIME),
    }


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return decode_token(credentials.credentials, expected_type="access")


def require_roles(*allowed_roles: Role):
    allowed = {role.value for role in allowed_roles}

    def dependency(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if current_user["role"] not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return current_user

    return dependency

