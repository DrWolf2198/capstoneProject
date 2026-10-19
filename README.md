# KiddyTracker

**Pengembangan Aplikasi Pencatatan Digital Perkembangan Anak TK di ALC School**

Aplikasi web untuk mencatat perkembangan, mendokumentasikan aktivitas,
mencatat kehadiran, dan menyampaikan informasi perkembangan anak secara
terstruktur kepada orang tua.

## Fitur

1. Pengelolaan data anak (murid, kelas, aspek perkembangan)
2. Pencatatan perkembangan per aspek (per minggu & hari)
3. Kategori/level penilaian **configurable** (tabel referensi, diatur admin)
4. Dokumentasi aktivitas (foto, video, hasil karya, catatan observasi) + **kompresi foto otomatis**
5. Sesi kelas + absensi kehadiran murid
6. Riwayat perkembangan & aktivitas
7. Dashboard analitik (distribusi capaian + radar per murid)
8. Laporan perkembangan per periode (rekap penilaian + absensi + dokumentasi + catatan, bisa cetak)
9. Akses informasi orang tua (catatan berutas guru ↔ orang tua)
10. Hak akses & keamanan (JWT + role-based)
11. Kalender Akademik (agenda kegiatan & hari libur, diinput pihak sekolah)

## Role

| Role | Akses |
|------|-------|
| **Super Admin** | Pemeliharaan sistem + membuat akun admin |
| **Admin Sekolah** | Kelola guru, murid, ortu, kelas, aspek, kategori penilaian |
| **Guru** | Catat perkembangan, buat sesi & absensi, unggah dokumentasi, lihat laporan |
| **Orang Tua/Wali** | Lihat perkembangan, kehadiran, aktivitas, dan catatan anaknya |

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | FastAPI (Python 3.11) + SQLAlchemy + JWT |
| Database | PostgreSQL (driver psycopg2) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS v4 |
| Routing | react-router-dom |
| Icons | RemixIcon |
| Image | Pillow (kompresi foto) |

## Struktur

```
kiddytracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # Entry FastAPI
│   │   ├── config.py        # Settings (.env)
│   │   ├── database.py      # Engine + session SQLAlchemy
│   │   ├── models.py        # 14 tabel
│   │   ├── schemas.py       # Pydantic
│   │   ├── security.py      # bcrypt + JWT
│   │   ├── deps.py          # auth + role guard
│   │   ├── access.py        # scoping akses per role
│   │   ├── seed.py          # Data awal (akun demo + aspek + kategori)
│   │   └── routers/         # auth, pengguna, kelas, murid, aspek, kategori,
│   │                        #   pencatatan, dokumentasi, sesi, laporan, riwayat,
│   │                        #   dashboard, catatan
│   ├── requirements.txt
│   ├── smoke_test.py        # 30 test endpoint
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/      # Layout, ui, MediaLightbox, AnakSelector
    │   ├── lib/             # api client, auth storage
    │   ├── pages/           # Login, Dashboard, DataMaster, Pencatatan, Sesi,
    │   │                    #   Dokumentasi, Laporan, Catatan, Riwayat
    │   └── types.ts
    └── vite.config.ts       # proxy /api -> localhost:8000
```

## Menjalankan Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# setup PostgreSQL (sekali)
sudo -u postgres psql -c "CREATE USER kiddytracker WITH PASSWORD 'ganti_password';"
sudo -u postgres psql -c "CREATE DATABASE kiddytracker OWNER kiddytracker;"

# .env
# DATABASE_URL=postgresql+psycopg2://kiddytracker:ganti_password@127.0.0.1:5432/kiddytracker

python -m app.seed          # buat tabel + akun demo
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173  (otomatis proxy /api ke backend :8000)
```

## Akun Demo

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@kiddytracker.id | superadmin123 |
| Admin | admin@kiddytracker.id | admin123 |
| Guru | guru@kiddytracker.id | guru123 |
| Ortu | ortu@kiddytracker.id | ortu123 |

## API Endpoint (prefix `/api`)

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/login` | publik |
| GET/POST | `/aspek` | semua (tulis: admin) |
| GET/POST/PUT/DELETE | `/kategori` | semua (tulis: admin) |
| GET/POST | `/kelas` | semua (tulis: admin) |
| GET/POST | `/murid` | sesuai role (tulis: admin) |
| POST | `/murid/{id}/ortu` | admin |
| GET/POST | `/pengguna` | admin/super admin |
| POST | `/pencatatan/bulk` | guru |
| GET | `/pencatatan/murid/{id}` | guru/ortu |
| POST | `/dokumentasi/upload` | guru |
| GET/POST | `/dokumentasi` | guru |
| GET | `/dokumentasi/murid/{id}` | guru/ortu |
| POST/GET | `/sesi` | guru |
| POST | `/sesi/{id}/absensi` | guru |
| GET | `/sesi/absensi/murid/{id}/rekap` | guru/ortu |
| GET | `/laporan/murid/{id}` | guru/ortu |
| GET | `/riwayat/murid/{id}` | guru/ortu |
| GET/POST | `/catatan` | guru/ortu |
| GET | `/catatan/murid/{id}` | guru/ortu |
| GET/POST/PUT/DELETE | `/agenda` | semua (tulis: admin/guru) |
| GET/POST/PUT/DELETE | `/kategori-agenda` | semua (tulis: admin) |

## Catatan Desain

- **Single-tenant** (satu sekolah: ALC School) — tidak ada `sekolah_id`.
- **Aspek & kategori penilaian configurable** — disimpan di tabel referensi,
  diatur admin tanpa mengubah kode.
- **Absensi terhubung sesi kelas** — `sesi_kelas` (dibuat guru) + `absensi`
  (hadir/izin/sakit/alfa), rekap kehadiran diturunkan dari keduanya.
- **Laporan = agregasi query** dari `pencatatan_perkembangan` + `absensi` +
  `dokumentasi` + `catatan` dalam satu periode.
- **Riwayat & dashboard = query** (bukan tabel terpisah).
- **Foto dikompres otomatis** (resize max 1600px + kualitas 85) saat upload.
