"""Helper akses data per role."""
from sqlalchemy.orm import Session

from . import models


def murid_ids_for(user: models.Pengguna, db: Session) -> list[int]:
    """ID murid yang bisa diakses user.

    admin & guru -> semua murid (ALC School satu sekolah).
    ortu -> hanya anak yang terhubung lewat murid_orang_tua.
    """
    if user.role in (models.ROLE_SUPERADMIN, models.ROLE_ADMIN, models.ROLE_GURU):
        return [r[0] for r in db.query(models.Murid.id).all()]
    rows = (
        db.query(models.MuridOrangTua.murid_id)
        .filter(models.MuridOrangTua.pengguna_id == user.id)
        .all()
    )
    return [r[0] for r in rows]


def can_access_murid(user: models.Pengguna, murid_id: int, db: Session) -> bool:
    return murid_id in murid_ids_for(user, db)
