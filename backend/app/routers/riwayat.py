"""Riwayat = gabungan pencatatan + dokumentasi, terurut per tanggal."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models
from ..database import get_db
from ..deps import get_current_user

router = APIRouter()


@router.get("/murid/{murid_id}")
def get_riwayat(murid_id: int, db: Session = Depends(get_db), user: models.Pengguna = Depends(get_current_user)):
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")

    pencatatan = (
        db.query(models.PencatatanPerkembangan)
        .filter(models.PencatatanPerkembangan.murid_id == murid_id)
        .all()
    )
    dokumentasi = (
        db.query(models.Dokumentasi)
        .filter(models.Dokumentasi.murid_id == murid_id)
        .all()
    )

    items = []
    for p in pencatatan:
        items.append({
            "jenis": "pencatatan",
            "tanggal": p.tanggal.isoformat(),
            "aspek": p.aspek.nama if p.aspek else None,
            "kategori": p.kategori,
            "deskripsi": p.deskripsi,
            "oleh": p.guru.nama if p.guru else None,
        })
    for d in dokumentasi:
        items.append({
            "jenis": "dokumentasi",
            "tanggal": d.tanggal.isoformat(),
            "tipe": d.tipe,
            "url": d.url,
            "deskripsi": d.deskripsi,
            "oleh": d.pengguna.nama if d.pengguna else None,
        })

    items.sort(key=lambda x: x["tanggal"], reverse=True)
    return {"murid_id": murid_id, "items": items}
