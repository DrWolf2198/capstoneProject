"""Dependency FastAPI: auth + role guard."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models, security
from .database import get_db

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Pengguna:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tidak ada")
    try:
        payload = security.decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tidak valid")
    user = db.get(models.Pengguna, int(payload.get("sub")))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Pengguna tidak ditemukan")
    return user


def require_role(*roles: str):
    """Factory: batasi endpoint ke role tertentu. Super admin lolos semua."""
    def _dep(user: models.Pengguna = Depends(get_current_user)) -> models.Pengguna:
        if user.role != models.ROLE_SUPERADMIN and user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Akses ditolak")
        return user
    return _dep
