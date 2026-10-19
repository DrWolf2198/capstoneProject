"""Agenda kalender akademik (diinput pihak sekolah)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_tulis = require_role(models.ROLE_ADMIN, models.ROLE_GURU)


def _kategori_valid(db: Session, nama: str) -> bool:
    return db.query(models.KategoriAgenda).filter(models.KategoriAgenda.nama == nama).first() is not None


@router.get("", response_model=list[schemas.AgendaOut])
def list_agenda(
    mulai: date | None = None,
    sampai: date | None = None,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    q = db.query(models.AgendaAkademik)
    if mulai:
        q = q.filter(models.AgendaAkademik.tanggal >= mulai)
    if sampai:
        q = q.filter(models.AgendaAkademik.tanggal <= sampai)
    return q.order_by(models.AgendaAkademik.tanggal).all()


@router.post("", response_model=schemas.AgendaOut, status_code=201)
def create_agenda(
    body: schemas.AgendaCreate,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_tulis),
):
    if not _kategori_valid(db, body.kategori):
        raise HTTPException(400, "Kategori tidak valid")
    a = models.AgendaAkademik(
        tanggal=body.tanggal,
        judul=body.judul,
        kategori=body.kategori,
        deskripsi=body.deskripsi,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{agenda_id}", response_model=schemas.AgendaOut)
def update_agenda(
    agenda_id: int,
    body: schemas.AgendaUpdate,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_tulis),
):
    a = db.get(models.AgendaAkademik, agenda_id)
    if a is None:
        raise HTTPException(404, "Agenda tidak ditemukan")
    if body.tanggal is not None:
        a.tanggal = body.tanggal
    if body.judul is not None:
        a.judul = body.judul
    if body.kategori is not None:
        if not _kategori_valid(db, body.kategori):
            raise HTTPException(400, "Kategori tidak valid")
        a.kategori = body.kategori
    if body.deskripsi is not None:
        a.deskripsi = body.deskripsi
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{agenda_id}", status_code=204)
def delete_agenda(
    agenda_id: int,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_tulis),
):
    a = db.get(models.AgendaAkademik, agenda_id)
    if a is None:
        raise HTTPException(404, "Agenda tidak ditemukan")
    db.delete(a)
    db.commit()
