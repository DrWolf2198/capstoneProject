"""CRUD murid + link orang tua."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_admin = require_role(models.ROLE_ADMIN)


@router.get("", response_model=list[schemas.MuridOut])
def list_murid(db: Session = Depends(get_db), user: models.Pengguna = Depends(get_current_user)):
    ids = access.murid_ids_for(user, db)
    if not ids:
        return []
    return db.query(models.Murid).filter(models.Murid.id.in_(ids)).order_by(models.Murid.nama).all()


@router.post("", response_model=schemas.MuridOut, status_code=201)
def create_murid(body: schemas.MuridCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    m = models.Murid(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/{murid_id}", response_model=schemas.MuridOut)
def get_murid(murid_id: int, db: Session = Depends(get_db), user: models.Pengguna = Depends(get_current_user)):
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    m = db.get(models.Murid, murid_id)
    if m is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    return m


@router.put("/{murid_id}", response_model=schemas.MuridOut)
def update_murid(murid_id: int, body: schemas.MuridCreate, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    m = db.get(models.Murid, murid_id)
    if m is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{murid_id}", status_code=204)
def delete_murid(murid_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    m = db.get(models.Murid, murid_id)
    if m is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    db.delete(m)
    db.commit()


@router.post("/{murid_id}/ortu", status_code=201)
def link_ortu(murid_id: int, body: schemas.MuridOrangTuaLink, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    if db.get(models.Murid, murid_id) is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    if db.get(models.Pengguna, body.pengguna_id) is None:
        raise HTTPException(404, "Orang tua tidak ditemukan")
    link = models.MuridOrangTua(murid_id=murid_id, pengguna_id=body.pengguna_id, hubungan=body.hubungan)
    db.add(link)
    db.commit()
    return {"murid_id": murid_id, "pengguna_id": body.pengguna_id, "hubungan": body.hubungan}


@router.get("/{murid_id}/ortu", response_model=list[schemas.PenggunaOut])
def list_ortu(murid_id: int, db: Session = Depends(get_db), _: models.Pengguna = Depends(_admin)):
    rows = (
        db.query(models.Pengguna)
        .join(models.MuridOrangTua, models.MuridOrangTua.pengguna_id == models.Pengguna.id)
        .filter(models.MuridOrangTua.murid_id == murid_id)
        .all()
    )
    return rows
