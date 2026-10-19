import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { btnGhost, btnPrimary, cardCls, inputCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser } from "../lib/auth";
import type { Aspek, Kategori, KategoriAgenda, Kelas, Murid, Pengguna } from "../types";

type Tab = "aspek" | "kategori" | "kategoriAgenda" | "kelas" | "murid" | "pengguna";

const TABS: { id: Tab; label: string }[] = [
  { id: "aspek", label: "Aspek Penilaian" },
  { id: "kategori", label: "Kategori Penilaian" },
  { id: "kategoriAgenda", label: "Kategori Agenda" },
  { id: "kelas", label: "Kelas" },
  { id: "murid", label: "Murid" },
  { id: "pengguna", label: "Guru & Ortu" },
];

export default function DataMaster() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "aspek" || t === "kategori" || t === "kategoriAgenda" || t === "kelas" || t === "murid" || t === "pengguna"
      ? t
      : "aspek";
  });
  return (
    <div>
      <h1 className="text-2xl font-black text-ink mb-1">Data Master</h1>
      <p className="text-sm text-body/70 mb-6">
        Kelola data dasar sekolah: aspek penilaian, kelas, murid, dan akun guru/ortu.
      </p>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-black/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-body/60 hover:text-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "aspek" && <AspekTab />}
      {tab === "kategori" && <KategoriTab />}
      {tab === "kategoriAgenda" && <KategoriAgendaTab />}
      {tab === "kelas" && <KelasTab />}
      {tab === "murid" && <MuridTab />}
      {tab === "pengguna" && <PenggunaTab />}
    </div>
  );
}

