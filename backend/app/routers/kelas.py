"""CRUD kelas."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_admin = require_role(models.ROLE_ADMIN)


@router.get("", response_model=list[schemas.KelasOut])
def list_kelas(db: Session = Depends(get_db), _: models.Pengguna = Depends(get_current_user)):
    return db.query(models.Kelas).order_by(models.Kelas.nama).all()


@router.post("", response_model=schemas.KelasOut, status_code=201)
def create_kelas(body: schemas.KelasCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    k = models.Kelas(nama=body.nama, tingkat=body.tingkat)
    db.add(k)
    db.commit()
    db.refresh(k)
    return k


@router.put("/{kelas_id}", response_model=schemas.KelasOut)
def update_kelas(kelas_id: int, body: schemas.KelasCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    k = db.get(models.Kelas, kelas_id)
    if k is None:
        raise HTTPException(404, "Kelas tidak ditemukan")
    k.nama = body.nama
    k.tingkat = body.tingkat
    db.commit()
    db.refresh(k)
    return k


@router.delete("/{kelas_id}", status_code=204)
def delete_kelas(kelas_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    k = db.get(models.Kelas, kelas_id)
    if k is None:
        raise HTTPException(404, "Kelas tidak ditemukan")
    db.delete(k)
    db.commit()
