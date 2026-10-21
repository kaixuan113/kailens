import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

TOKEN_SCHEME = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str = "") -> str:
    current_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), current_salt.encode("utf-8"), 210000
    )
    return "pbkdf2_sha256$210000${}${}".format(
        current_salt, base64.urlsafe_b64encode(digest).decode("ascii")
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, _, salt, _ = encoded.split("$", 3)
        return hmac.compare_digest(hash_password(password, salt), encoded)
    except ValueError:
        return False


def _secret() -> bytes:
    value = os.environ.get("APP_SECRET", "")
    if not value:
        if os.environ.get("ENVIRONMENT") == "production":
            raise RuntimeError("APP_SECRET is required in production")
        value = "kailens-local-development-secret"
    return value.encode("utf-8")


def create_token(hours: int = 12) -> str:
    payload = {"role": "admin", "exp": int(time.time()) + hours * 3600}
    body = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    signature = hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()
    return "{}.{}".format(body, signature)


def decode_token(token: str) -> Dict[str, object]:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        padding = "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(body + padding).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="登录已失效，请重新登录")


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(TOKEN_SCHEME),
) -> Dict[str, object]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="请先登录")
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="无权访问")
    return payload
