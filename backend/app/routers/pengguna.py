"""CRUD pengguna (admin only)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..deps import require_role

router = APIRouter()
_admin = require_role(models.ROLE_ADMIN)


@router.get("", response_model=list[schemas.PenggunaOut])
def list_pengguna(db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    return db.query(models.Pengguna).order_by(models.Pengguna.nama).all()


@router.post("", response_model=schemas.PenggunaOut, status_code=201)
def create_pengguna(body: schemas.PenggunaCreate, db: Session = Depends(get_db), user: models.Pengguna = Depends(_admin)):
    if body.role not in (models.ROLE_ADMIN, models.ROLE_GURU, models.ROLE_ORTU):
        raise HTTPException(400, "Role tidak valid")
    if body.role == models.ROLE_ADMIN and user.role != models.ROLE_SUPERADMIN:
        raise HTTPException(403, "Hanya super admin yang dapat membuat akun admin")
    if db.query(models.Pengguna).filter(models.Pengguna.email == body.email).first():
        raise HTTPException(400, "Email sudah terdaftar")
    p = models.Pengguna(
        role=body.role,
        nama=body.nama,
        email=body.email,
        password_hash=security.hash_password(body.password),
        no_hp=body.no_hp,
        foto=body.foto,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{pengguna_id}", response_model=schemas.PenggunaOut)
def get_pengguna(pengguna_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    p = db.get(models.Pengguna, pengguna_id)
    if p is None:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    return p


@router.put("/{pengguna_id}", response_model=schemas.PenggunaOut)
def update_pengguna(pengguna_id: int, body: schemas.PenggunaUpdate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    p = db.get(models.Pengguna, pengguna_id)
    if p is None:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    if body.nama is not None:
        p.nama = body.nama
    if body.no_hp is not None:
        p.no_hp = body.no_hp
    if body.foto is not None:
        p.foto = body.foto
    if body.password:
        p.password_hash = security.hash_password(body.password)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pengguna_id}", status_code=204)
def delete_pengguna(pengguna_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    p = db.get(models.Pengguna, pengguna_id)
    if p is None:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    db.delete(p)
    db.commit()
