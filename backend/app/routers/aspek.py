"""CRUD aspek perkembangan (configurable — sesuai instrumen ALC School)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_admin = require_role(models.ROLE_ADMIN)


@router.get("", response_model=list[schemas.AspekOut])
def list_aspek(db: Session = Depends(get_db), _: models.Pengguna = Depends(get_current_user)):
    return db.query(models.AspekPerkembangan).order_by(models.AspekPerkembangan.id).all()


@router.post("", response_model=schemas.AspekOut, status_code=201)
def create_aspek(body: schemas.AspekCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    a = models.AspekPerkembangan(nama=body.nama, deskripsi=body.deskripsi)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{aspek_id}", response_model=schemas.AspekOut)
def update_aspek(aspek_id: int, body: schemas.AspekCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    a = db.get(models.AspekPerkembangan, aspek_id)
    if a is None:
        raise HTTPException(404, "Aspek tidak ditemukan")
    a.nama = body.nama
    a.deskripsi = body.deskripsi
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{aspek_id}", status_code=204)
def delete_aspek(aspek_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    a = db.get(models.AspekPerkembangan, aspek_id)
    if a is None:
        raise HTTPException(404, "Aspek tidak ditemukan")
    db.delete(a)
    db.commit()
