"""Auth: login email + password -> JWT."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.Pengguna)
        .filter(
            (models.Pengguna.email == body.email)
            | (models.Pengguna.no_hp == body.email)
        )
        .first()
    )
    if user is None or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email/nomor HP atau password salah")
    token = security.create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.PenggunaOut)
def me(user: models.Pengguna = Depends(get_current_user)):
    return user


@router.put("/me", response_model=schemas.PenggunaOut)
def update_me(
    body: schemas.PenggunaUpdate,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    if body.nama is not None:
        user.nama = body.nama
    if body.no_hp is not None:
        user.no_hp = body.no_hp
    if body.foto is not None:
        user.foto = body.foto
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(
    body: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    if not security.verify_password(body.password_lama, user.password_hash):
        raise HTTPException(400, "Password lama salah")
    user.password_hash = security.hash_password(body.password_baru)
    db.commit()
    return {"message": "Password berhasil diubah"}
