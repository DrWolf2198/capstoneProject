"""Pencatatan perkembangan (guru mencatat)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_guru = require_role(models.ROLE_GURU)


@router.post("", response_model=schemas.PencatatanOut, status_code=201)
def create_pencatatan(body: schemas.PencatatanCreate, db: Session = Depends(get_db), guru: models.Pengguna = Depends(_guru)):
    if db.get(models.Murid, body.murid_id) is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    if db.get(models.AspekPerkembangan, body.aspek_id) is None:
        raise HTTPException(404, "Aspek tidak ditemukan")
    p = models.PencatatanPerkembangan(
        murid_id=body.murid_id,
        aspek_id=body.aspek_id,
        guru_id=guru.id,
        tanggal=body.tanggal,
        kategori=body.kategori,
        deskripsi=body.deskripsi,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.post("/bulk", status_code=201)
def create_pencatatan_bulk(
    body: schemas.PencatatanBulkCreate,
    db: Session = Depends(get_db),
    guru: models.Pengguna = Depends(_guru),
):
    """Simpan penilaian banyak aspek sekaligus (upsert per aspek+hari)."""
    if db.get(models.Murid, body.murid_id) is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    created = 0
    updated = 0
    for item in body.items:
        if not item.kategori:
            continue
        if db.get(models.AspekPerkembangan, item.aspek_id) is None:
            raise HTTPException(404, f"Aspek {item.aspek_id} tidak ditemukan")
        existing = (
            db.query(models.PencatatanPerkembangan)
            .filter(
                models.PencatatanPerkembangan.murid_id == body.murid_id,
                models.PencatatanPerkembangan.aspek_id == item.aspek_id,
                models.PencatatanPerkembangan.tanggal == body.tanggal,
            )
            .first()
        )
        if existing:
            existing.kategori = item.kategori
            existing.deskripsi = item.deskripsi
            existing.guru_id = guru.id
            updated += 1
        else:
            db.add(
                models.PencatatanPerkembangan(
                    murid_id=body.murid_id,
                    aspek_id=item.aspek_id,
                    guru_id=guru.id,
                    tanggal=body.tanggal,
                    kategori=item.kategori,
                    deskripsi=item.deskripsi,
                )
            )
            created += 1
    db.commit()
    return {"created": created, "updated": updated}


@router.get("/murid/{murid_id}", response_model=list[schemas.PencatatanOut])
def list_pencatatan(murid_id: int, db: Session = Depends(get_db), user: models.Pengguna = Depends(get_current_user)):
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    rows = (
        db.query(models.PencatatanPerkembangan)
        .filter(models.PencatatanPerkembangan.murid_id == murid_id)
        .order_by(models.PencatatanPerkembangan.tanggal.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


def _to_out(p: models.PencatatanPerkembangan) -> schemas.PencatatanOut:
    return schemas.PencatatanOut(
        id=p.id,
        murid_id=p.murid_id,
        aspek_id=p.aspek_id,
        guru_id=p.guru_id,
        tanggal=p.tanggal,
        kategori=p.kategori,
        deskripsi=p.deskripsi,
        aspek_nama=p.aspek.nama if p.aspek else None,
        guru_nama=p.guru.nama if p.guru else None,
    )
