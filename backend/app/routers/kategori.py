"""Kategori/level penilaian (tabel referensi, dikelola admin)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_admin = require_role(models.ROLE_ADMIN)


@router.get("", response_model=list[schemas.KategoriOut])
def list_kategori(
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    return db.query(models.KategoriPenilaian).order_by(models.KategoriPenilaian.urutan).all()


@router.post("", response_model=schemas.KategoriOut, status_code=201)
def create_kategori(
    body: schemas.KategoriCreate,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_admin),
):
    if db.query(models.KategoriPenilaian).filter(models.KategoriPenilaian.nama == body.nama).first():
        raise HTTPException(400, "Kategori sudah ada")
    k = models.KategoriPenilaian(nama=body.nama, urutan=body.urutan, warna=body.warna)
    db.add(k)
    db.commit()
    db.refresh(k)
    return k


@router.put("/{kategori_id}", response_model=schemas.KategoriOut)
def update_kategori(
    kategori_id: int,
    body: schemas.KategoriUpdate,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_admin),
):
    k = db.get(models.KategoriPenilaian, kategori_id)
    if k is None:
        raise HTTPException(404, "Kategori tidak ditemukan")
    if body.nama is not None:
        k.nama = body.nama
    if body.urutan is not None:
        k.urutan = body.urutan
    if body.warna is not None:
        k.warna = body.warna
    db.commit()
    db.refresh(k)
    return k


@router.delete("/{kategori_id}", status_code=204)
def delete_kategori(
    kategori_id: int,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_admin),
):
    k = db.get(models.KategoriPenilaian, kategori_id)
    if k is None:
        raise HTTPException(404, "Kategori tidak ditemukan")
    db.delete(k)
    db.commit()
