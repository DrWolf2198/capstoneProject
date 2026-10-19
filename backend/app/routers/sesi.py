"""Sesi kelas + absensi kehadiran murid."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models, schemas
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()
_guru = require_role(models.ROLE_GURU)

STATUS_ABSENSI = models.STATUS_ABSENSI


def _to_out(s: models.SesiKelas) -> schemas.SesiKelasOut:
    return schemas.SesiKelasOut(
        id=s.id,
        kelas_id=s.kelas_id,
        guru_id=s.guru_id,
        tanggal=s.tanggal,
        tema=s.tema,
        deskripsi=s.deskripsi,
        kelas_nama=s.kelas.nama if s.kelas else None,
    )


@router.post("/harian", response_model=schemas.SesiKelasOut)
def get_or_create_sesi_harian(
    kelas_id: int,
    tanggal: date,
    db: Session = Depends(get_db),
    guru: models.Pengguna = Depends(_guru),
):
    """Ambil (atau buat) sesi harian untuk (kelas, tanggal) — basis absensi per hari."""
    s = (
        db.query(models.SesiKelas)
        .filter(models.SesiKelas.kelas_id == kelas_id, models.SesiKelas.tanggal == tanggal)
        .order_by(models.SesiKelas.id.desc())
        .first()
    )
    if s is None:
        s = models.SesiKelas(kelas_id=kelas_id, guru_id=guru.id, tanggal=tanggal)
        db.add(s)
        db.commit()
        db.refresh(s)
    return _to_out(s)


@router.post("", response_model=schemas.SesiKelasOut, status_code=201)
def create_sesi(
    body: schemas.SesiKelasCreate,
    db: Session = Depends(get_db),
    guru: models.Pengguna = Depends(_guru),
):
    if db.get(models.Kelas, body.kelas_id) is None:
        raise HTTPException(404, "Kelas tidak ditemukan")
    s = models.SesiKelas(
        kelas_id=body.kelas_id,
        guru_id=guru.id,
        tanggal=body.tanggal,
        tema=body.tema,
        deskripsi=body.deskripsi,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_out(s)


@router.get("", response_model=list[schemas.SesiKelasOut])
def list_sesi(
    kelas_id: int | None = None,
    tanggal: date | None = None,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    q = db.query(models.SesiKelas)
    if user.role == models.ROLE_ORTU:
        ids = access.murid_ids_for(user, db)
        if not ids:
            return []
        kelas_ids = [
            r[0]
            for r in db.query(models.Murid.kelas_id)
            .filter(models.Murid.id.in_(ids), models.Murid.kelas_id.isnot(None))
            .distinct()
            .all()
        ]
        if not kelas_ids:
            return []
        q = q.filter(models.SesiKelas.kelas_id.in_(kelas_ids))
    if kelas_id:
        q = q.filter(models.SesiKelas.kelas_id == kelas_id)
    if tanggal:
        q = q.filter(models.SesiKelas.tanggal == tanggal)
    return [_to_out(s) for s in q.order_by(models.SesiKelas.tanggal.desc()).all()]


@router.get("/{sesi_id}", response_model=schemas.SesiKelasOut)
def get_sesi(
    sesi_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    s = db.get(models.SesiKelas, sesi_id)
    if s is None:
        raise HTTPException(404, "Sesi tidak ditemukan")
    return _to_out(s)


@router.put("/{sesi_id}", response_model=schemas.SesiKelasOut)
def update_sesi(
    sesi_id: int,
    body: schemas.SesiKelasUpdate,
    db: Session = Depends(get_db),
    guru: models.Pengguna = Depends(_guru),
):
    """Update tema/deskripsi aktivitas harian (weekly activities)."""
    s = db.get(models.SesiKelas, sesi_id)
    if s is None:
        raise HTTPException(404, "Sesi tidak ditemukan")
    if body.tema is not None:
        s.tema = body.tema
    if body.deskripsi is not None:
        s.deskripsi = body.deskripsi
    db.commit()
    db.refresh(s)
    return _to_out(s)


@router.post("/{sesi_id}/absensi", status_code=201)
def record_absensi(
    sesi_id: int,
    body: schemas.AbsensiBulkCreate,
    db: Session = Depends(get_db),
    guru: models.Pengguna = Depends(_guru),
):
    s = db.get(models.SesiKelas, sesi_id)
    if s is None:
        raise HTTPException(404, "Sesi tidak ditemukan")
    for item in body.items:
        if item.status not in STATUS_ABSENSI:
            raise HTTPException(400, f"Status tidak valid: {item.status}")
        existing = (
            db.query(models.Absensi)
            .filter(
                models.Absensi.sesi_id == sesi_id,
                models.Absensi.murid_id == item.murid_id,
            )
            .first()
        )
        if existing:
            existing.status = item.status
            existing.keterangan = item.keterangan
        else:
            db.add(models.Absensi(sesi_id=sesi_id, murid_id=item.murid_id, status=item.status, keterangan=item.keterangan))
    db.commit()
    return {"sesi_id": sesi_id, "tercatat": len(body.items)}


@router.get("/{sesi_id}/absensi", response_model=list[schemas.AbsensiOut])
def list_absensi(
    sesi_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    if db.get(models.SesiKelas, sesi_id) is None:
        raise HTTPException(404, "Sesi tidak ditemukan")
    rows = db.query(models.Absensi).filter(models.Absensi.sesi_id == sesi_id).all()
    return [
        schemas.AbsensiOut(
            id=r.id,
            sesi_id=r.sesi_id,
            murid_id=r.murid_id,
            status=r.status,
            keterangan=r.keterangan,
            murid_nama=r.murid.nama if r.murid else None,
        )
        for r in rows
    ]


@router.delete("/{sesi_id}", status_code=204)
def delete_sesi(
    sesi_id: int,
    db: Session = Depends(get_db),
    _: models.Pengguna = Depends(_guru),
):
    s = db.get(models.SesiKelas, sesi_id)
    if s is None:
        raise HTTPException(404, "Sesi tidak ditemukan")
    db.delete(s)
    db.commit()


@router.get("/absensi/murid/{murid_id}/rekap")
def rekap_absensi_murid(
    murid_id: int,
    bulan: str | None = None,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Rekap kehadiran satu murid (opsional filter bulan YYYY-MM)."""
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")
    q = (
        db.query(models.Absensi)
        .join(models.SesiKelas, models.Absensi.sesi_id == models.SesiKelas.id)
        .filter(models.Absensi.murid_id == murid_id)
    )
    if bulan:
        try:
            y, m = bulan.split("-")
            y, m = int(y), int(m)
            start = date(y, m, 1)
            end = date(y, m + 1, 1) if m < 12 else date(y + 1, 1, 1)
        except (ValueError, IndexError):
            raise HTTPException(400, "Format bulan tidak valid (YYYY-MM)")
        q = q.filter(models.SesiKelas.tanggal >= start, models.SesiKelas.tanggal < end)
    rows = q.all()
    hadir = sum(1 for r in rows if r.status == "hadir")
    izin = sum(1 for r in rows if r.status == "izin")
    sakit = sum(1 for r in rows if r.status == "sakit")
    alfa = sum(1 for r in rows if r.status == "alfa")
    total = len(rows)
    persentase = round(hadir / total * 100, 1) if total else None
    return {
        "hadir": hadir,
        "izin": izin,
        "sakit": sakit,
        "alfa": alfa,
        "total": total,
        "persentase": persentase,
    }