/* ---------------- Kategori Penilaian ---------------- */
function KategoriTab() {
  const [rows, setRows] = useState<Kategori[]>([]);
  const [nama, setNama] = useState("");
  const [urutan, setUrutan] = useState("");
  const [warna, setWarna] = useState("#94a3b8");

  const load = useCallback(() => {
    api<Kategori[]>("/kategori").then(setRows).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/kategori", {
      method: "POST",
      body: JSON.stringify({ nama, urutan: Number(urutan) || 0, warna }),
    });
    setNama("");
    setUrutan("");
    setWarna("#94a3b8");
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    await api(`/kategori/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={create} className={`${cardCls} space-y-3`}>
        <h2 className="font-bold text-ink">Tambah Kategori</h2>
        <input className={inputCls} placeholder="Nama level (mis. BB, MB)" value={nama} onChange={(e) => setNama(e.target.value)} required />
        <input className={inputCls} type="number" placeholder="Urutan (1, 2, 3...)" value={urutan} onChange={(e) => setUrutan(e.target.value)} />
        <div className="flex items-center gap-2">
          <input className="w-16 h-9 rounded-md border border-[#e2e8f0] bg-[#f8fafc] cursor-pointer" type="color" value={warna} onChange={(e) => setWarna(e.target.value)} />
          <span className="text-sm text-body/60">{warna}</span>
        </div>
        <button className={btnPrimary}>Simpan</button>
      </form>
      <div className={`${cardCls} lg:col-span-2`}>
        <h2 className="font-bold text-ink mb-4">Daftar Kategori (level)</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((k) => (
            <li key={k.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: k.warna }}>
                  {k.nama}
                </span>
                <div>
                  <div className="font-semibold text-ink">{k.nama}</div>
                  <div className="text-xs text-body/50">urutan {k.urutan}</div>
                </div>
              </div>
              <button onClick={() => del(k.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Kategori Agenda ---------------- */
function KategoriAgendaTab() {
  const [rows, setRows] = useState<KategoriAgenda[]>([]);
  const [nama, setNama] = useState("");
  const [urutan, setUrutan] = useState("");
  const [warna, setWarna] = useState("#3b82f6");

  const load = useCallback(() => {
    api<KategoriAgenda[]>("/kategori-agenda").then(setRows).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/kategori-agenda", {
      method: "POST",
      body: JSON.stringify({ nama, urutan: Number(urutan) || 0, warna }),
    });
    setNama("");
    setUrutan("");
    setWarna("#3b82f6");
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    await api(`/kategori-agenda/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={create} className={`${cardCls} space-y-3`}>
        <h2 className="font-bold text-ink">Tambah Kategori Agenda</h2>
        <input className={inputCls} placeholder="Nama kategori (mis. Pentas Seni)" value={nama} onChange={(e) => setNama(e.target.value)} required />
        <input className={inputCls} type="number" placeholder="Urutan (1, 2, 3...)" value={urutan} onChange={(e) => setUrutan(e.target.value)} />
        <div className="flex items-center gap-2">
          <input className="w-16 h-9 rounded-md border border-[#e2e8f0] bg-[#f8fafc] cursor-pointer" type="color" value={warna} onChange={(e) => setWarna(e.target.value)} />
          <span className="text-sm text-body/60">{warna}</span>
        </div>
        <button className={btnPrimary}>Simpan</button>
      </form>
      <div className={`${cardCls} lg:col-span-2`}>
        <h2 className="font-bold text-ink mb-4">Daftar Kategori Agenda</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((k) => (
            <li key={k.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-none" style={{ background: k.warna }} />
                <div>
                  <div className="font-semibold text-ink">{k.nama}</div>
                  <div className="text-xs text-body/50">urutan {k.urutan}</div>
                </div>
              </div>
              <button onClick={() => del(k.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Aspek ---------------- */
function AspekTab() {
  const [rows, setRows] = useState<Aspek[]>([]);
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  const load = useCallback(() => {
    api<Aspek[]>("/aspek").then(setRows).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/aspek", { method: "POST", body: JSON.stringify({ nama, deskripsi }) });
    setNama("");
    setDeskripsi("");
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Hapus aspek ini?")) return;
    await api(`/aspek/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={create} className={`${cardCls} space-y-3`}>
        <h2 className="font-bold text-ink">Tambah Aspek</h2>
        <input className={inputCls} placeholder="Nama aspek" value={nama} onChange={(e) => setNama(e.target.value)} required />
        <textarea className={inputCls} placeholder="Deskripsi" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} />
        <button className={btnPrimary}>Simpan</button>
      </form>
      <div className={`${cardCls} lg:col-span-2`}>
        <h2 className="font-bold text-ink mb-4">Daftar Aspek</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">{a.nama}</div>
                {a.deskripsi && <div className="text-sm text-body/60">{a.deskripsi}</div>}
              </div>
              <button onClick={() => del(a.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Kelas ---------------- */
function KelasTab() {
  const [rows, setRows] = useState<Kelas[]>([]);
  const [nama, setNama] = useState("");
  const [tingkat, setTingkat] = useState("");

  const load = useCallback(() => {
    api<Kelas[]>("/kelas").then(setRows).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/kelas", { method: "POST", body: JSON.stringify({ nama, tingkat }) });
    setNama("");
    setTingkat("");
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Hapus kelas ini?")) return;
    await api(`/kelas/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={create} className={`${cardCls} space-y-3`}>
        <h2 className="font-bold text-ink">Tambah Kelas</h2>
        <input className={inputCls} placeholder="Nama kelas (mis. TK A)" value={nama} onChange={(e) => setNama(e.target.value)} required />
        <input className={inputCls} placeholder="Tingkat (mis. Kelompok A)" value={tingkat} onChange={(e) => setTingkat(e.target.value)} />
        <button className={btnPrimary}>Simpan</button>
      </form>
      <div className={`${cardCls} lg:col-span-2`}>
        <h2 className="font-bold text-ink mb-4">Daftar Kelas</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((k) => (
            <li key={k.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink">{k.nama}</span>
                {k.tingkat && <span className="ml-2 text-sm text-body/60">{k.tingkat}</span>}
              </div>
              <button onClick={() => del(k.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Murid ---------------- */
function MuridTab() {
  const [rows, setRows] = useState<Murid[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [ortu, setOrtu] = useState<Pengguna[]>([]);
  const [nama, setNama] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [tgl, setTgl] = useState("");
  const [jk, setJk] = useState("");
  const [foto, setFoto] = useState("");
  const [linkMurid, setLinkMurid] = useState("");
  const [linkOrtu, setLinkOrtu] = useState("");
  const [hubungan, setHubungan] = useState("");

  const load = useCallback(() => {
    api<Murid[]>("/murid").then(setRows).catch(() => {});
    api<Kelas[]>("/kelas").then(setKelas).catch(() => {});
    api<Pengguna[]>("/pengguna").then((p) => setOrtu(p.filter((x) => x.role === "ortu"))).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const onFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ url: string }>("/dokumentasi/upload", { method: "POST", body: fd });
      setFoto(res.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload foto gagal");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/murid", {
      method: "POST",
      body: JSON.stringify({
        nama,
        kelas_id: kelasId ? Number(kelasId) : null,
        tanggal_lahir: tgl || null,
        jenis_kelamin: jk || null,
        foto: foto || null,
      }),
    });
    setNama(""); setKelasId(""); setTgl(""); setJk(""); setFoto("");
    load();
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    await api(`/murid/${linkMurid}/ortu`, {
      method: "POST",
      body: JSON.stringify({ pengguna_id: Number(linkOrtu), hubungan }),
    });
    setLinkMurid(""); setLinkOrtu(""); setHubungan("");
  };

  const del = async (id: number) => {
    if (!confirm("Hapus murid ini?")) return;
    await api(`/murid/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={create} className={`${cardCls} space-y-3`}>
          <h2 className="font-bold text-ink">Daftarkan Murid</h2>
          <input className={inputCls} placeholder="Nama murid" value={nama} onChange={(e) => setNama(e.target.value)} required />
          <select className={selectCls} value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            <option value="">Pilih kelas</option>
            {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <input className={inputCls} type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
          <select className={selectCls} value={jk} onChange={(e) => setJk(e.target.value)}>
            <option value="">Jenis kelamin</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-body/60">Foto murid (opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={onFoto}
              className="block w-full text-sm text-body/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold cursor-pointer"
            />
            {foto && <img src={foto} alt="Foto murid" className="w-24 h-24 object-cover rounded-lg border border-black/10" />}
          </div>
          <button className={btnPrimary}>Simpan</button>
        </form>
        <form onSubmit={link} className={`${cardCls} space-y-3`}>
          <h2 className="font-bold text-ink">Kaitkan Orang Tua</h2>
          <select className={selectCls} value={linkMurid} onChange={(e) => setLinkMurid(e.target.value)} required>
            <option value="">Pilih murid</option>
            {rows.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <select className={selectCls} value={linkOrtu} onChange={(e) => setLinkOrtu(e.target.value)} required>
            <option value="">Pilih orang tua</option>
            {ortu.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
          </select>
          <select className={selectCls} value={hubungan} onChange={(e) => setHubungan(e.target.value)}>
            <option value="">Hubungan</option>
            <option value="ayah">Ayah</option>
            <option value="ibu">Ibu</option>
            <option value="wali">Wali</option>
          </select>
          <button className={btnPrimary}>Kaitkan</button>
        </form>
      </div>
      <div className={cardCls}>
        <h2 className="font-bold text-ink mb-4">Daftar Murid</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink">{m.nama}</span>
                <span className="ml-2 text-sm text-body/60">
                  {m.jenis_kelamin === "L" ? "Laki-laki" : m.jenis_kelamin === "P" ? "Perempuan" : ""}
                </span>
                {m.tanggal_lahir && <span className="ml-2 text-sm text-body/60">· {m.tanggal_lahir}</span>}
              </div>
              <button onClick={() => del(m.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Pengguna (guru, ortu, admin) ---------------- */
function PenggunaTab() {
  const isSuperadmin = getUser()?.role === "superadmin";
  const [rows, setRows] = useState<Pengguna[]>([]);
  const [role, setRole] = useState("guru");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(() => {
    api<Pengguna[]>("/pengguna").then(setRows).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/pengguna", {
      method: "POST",
      body: JSON.stringify({ role, nama, email, password }),
    });
    setNama(""); setEmail(""); setPassword("");
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Hapus akun ini?")) return;
    await api(`/pengguna/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={create} className={`${cardCls} space-y-3`}>
        <h2 className="font-bold text-ink">Tambah Akun</h2>
        <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="guru">Guru</option>
          <option value="ortu">Orang Tua</option>
          {isSuperadmin && <option value="admin">Admin</option>}
        </select>
        <input className={inputCls} placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className={btnPrimary}>Simpan</button>
      </form>
      <div className={`${cardCls} lg:col-span-2`}>
        <h2 className="font-bold text-ink mb-4">Daftar Akun</h2>
        <ul className="divide-y divide-black/5">
          {rows.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">{p.nama}</div>
                <div className="text-sm text-body/60">
                  {p.email} · <span className="capitalize">{p.role}</span>
                </div>
              </div>
              <button onClick={() => del(p.id)} className="text-red-500 hover:text-red-700 text-sm">
                <i className="ri-delete-bin-line" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
