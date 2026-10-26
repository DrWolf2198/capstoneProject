"""Dokumentasi aktivitas (foto/video/hasil karya/catatan observasi)."""
import io
import os
import uuid
from datetime import date
from pathlib import Path

from PIL import Image
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import access, models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_guru = require_role(models.ROLE_GURU)
_uploader = require_role(models.ROLE_ADMIN, models.ROLE_GURU)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/var/www/kiddytracker/uploads"))
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _compress_image(data: bytes, max_dim: int = 1600, quality: int = 85) -> bytes:
    """Kompres gambar jadi JPEG (resize + optimize) supaya hemat storage."""
    img = Image.open(io.BytesIO(data))
    img = img.convert("RGB")
    img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    user: models.Pengguna = Depends(_uploader),
):
    """Upload berkas dokumentasi, return URL publik."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            400, f"Tipe file tidak didukung. Gunakan: {', '.join(sorted(ALLOWED_EXT))}"
        )
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    data = await file.read()
    if ext in IMAGE_EXT:
        try:
            data = _compress_image(data)
            ext = ".jpg"
        except Exception:
            # kalau gagal kompres (file korup), simpan apa adanya
            pass
    nama = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / nama
    dest.write_bytes(data)
    return {"url": f"/uploads/{nama}", "nama": file.filename}


@router.post("", response_model=schemas.DokumentasiOut, status_code=201)
def create_dokumentasi(body: schemas.DokumentasiCreate, db: Session = Depends(get_db), guru: models.Pengguna = Depends(_guru)):
    if body.tipe not in models.TIPE_DOKUMENTASI:
        raise HTTPException(400, f"Tipe tidak valid. Pilih: {', '.join(models.TIPE_DOKUMENTASI)}")
    if db.get(models.Murid, body.murid_id) is None:
        raise HTTPException(404, "Murid tidak ditemukan")
    d = models.Dokumentasi(
        murid_id=body.murid_id,
        pengguna_id=guru.id,
        tipe=body.tipe,
        url=body.url,
        deskripsi=body.deskripsi,
        tanggal=body.tanggal,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.get("/murid/{murid_id}", response_model=list[schemas.DokumentasiOut])
def list_dokumentasi(murid_id: int, db: Session = Depends(get_db), user: models.Pengguna = Depends(get_current_user)):
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    return (
        db.query(models.Dokumentasi)
        .filter(models.Dokumentasi.murid_id == murid_id)
        .order_by(models.Dokumentasi.tanggal.desc())
        .all()
    )


@router.get("", response_model=list[schemas.DokumentasiOut])
def list_dokumentasi_semua(
    tanggal: date | None = None,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Dokumentasi terbaru dari semua murid yang bisa diakses user (untuk dashboard guru + weekly activities)."""
    ids = access.murid_ids_for(user, db)
    if not ids:
        return []
    q = db.query(models.Dokumentasi).filter(models.Dokumentasi.murid_id.in_(ids))
    if tanggal:
        q = q.filter(models.Dokumentasi.tanggal == tanggal)
        return q.order_by(models.Dokumentasi.id.desc()).all()
    return q.order_by(models.Dokumentasi.tanggal.desc(), models.Dokumentasi.id.desc()).limit(30).all()


@router.delete("/{dokumentasi_id}", status_code=204)
def delete_dokumentasi(
    dokumentasi_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(_uploader),
):
    """Hapus dokumentasi beserta berkasnya (admin/guru)."""
    d = db.get(models.Dokumentasi, dokumentasi_id)
    if d is None:
        raise HTTPException(404, "Dokumentasi tidak ditemukan")
    if not access.can_access_murid(user, d.murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    if d.url and d.url.startswith("/uploads/"):
        fpath = UPLOAD_DIR / os.path.basename(d.url)
        fpath.unlink(missing_ok=True)
    db.delete(d)
    db.commit()
