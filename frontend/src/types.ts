export type Role = "superadmin" | "admin" | "guru" | "ortu";

export interface Pengguna {
  id: number;
  role: Role;
  nama: string;
  email: string;
  no_hp?: string | null;
  foto?: string | null;
}

export interface Kelas {
  id: number;
  nama: string;
  tingkat?: string | null;
}

export interface Murid {
  id: number;
  kelas_id?: number | null;
  nama: string;
  tanggal_lahir?: string | null;
  jenis_kelamin?: string | null;
  foto?: string | null;
}

export interface Aspek {
  id: number;
  nama: string;
  deskripsi?: string | null;
}

export interface Pencatatan {
  id: number;
  murid_id: number;
  aspek_id: number;
  guru_id: number;
  tanggal: string;
  kategori?: string | null;
  deskripsi?: string | null;
  aspek_nama?: string | null;
  guru_nama?: string | null;
}

export interface Dokumentasi {
  id: number;
  murid_id: number;
  pengguna_id: number;
  tipe: string;
  url?: string | null;
  deskripsi?: string | null;
  tanggal: string;
}

export interface Catatan {
  id: number;
  murid_id: number;
  pengguna_id: number;
  isi: string;
  created_at: string;
  nama_pengguna?: string | null;
  role?: string | null;
}

export interface RiwayatItem {
  jenis: "pencatatan" | "dokumentasi";
  tanggal: string;
  aspek?: string | null;
  kategori?: string | null;
  tipe?: string | null;
  url?: string | null;
  deskripsi?: string | null;
  oleh?: string | null;
}

export interface DistribusiResponse {
  aspek: string[];
  kategori: string[];
  rows: Record<string, string | number>[];
  total_murid: number;
}

export interface RadarPoint {
  aspek: string;
  kategori: string | null;
  level: number;
}

export interface RingkasanMurid {
  murid: {
    id: number;
    nama: string;
    tanggal_lahir: string | null;
    jenis_kelamin: string | null;
    kelas_id: number | null;
  };
  radar: RadarPoint[];
  penilaian_terakhir: string | null;
  catatan_terbaru: string | null;
  orang_tua: string | null;
}

export interface SesiKelas {
  id: number;
  kelas_id: number;
  guru_id: number;
  tanggal: string;
  tema?: string | null;
  deskripsi?: string | null;
  kelas_nama?: string | null;
}

export interface Absensi {
  id: number;
  sesi_id: number;
  murid_id: number;
  status: string;
  keterangan?: string | null;
  murid_nama?: string | null;
}

export interface Kategori {
  id: number;
  nama: string;
  urutan: number;
  warna: string;
}

export interface Agenda {
  id: number;
  tanggal: string;
  judul: string;
  kategori: string;
  deskripsi?: string | null;
}

export interface KategoriAgenda {
  id: number;
  nama: string;
  urutan: number;
  warna: string;
}

export interface RekapKehadiran {
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  total: number;
  persentase: number | null;
}

export interface LaporanMurid {
  murid: {
    id: number;
    nama: string;
    tanggal_lahir: string | null;
    jenis_kelamin: string | null;
  };
  kelas: string | null;
  bulan: string | null;
  penilaian: {
    aspek: string | null;
    kategori: string | null;
    deskripsi: string | null;
    tanggal: string;
  }[];
  absensi: RekapKehadiran;
  dokumentasi: {
    tipe: string;
    url: string | null;
    deskripsi: string | null;
    tanggal: string;
  }[];
  catatan: {
    isi: string;
    nama_pengguna: string | null;
    role: string | null;
    created_at: string | null;
  }[];
}
