"""Catatan berutas guru <-> orang tua per murid."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter()


@router.post("", response_model=schemas.CatatanOut, status_code=201)
def create_catatan(
    body: schemas.CatatanCreate,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    if not access.can_access_murid(user, body.murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    c = models.Catatan(murid_id=body.murid_id, pengguna_id=user.id, isi=body.isi)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.put("/{catatan_id}", response_model=schemas.CatatanOut)
def update_catatan(
    catatan_id: int,
    body: schemas.CatatanUpdate,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Edit isi catatan (hanya penulisnya)."""
    c = db.get(models.Catatan, catatan_id)
    if c is None:
        raise HTTPException(404, "Catatan tidak ditemukan")
    if c.pengguna_id != user.id:
        raise HTTPException(403, "Hanya penulis yang bisa mengedit")
    c.isi = body.isi
    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.delete("/{catatan_id}", status_code=204)
def delete_catatan(
    catatan_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Hapus catatan (hanya penulisnya)."""
    c = db.get(models.Catatan, catatan_id)
    if c is None:
        raise HTTPException(404, "Catatan tidak ditemukan")
    if c.pengguna_id != user.id:
        raise HTTPException(403, "Hanya penulis yang bisa menghapus")
    db.delete(c)
    db.commit()


@router.get("/murid/{murid_id}", response_model=list[schemas.CatatanOut])
def list_catatan(
    murid_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    rows = (
        db.query(models.Catatan)
        .filter(models.Catatan.murid_id == murid_id)
        .order_by(models.Catatan.created_at.asc(), models.Catatan.id.asc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.get("/murid/{murid_id}/unread")
def unread_count(
    murid_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Jumlah catatan dari pihak lain yang belum dibaca user."""
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    last = (
        db.query(models.CatatanBaca)
        .filter(
            models.CatatanBaca.murid_id == murid_id,
            models.CatatanBaca.pengguna_id == user.id,
        )
        .first()
    )
    last_at = last.last_read_at if last else datetime.min
    unread = (
        db.query(models.Catatan)
        .filter(
            models.Catatan.murid_id == murid_id,
            models.Catatan.pengguna_id != user.id,
            models.Catatan.created_at > last_at,
        )
        .count()
    )
    return {"unread": unread}


@router.post("/murid/{murid_id}/baca")
def mark_read(
    murid_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Tandai semua catatan murid ini sudah dibaca user."""
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    last = (
        db.query(models.CatatanBaca)
        .filter(
            models.CatatanBaca.murid_id == murid_id,
            models.CatatanBaca.pengguna_id == user.id,
        )
        .first()
    )
    now = datetime.now()
    if last:
        last.last_read_at = now
    else:
        db.add(models.CatatanBaca(murid_id=murid_id, pengguna_id=user.id, last_read_at=now))
    db.commit()
    return {"ok": True}


def _to_out(c: models.Catatan) -> schemas.CatatanOut:
    return schemas.CatatanOut(
        id=c.id,
        murid_id=c.murid_id,
        pengguna_id=c.pengguna_id,
        isi=c.isi,
        created_at=c.created_at,
        nama_pengguna=c.pengguna.nama if c.pengguna else None,
        role=c.pengguna.role if c.pengguna else None,
    )
