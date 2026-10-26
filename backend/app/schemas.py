"""Skema Pydantic (request + response)."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: str  # bisa email atau nomor HP
    password: str


class ChangePasswordRequest(BaseModel):
    password_lama: str
    password_baru: str


class PenggunaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    nama: str
    email: str
    no_hp: Optional[str] = None
    foto: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PenggunaOut


# ---------- Pengguna ----------
class PenggunaCreate(BaseModel):
    role: str
    nama: str
    email: Optional[str] = None  # opsional; ortu cukup nomor HP
    password: str
    no_hp: Optional[str] = None
    foto: Optional[str] = None


class PenggunaUpdate(BaseModel):
    nama: Optional[str] = None
    email: Optional[str] = None
    no_hp: Optional[str] = None
    foto: Optional[str] = None
    password: Optional[str] = None


# ---------- Kelas ----------
class KelasCreate(BaseModel):
    nama: str
    tingkat: Optional[str] = None


class KelasOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    tingkat: Optional[str] = None


# ---------- Murid ----------
class MuridCreate(BaseModel):
    kelas_id: Optional[int] = None
    nama: str
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[date] = None
    jenis_kelamin: Optional[str] = None
    foto: Optional[str] = None


class MuridOrtuInfo(BaseModel):
    nama: str
    no_hp: Optional[str] = None
    hubungan: Optional[str] = None


class MuridOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kelas_id: Optional[int] = None
    nama: str
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[date] = None
    jenis_kelamin: Optional[str] = None
    foto: Optional[str] = None
    orang_tua: list[MuridOrtuInfo] = []


class MuridOrangTuaLink(BaseModel):
    pengguna_id: int
    hubungan: Optional[str] = None


# ---------- Aspek ----------
class AspekCreate(BaseModel):
    nama: str
    deskripsi: Optional[str] = None


class AspekOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    deskripsi: Optional[str] = None


# ---------- Pencatatan ----------
class PencatatanCreate(BaseModel):
    murid_id: int
    aspek_id: int
    tanggal: date
    kategori: Optional[str] = None
    deskripsi: Optional[str] = None


class PencatatanBulkItem(BaseModel):
    aspek_id: int
    kategori: Optional[str] = None
    deskripsi: Optional[str] = None


class PencatatanBulkCreate(BaseModel):
    murid_id: int
    tanggal: date
    items: list[PencatatanBulkItem]


class PencatatanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    murid_id: int
    aspek_id: int
    guru_id: int
    tanggal: date
    kategori: Optional[str] = None
    deskripsi: Optional[str] = None
    aspek_nama: Optional[str] = None
    guru_nama: Optional[str] = None


# ---------- Dokumentasi ----------
class DokumentasiCreate(BaseModel):
    murid_id: int
    tipe: str
    url: Optional[str] = None
    deskripsi: Optional[str] = None
    tanggal: date


class DokumentasiOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    murid_id: int
    pengguna_id: int
    tipe: str
    url: Optional[str] = None
    deskripsi: Optional[str] = None
    tanggal: date


# ---------- Catatan (guru <-> ortu) ----------
class CatatanCreate(BaseModel):
    murid_id: int
    isi: str


class CatatanUpdate(BaseModel):
    isi: str


class CatatanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    murid_id: int
    pengguna_id: int
    isi: str
    created_at: datetime
    nama_pengguna: Optional[str] = None
    role: Optional[str] = None


# ---------- Sesi Kelas & Absensi ----------
class SesiKelasCreate(BaseModel):
    kelas_id: int
    tanggal: date
    tema: Optional[str] = None
    deskripsi: Optional[str] = None


class SesiKelasUpdate(BaseModel):
    tema: Optional[str] = None
    deskripsi: Optional[str] = None


class SesiKelasOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kelas_id: int
    guru_id: int
    tanggal: date
    tema: Optional[str] = None
    deskripsi: Optional[str] = None
    kelas_nama: Optional[str] = None


class AbsensiItem(BaseModel):
    murid_id: int
    status: str
    keterangan: Optional[str] = None


class AbsensiBulkCreate(BaseModel):
    items: list[AbsensiItem]


class AbsensiOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sesi_id: int
    murid_id: int
    status: str
    keterangan: Optional[str] = None
    murid_nama: Optional[str] = None


# ---------- Kategori Penilaian (referensi) ----------
class KategoriCreate(BaseModel):
    nama: str
    urutan: Optional[int] = 0
    warna: Optional[str] = "#94a3b8"


class KategoriUpdate(BaseModel):
    nama: Optional[str] = None
    urutan: Optional[int] = None
    warna: Optional[str] = None


class KategoriOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    urutan: int
    warna: str


# ---------- Agenda Akademik ----------
class AgendaCreate(BaseModel):
    tanggal: date
    judul: str
    kategori: str
    deskripsi: Optional[str] = None


class AgendaUpdate(BaseModel):
    tanggal: Optional[date] = None
    judul: Optional[str] = None
    kategori: Optional[str] = None
    deskripsi: Optional[str] = None


class AgendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tanggal: date
    judul: str
    kategori: str
    deskripsi: Optional[str] = None


# ---------- Kategori Agenda (referensi) ----------
class KategoriAgendaCreate(BaseModel):
    nama: str
    urutan: Optional[int] = 0
    warna: Optional[str] = "#3b82f6"


class KategoriAgendaUpdate(BaseModel):
    nama: Optional[str] = None
    urutan: Optional[int] = None
    warna: Optional[str] = None


class KategoriAgendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    urutan: int
    warna: str
