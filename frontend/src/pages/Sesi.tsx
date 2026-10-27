import { useEffect, useMemo, useState } from "react";
import { btnPrimary, cardCls, inputCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Kelas, Murid, SesiKelas } from "../types";

const STATUS = [
  { kode: "hadir", label: "Hadir", warna: "#34d399" },
  { kode: "izin", label: "Izin", warna: "#fbbf24" },
  { kode: "sakit", label: "Sakit", warna: "#f87171" },
  { kode: "alfa", label: "Alfa", warna: "#94a3b8" },
];

interface AbsensiState {
  status: string;
  keterangan: string;
}

export default function Absensi() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [murid, setMurid] = useState<Murid[]>([]);
  const [fKelas, setFKelas] = useState("");
  const [fTanggal, setFTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [sesiId, setSesiId] = useState<number | null>(null);
  const [absensi, setAbsensi] = useState<Record<number, AbsensiState>>({});
  const [msg, setMsg] = useState("");
  const [rekapIds, setRekapIds] = useState<number[]>([]);
  const [periode, setPeriode] = useState(1);
  const [rekapKelas, setRekapKelas] = useState("");

  useEffect(() => {
    api<Kelas[]>("/kelas")
      .then((k) => {
        setKelas(k);
        if (k[0]) setFKelas(String(k[0].id));
      })
      .catch(() => {});
    api<Murid[]>("/murid").then(setMurid).catch(() => {});
  }, []);

  // get-or-create sesi harian untuk (kelas, tanggal), lalu muat absensi
  useEffect(() => {
    if (!fKelas || !fTanggal) return;
    api<SesiKelas>(`/sesi/harian?kelas_id=${fKelas}&tanggal=${fTanggal}`, { method: "POST" })
      .then((s) => {
        setSesiId(s.id);
        return api<{ murid_id: number; status: string; keterangan?: string | null }[]>(
          `/sesi/${s.id}/absensi`,
        );
      })
      .then((rows) => {
        const m: Record<number, AbsensiState> = {};
        rows.forEach((r) => (m[r.murid_id] = { status: r.status, keterangan: r.keterangan ?? "" }));
        setAbsensi(m);
      })
      .catch(() => {});
  }, [fKelas, fTanggal]);

  const muridKelas = useMemo(
    () => murid.filter((m) => m.kelas_id === Number(fKelas)),
    [murid, fKelas],
  );

  const setStatus = (muridId: number, status: string) => {
    setAbsensi((prev) => {
      const cur = prev[muridId] ?? { status: "hadir", keterangan: "" };
      // kalau pindah ke hadir/alfa, bersihkan keterangan
      const keterangan = status === "izin" || status === "sakit" ? cur.keterangan : "";
      return { ...prev, [muridId]: { status, keterangan } };
    });
  };

  const setKeterangan = (muridId: number, keterangan: string) => {
    setAbsensi((prev) => {
      const cur = prev[muridId] ?? { status: "hadir", keterangan: "" };
      return { ...prev, [muridId]: { ...cur, keterangan } };
    });
  };

  const simpan = async () => {
    if (!sesiId) return;
    const items = Object.entries(absensi).map(([mid, v]) => ({
      murid_id: Number(mid),
      status: v.status,
      keterangan: v.keterangan || null,
    }));
    if (items.length === 0) {
      setMsg("Pilih status minimal satu murid dulu.");
      return;
    }
    try {
      await api(`/sesi/${sesiId}/absensi`, { method: "POST", body: JSON.stringify({ items }) });
      setMsg("Absensi tersimpan");
      setTimeout(() => setMsg(""), 2400);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan absensi");
    }
  };

  const toggleRekap = (id: number) => {
    setRekapIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const exportAbsensi = async () => {
    if (rekapIds.length === 0) {
      setMsg("Pilih minimal satu murid untuk direkap.");
      return;
    }
    try {
      const token = getToken();
      const res = await fetch(`/api/laporan/export/absensi?murid_ids=${rekapIds.join(",")}&periode=${periode}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setMsg((err && (err.detail || err.message)) || "Gagal export");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-kehadiran-${periode}bulan.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal export");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-ink mb-1">Absensi</h1>
      <p className="text-sm text-body/70 mb-6">Catat kehadiran murid per hari.</p>
      {msg && <div className="mb-4 text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msg}</div>}

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="min-w-[180px]">
          <label className="block text-xs text-body/60 mb-1">Kelas</label>
          <select className={selectCls} value={fKelas} onChange={(e) => setFKelas(e.target.value)}>
            {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="block text-xs text-body/60 mb-1">Tanggal</label>
          <input className={inputCls} type="date" value={fTanggal} onChange={(e) => setFTanggal(e.target.value)} />
        </div>
        {sesiId && <button className={btnPrimary} onClick={simpan}>Simpan Absensi</button>}
      </div>

      <div className="space-y-2">
        {muridKelas.map((m) => {
          const cur = absensi[m.id] ?? { status: "", keterangan: "" };
          const showKet = cur.status === "izin" || cur.status === "sakit";
          return (
            <div key={m.id} className={`${cardCls} !py-3`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                    {m.nama.charAt(0)}
                  </div>
                  <span className="font-semibold text-ink">{m.nama}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS.map((st) => (
                    <button
                      key={st.kode}
                      onClick={() => setStatus(m.id, st.kode)}
                      style={cur.status === st.kode ? { background: st.warna, color: "#fff", borderColor: "transparent" } : undefined}
                      className="min-w-[56px] border border-[#e2e8f0] rounded-md bg-[#f8fafc] px-2.5 py-1.5 text-xs font-semibold text-[#64748b] transition"
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
              {showKet && (
                <div className="mt-2.5">
                  <input
                    className={inputCls}
                    placeholder={cur.status === "izin" ? "Keterangan izin (mis. ada acara keluarga)" : "Keterangan sakit (mis. demam)"}
                    value={cur.keterangan}
                    onChange={(e) => setKeterangan(m.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
        {muridKelas.length === 0 && <p className="text-sm text-body/50">Tidak ada murid di kelas ini.</p>}
      </div>

      <div className={`${cardCls} mt-6`}>
        <h2 className="font-bold text-ink mb-1">Rekap Kehadiran</h2>
        <p className="text-sm text-body/60 mb-4">Pilih murid (bisa lebih dari satu) + periode, lalu export ke Excel.</p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[160px]">
            <label className="block text-xs text-body/60 mb-1">Kelas</label>
            <select className={selectCls} value={rekapKelas} onChange={(e) => {
              const v = e.target.value;
              setRekapKelas(v);
              setRekapIds(v ? murid.filter((m) => m.kelas_id === Number(v)).map((m) => m.id) : []);
            }}>
              <option value="">Pilih kelas</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs text-body/60 mb-1">Periode</label>
            <select className={selectCls} value={periode} onChange={(e) => setPeriode(Number(e.target.value))}>
              <option value={1}>1 Bulan</option>
              <option value={3}>3 Bulan</option>
              <option value={6}>6 Bulan</option>
              <option value={12}>1 Tahun</option>
            </select>
          </div>
          <button className={btnPrimary} onClick={exportAbsensi}>
            <i className="ri-file-excel-2-line mr-1.5" /> Export
          </button>
        </div>
        <div className="space-y-2">
          {murid.map((m) => (
            <label key={m.id} className="flex items-center gap-3 border border-black/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={rekapIds.includes(m.id)}
                onChange={() => toggleRekap(m.id)}
                className="accent-[#3B97BC]"
              />
              <span className="text-sm text-ink">{m.nama}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
