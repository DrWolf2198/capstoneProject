"""Seed data awal: akun demo + aspek default + sample murid.

Jalankan: python -m app.seed
"""
from datetime import date

from . import models, security
from .database import Base, SessionLocal, engine


def _get_or_create_user(db, role, nama, email, password):
    u = db.query(models.Pengguna).filter(models.Pengguna.email == email).first()
    if u is None:
        u = models.Pengguna(
            role=role,
            nama=nama,
            email=email,
            password_hash=security.hash_password(password),
        )
        db.add(u)
        db.flush()
    return u


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.AspekPerkembangan).count() == 0:
            for nama, deskripsi in [
                ("Kognitif", "Berpikir, mengenal angka dan bentuk, memecahkan masalah"),
                ("Bahasa", "Kosakata, menyimak, bercerita"),
                ("Sosial-Emosional", "Berinteraksi, mengelola emosi"),
                ("Motorik", "Gerakan kasar dan halus"),
                ("Kemandirian", "Mengurus diri, bertanggung jawab, percaya diri"),
            ]:
                db.add(models.AspekPerkembangan(nama=nama, deskripsi=deskripsi))

        if db.query(models.KategoriPenilaian).count() == 0:
            for nama, urutan, warna in [
                ("BB", 1, "#94a3b8"),
                ("MB", 2, "#fbbf24"),
                ("BSH", 3, "#60a5fa"),
                ("BSB", 4, "#34d399"),
            ]:
                db.add(models.KategoriPenilaian(nama=nama, urutan=urutan, warna=warna))

        # kategori agenda kalender (referensi, diatur admin/super admin)
        if db.query(models.KategoriAgenda).count() == 0:
            for urutan, (nama, warna) in enumerate([
                ("Kegiatan Sekolah", "#3b82f6"),
                ("Libur Nasional", "#ef4444"),
                ("Kegiatan Khusus", "#a855f7"),
                ("Evaluasi & Rapor", "#14b8a6"),
            ], start=1):
                db.add(models.KategoriAgenda(nama=nama, warna=warna, urutan=urutan))

        # migrasi data agenda lama (slug -> nama label)
        for slug, nama in [
            ("kegiatan_sekolah", "Kegiatan Sekolah"),
            ("libur_nasional", "Libur Nasional"),
            ("kegiatan_khusus", "Kegiatan Khusus"),
            ("evaluasi_rapor", "Evaluasi & Rapor"),
        ]:
            db.query(models.AgendaAkademik).filter(
                models.AgendaAkademik.kategori == slug
            ).update({models.AgendaAkademik.kategori: nama}, synchronize_session=False)

        if db.query(models.AgendaAkademik).count() == 0:
            for tanggal, judul, kategori in [
                (date(2026, 7, 13), "Awal Tahun Ajaran 2026/2027", "Kegiatan Sekolah"),
                (date(2026, 7, 13), "Masa Pengenalan Lingkungan Sekolah (MPLS)", "Kegiatan Khusus"),
                (date(2026, 7, 25), "Kelas Parenting", "Kegiatan Khusus"),
                (date(2026, 8, 17), "Libur Hari Kemerdekaan RI", "Libur Nasional"),
                (date(2026, 8, 25), "Maulid Nabi Muhammad SAW", "Libur Nasional"),
                (date(2026, 8, 31), "Lomba Kemerdekaan & Anak Pentas", "Kegiatan Khusus"),
                (date(2026, 12, 4), "Pemeriksaan Kesehatan Semester 1", "Evaluasi & Rapor"),
                (date(2026, 12, 18), "Pentas Seni", "Kegiatan Khusus"),
                (date(2026, 12, 19), "Pembagian Rapor", "Evaluasi & Rapor"),
                (date(2026, 12, 21), "Libur Semester 1", "Libur Nasional"),
                (date(2027, 6, 1), "Libur Hari Lahir Pancasila", "Libur Nasional"),
                (date(2027, 6, 18), "Pembagian Rapor", "Evaluasi & Rapor"),
                (date(2027, 6, 19), "Pentas Seni", "Kegiatan Khusus"),
                (date(2027, 6, 21), "Libur Akhir Tahun Ajaran", "Libur Nasional"),
            ]:
                db.add(models.AgendaAkademik(tanggal=tanggal, judul=judul, kategori=kategori))

        superadmin = _get_or_create_user(db, "superadmin", "Super Admin", "superadmin@kiddytracker.id", "superadmin123")
        admin = _get_or_create_user(db, "admin", "Admin ALC", "admin@kiddytracker.id", "admin123")
        guru = _get_or_create_user(db, "guru", "Bu Guru Sari", "guru@kiddytracker.id", "guru123")
        ortu = _get_or_create_user(db, "ortu", "Ibu Rina", "ortu@kiddytracker.id", "ortu123")

        if db.query(models.Kelas).count() == 0:
            tk_a = models.Kelas(nama="TK A", tingkat="Kelompok A")
            tk_b = models.Kelas(nama="TK B", tingkat="Kelompok B")
            db.add_all([tk_a, tk_b])
            db.flush()

            murid_tk_a = [
                ("Budi Santoso", date(2021, 3, 12), "L"),
                ("Siti Aminah", date(2021, 7, 1), "P"),
                ("Ahmad Fauzi", date(2021, 1, 15), "L"),
                ("Dewi Lestari", date(2021, 4, 22), "P"),
                ("Rizky Pratama", date(2020, 12, 5), "L"),
                ("Nabila Zahra", date(2021, 6, 10), "P"),
                ("Fajar Ramadhan", date(2021, 2, 19), "L"),
                ("Putri Ayu", date(2021, 9, 3), "P"),
                ("Dimas Saputra", date(2020, 11, 27), "L"),
                ("Intan Permata", date(2021, 5, 8), "P"),
            ]
            murid_tk_b = [
                ("Aisyah Putri", date(2020, 8, 14), "P"),
                ("Bagus Wijaya", date(2020, 1, 25), "L"),
                ("Citra Dewi", date(2020, 10, 9), "P"),
                ("Dafa Alfarizi", date(2020, 3, 30), "L"),
                ("Eka Ramadhani", date(2020, 7, 17), "P"),
                ("Fikri Hidayat", date(2020, 12, 11), "L"),
                ("Gita Maharani", date(2020, 4, 3), "P"),
                ("Hafiz Nurrahman", date(2020, 6, 21), "L"),
                ("Indah Permatasari", date(2020, 11, 19), "P"),
                ("Joko Susilo", date(2020, 9, 2), "L"),
            ]

            budi = None
            for nama, tgl, jk in murid_tk_a:
                m = models.Murid(kelas_id=tk_a.id, nama=nama, tanggal_lahir=tgl, jenis_kelamin=jk)
                db.add(m)
                if nama == "Budi Santoso":
                    budi = m
            for nama, tgl, jk in murid_tk_b:
                db.add(models.Murid(kelas_id=tk_b.id, nama=nama, tanggal_lahir=tgl, jenis_kelamin=jk))
            db.flush()

            if budi is not None:
                db.add(models.MuridOrangTua(murid_id=budi.id, pengguna_id=ortu.id, hubungan="ibu"))

        db.commit()
        print("Seed selesai.")
        print("  superadmin: superadmin@kiddytracker.id / superadmin123")
        print("  admin: admin@kiddytracker.id / admin123")
        print("  guru : guru@kiddytracker.id / guru123")
        print("  ortu : ortu@kiddytracker.id / ortu123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
