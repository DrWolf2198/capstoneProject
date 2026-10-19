"""Keamanan: hash password (bcrypt langsung) + JWT (PyJWT).

Catatan: jangan pakai passlib — rusak dengan bcrypt 4.x (ValueError 72 bytes).
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(subject: int, role: str) -> str:
    payload = {
        "sub": str(subject),  # PyJWT wajib string
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
