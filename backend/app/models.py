"""Model SQLAlchemy — 7 tabel (scope 7 fitur inti)."""
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base

# Role yang valid
ROLE_SUPERADMIN = "superadmin"
ROLE_ADMIN = "admin"
ROLE_GURU = "guru"
ROLE_ORTU = "ortu"

# Tipe dokumentasi yang valid
TIPE_DOKUMENTASI = ("foto", "video", "hasil_karya", "catatan_observasi")

# Status absensi yang valid
STATUS_ABSENSI = ("hadir", "izin", "sakit", "alfa")


class Pengguna(Base):
    __tablename__ = "pengguna"

    id = Column(Integer, primary_key=True)
    role = Column(String(20), nullable=False)
    nama = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    no_hp = Column(String(20))
    foto = Column(Text)

    # relasi: murid yang terhubung sebagai orang tua
    anak_relasi = relationship("MuridOrangTua", back_populates="orang_tua")


class Kelas(Base):
    __tablename__ = "kelas"

    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    tingkat = Column(String(50))

    murid_list = relationship("Murid", back_populates="kelas")


class Murid(Base):
    __tablename__ = "murid"

    id = Column(Integer, primary_key=True)
    kelas_id = Column(Integer, ForeignKey("kelas.id", ondelete="SET NULL"))
    nama = Column(String(255), nullable=False, index=True)
    tempat_lahir = Column(String(255))
    tanggal_lahir = Column(Date)
    jenis_kelamin = Column(String(1))  # L | P
    foto = Column(Text)

    kelas = relationship("Kelas", back_populates="murid_list")
    ortu_relasi = relationship("MuridOrangTua", back_populates="murid", passive_deletes=True)


class MuridOrangTua(Base):
    __tablename__ = "murid_orang_tua"

    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), primary_key=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id", ondelete="CASCADE"), primary_key=True)
    hubungan = Column(String(20))  # ayah | ibu | wali

    murid = relationship("Murid", back_populates="ortu_relasi")
    orang_tua = relationship("Pengguna", back_populates="anak_relasi")


class AspekPerkembangan(Base):
    __tablename__ = "aspek_perkembangan"

    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    deskripsi = Column(Text)


class PencatatanPerkembangan(Base):
    __tablename__ = "pencatatan_perkembangan"

    id = Column(Integer, primary_key=True)
    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), nullable=False, index=True)
    aspek_id = Column(Integer, ForeignKey("aspek_perkembangan.id"), nullable=False)
    guru_id = Column(Integer, ForeignKey("pengguna.id"), nullable=False)
    tanggal = Column(Date, nullable=False, index=True)
    kategori = Column(String(50))  # sesuai instrumen ALC (mis. BB/MB/BSH/BSB/SB)
    deskripsi = Column(Text)

    murid = relationship("Murid")
    aspek = relationship("AspekPerkembangan")
    guru = relationship("Pengguna")


class Dokumentasi(Base):
    __tablename__ = "dokumentasi"

    id = Column(Integer, primary_key=True)
    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), nullable=False, index=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id"), nullable=False)
    tipe = Column(String(20), nullable=False)  # foto | video | hasil_karya | catatan_observasi
    url = Column(Text)  # NULL untuk catatan_observasi
    deskripsi = Column(Text)  # keterangan / isi teks catatan observasi
    tanggal = Column(Date, nullable=False, index=True)

    murid = relationship("Murid")
    pengguna = relationship("Pengguna")


class Catatan(Base):
    """Catatan berutas guru <-> orang tua per murid."""

    __tablename__ = "catatan"

    id = Column(Integer, primary_key=True)
    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), nullable=False, index=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id"), nullable=False)
    isi = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    murid = relationship("Murid")
    pengguna = relationship("Pengguna")


class CatatanBaca(Base):
    """Jejak baca catatan per (murid, pengguna) untuk hitung belum-dibaca."""

    __tablename__ = "catatan_baca"

    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), primary_key=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id", ondelete="CASCADE"), primary_key=True)
    last_read_at = Column(DateTime, default=datetime.now)

    murid = relationship("Murid")
    pengguna = relationship("Pengguna")


class SesiKelas(Base):
    """Sesi kelas yang dibuat guru (mendukung pencatatan kegiatan harian)."""

    __tablename__ = "sesi_kelas"

    id = Column(Integer, primary_key=True)
    kelas_id = Column(Integer, ForeignKey("kelas.id", ondelete="CASCADE"), nullable=False, index=True)
    guru_id = Column(Integer, ForeignKey("pengguna.id"), nullable=False)
    tanggal = Column(Date, nullable=False, index=True)
    tema = Column(String(255))
    deskripsi = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    kelas = relationship("Kelas")
    guru = relationship("Pengguna")
    absensi_list = relationship(
        "Absensi", back_populates="sesi", cascade="all, delete-orphan", passive_deletes=True
    )


class Absensi(Base):
    """Kehadiran murid pada satu sesi kelas."""

    __tablename__ = "absensi"

    id = Column(Integer, primary_key=True)
    sesi_id = Column(Integer, ForeignKey("sesi_kelas.id", ondelete="CASCADE"), nullable=False, index=True)
    murid_id = Column(Integer, ForeignKey("murid.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(10), nullable=False)  # hadir | izin | sakit | alfa
    keterangan = Column(String(255))  # alasan izin/sakit

    __table_args__ = (UniqueConstraint("sesi_id", "murid_id", name="uq_absensi_sesi_murid"),)

    sesi = relationship("SesiKelas", back_populates="absensi_list")
    murid = relationship("Murid")


class KategoriPenilaian(Base):
    """Kategori/level penilaian (tabel referensi, bisa diatur admin)."""

    __tablename__ = "kategori_penilaian"

    id = Column(Integer, primary_key=True)
    nama = Column(String(20), unique=True, nullable=False)
    urutan = Column(Integer, nullable=False, default=0)
    warna = Column(String(20), default="#94a3b8")


class KategoriAgenda(Base):
    """Kategori agenda kalender akademik (tabel referensi, diatur admin/super admin)."""

    __tablename__ = "kategori_agenda"

    id = Column(Integer, primary_key=True)
    nama = Column(String(50), unique=True, nullable=False)
    urutan = Column(Integer, nullable=False, default=0)
    warna = Column(String(20), default="#3b82f6")


class AgendaAkademik(Base):
    """Agenda kalender akademik (diinput pihak sekolah)."""

    __tablename__ = "agenda_akademik"

    id = Column(Integer, primary_key=True)
    tanggal = Column(Date, nullable=False, index=True)
    judul = Column(String(255), nullable=False)
    kategori = Column(String(30), nullable=False)
    deskripsi = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class AuditLog(Base):
    """Jejak aksi tulis (siapa, kapan, apa) — NFR audit sederhana."""

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id", ondelete="SET NULL"))
    metode = Column(String(10))
    path = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
