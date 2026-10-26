"""Dashboard analitik: distribusi capaian + ringkasan per murid."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import access, models
from ..database import get_db
from ..deps import get_current_user, require_role

router = APIRouter()

def _kategori_order(db: Session) -> list[str]:
    """Urutan kategori penilaian dari tabel referensi (by urutan)."""
    return [
        k.nama
        for k in db.query(models.KategoriPenilaian).order_by(models.KategoriPenilaian.urutan).all()
    ]


def _level(kategori: str | None, db: Session) -> int:
    order = _kategori_order(db)
    if kategori in order:
        return order.index(kategori) + 1
    return 3  # nilai tengah untuk kategori yang belum dikenal


def _latest_per_aspek(db: Session, murid_id: int) -> dict[int, models.PencatatanPerkembangan]:
    """Pencatatan terbaru per aspek untuk satu murid."""
    rows = (
        db.query(models.PencatatanPerkembangan)
        .filter(models.PencatatanPerkembangan.murid_id == murid_id)
        .order_by(
            models.PencatatanPerkembangan.tanggal.desc(),
            models.PencatatanPerkembangan.id.desc(),
        )
        .all()
    )
    latest: dict[int, models.PencatatanPerkembangan] = {}
    for p in rows:
        if p.aspek_id not in latest:
            latest[p.aspek_id] = p
    return latest


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(require_role(models.ROLE_ADMIN, models.ROLE_GURU)),
):
    """Hitungan ringkas untuk kartu statistik dashboard."""
    gurus = (
        db.query(models.Pengguna)
        .filter(models.Pengguna.role == models.ROLE_GURU)
        .order_by(models.Pengguna.nama)
        .all()
    )
    return {
        "murid": len(access.murid_ids_for(user, db)),
        "kelas": db.query(models.Kelas).count(),
        "guru": len(gurus),
        "guru_list": [{"id": g.id, "nama": g.nama, "role": g.role} for g in gurus],
    }


@router.get("/distribusi")
def distribusi(
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(require_role(models.ROLE_ADMIN, models.ROLE_GURU)),
):
    """Distribusi capaian (kategori) per aspek, dari pencatatan terbaru tiap murid."""
    aspek_list = db.query(models.AspekPerkembangan).order_by(models.AspekPerkembangan.id).all()
    murid_ids = access.murid_ids_for(user, db)

    # (aspek_id -> kategori) dari pencatatan terbaru tiap murid
    kategori_per_aspek: dict[int, list[str | None]] = {a.id: [] for a in aspek_list}
    for mid in murid_ids:
        latest = _latest_per_aspek(db, mid)
        for aspek_id, p in latest.items():
            if aspek_id in kategori_per_aspek:
                kategori_per_aspek[aspek_id].append(p.kategori)

    # kumpulkan kategori unik, urutkan sesuai LEVEL_ORDER
    kategori_set: set[str] = set()
    for kats in kategori_per_aspek.values():
        kategori_set.update(k for k in kats if k)
    order = _kategori_order(db)
    kategoris = [k for k in order if k in kategori_set]
    kategoris += sorted(k for k in kategori_set if k not in order)

    rows = []
    for a in aspek_list:
        row: dict = {"aspek": a.nama}
        counts: dict[str, int] = {k: 0 for k in kategoris}
        for kat in kategori_per_aspek[a.id]:
            if kat in counts:
                counts[kat] += 1
        row.update(counts)
        rows.append(row)

    return {"aspek": [a.nama for a in aspek_list], "kategori": kategoris, "rows": rows, "total_murid": len(murid_ids)}


@router.get("/murid/{murid_id}/ringkasan")
def ringkasan(
    murid_id: int,
    db: Session = Depends(get_db),
    user: models.Pengguna = Depends(get_current_user),
):
    """Ringkasan per murid: radar capaian per aspek + info panel."""
    if not access.can_access_murid(user, murid_id, db):
        raise HTTPException(403, "Akses ditolak")

    murid = db.get(models.Murid, murid_id)
    if murid is None:
        raise HTTPException(404, "Murid tidak ditemukan")

    latest = _latest_per_aspek(db, murid_id)
    aspek_list = db.query(models.AspekPerkembangan).order_by(models.AspekPerkembangan.id).all()

    radar = []
    for a in aspek_list:
        p = latest.get(a.id)
        radar.append({
            "aspek": a.nama,
            "kategori": p.kategori if p else None,
            "level": _level(p.kategori if p else None, db),
        })

    # tanggal penilaian terakhir
    all_pencatatan = (
        db.query(models.PencatatanPerkembangan)
        .filter(models.PencatatanPerkembangan.murid_id == murid_id)
        .all()
    )
    penilaian_terakhir = max((p.tanggal for p in all_pencatatan), default=None)

    # catatan terbaru (berutas guru <-> ortu)
    catatan_terbaru = (
        db.query(models.Catatan)
        .filter(models.Catatan.murid_id == murid_id)
        .order_by(models.Catatan.created_at.desc(), models.Catatan.id.desc())
        .first()
    )

    # orang tua terhubung
    ortu = (
        db.query(models.Pengguna)
        .join(models.MuridOrangTua, models.MuridOrangTua.pengguna_id == models.Pengguna.id)
        .filter(models.MuridOrangTua.murid_id == murid_id)
        .first()
    )

    return {
        "murid": {
            "id": murid.id,
            "nama": murid.nama,
            "tanggal_lahir": murid.tanggal_lahir.isoformat() if murid.tanggal_lahir else None,
            "jenis_kelamin": murid.jenis_kelamin,
            "kelas_id": murid.kelas_id,
        },
        "radar": radar,
        "penilaian_terakhir": penilaian_terakhir.isoformat() if penilaian_terakhir else None,
        "catatan_terbaru": catatan_terbaru.isi if catatan_terbaru else None,
        "orang_tua": ortu.nama if ortu else None,
    }
