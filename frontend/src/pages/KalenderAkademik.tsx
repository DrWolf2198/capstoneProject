import { useCallback, useEffect, useMemo, useState } from "react";
import { btnPrimary, cardCls, inputCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser } from "../lib/auth";
import type { Agenda, KategoriAgenda } from "../types";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function gridBulan(tahun: number, bulanIdx: number): (number | null)[] {
  const first = new Date(tahun, bulanIdx, 1);
  const offset = (first.getDay() + 6) % 7; // Senin-first
  const daysInMonth = new Date(tahun, bulanIdx + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toISO(tahun: number, bulanIdx: number, day: number): string {
  const m = String(bulanIdx + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${tahun}-${m}-${d}`;
}

function fmtTanggal(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
}

export default function KalenderAkademik() {
  const user = getUser();
  const canWrite = user?.role === "admin" || user?.role === "superadmin" || user?.role === "guru";

  const [tahunAwal, setTahunAwal] = useState(() => {
    const n = new Date();
    return n.getMonth() >= 6 ? n.getFullYear() : n.getFullYear() - 1;
  });
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [kategori, setKategori] = useState<KategoriAgenda[]>([]);
  const [fTanggal, setFTanggal] = useState("");
  const [fJudul, setFJudul] = useState("");
  const [fKategori, setFKategori] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    const mulai = `${tahunAwal}-07-01`;
    const sampai = `${tahunAwal + 1}-06-30`;
    api<Agenda[]>(`/agenda?mulai=${mulai}&sampai=${sampai}`).then(setAgenda).catch(() => {});
  }, [tahunAwal]);

  useEffect(load, [load]);

  useEffect(() => {
    api<KategoriAgenda[]>("/kategori-agenda").then((k) => {
      setKategori(k);
      setFKategori((prev) => prev || (k[0]?.nama ?? ""));
    }).catch(() => {});
  }, []);

  const months = useMemo(() => {
    const list: { bulanIdx: number; tahun: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const bulanIdx = (6 + i) % 12; // Juli=6 .. Des=11, Jan=0 .. Jun=5
      const tahun = bulanIdx >= 6 ? tahunAwal : tahunAwal + 1;
      list.push({ bulanIdx, tahun });
    }
    return list;
  }, [tahunAwal]);

  const agendaByDate = useMemo(() => {
    const m: Record<string, Agenda[]> = {};
    agenda.forEach((a) => {
      (m[a.tanggal] ??= []).push(a);
    });
    return m;
  }, [agenda]);

  const kategoriWarna = useMemo(() => {
    const m: Record<string, string> = {};
    kategori.forEach((k) => (m[k.nama] = k.warna));
    return m;
  }, [kategori]);

  const tahunOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const opts: number[] = [];
    for (let y = now - 2; y <= now + 1; y++) opts.push(y);
    return opts;
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/agenda", {
        method: "POST",
        body: JSON.stringify({ tanggal: fTanggal, judul: fJudul, kategori: fKategori }),
      });
      setFJudul("");
      load();
      setMsg("Agenda ditambahkan");
      setTimeout(() => setMsg(""), 2400);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menambah agenda");
    }
  };

  const del = async (id: number) => {
    if (!confirm("Hapus agenda ini?")) return;
    await api(`/agenda/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink">Kalender Akademik</h1>
        <select className={selectCls} value={tahunAwal} onChange={(e) => setTahunAwal(Number(e.target.value))}>
          {tahunOptions.map((y) => (
            <option key={y} value={y}>Tahun Ajaran {y}/{y + 1}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-body/70 mb-6">Agenda kegiatan dan hari libur sekolah.</p>

      {msg && <div className="mb-4 text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msg}</div>}

      {canWrite && (
        <form onSubmit={create} className={`${cardCls} mb-6 flex flex-wrap items-end gap-3`}>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-body/60 mb-1">Tanggal</label>
            <input type="date" className={inputCls} value={fTanggal} onChange={(e) => setFTanggal(e.target.value)} required />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-xs text-body/60 mb-1">Judul agenda</label>
            <input className={inputCls} placeholder="mis. Pembagian Rapor" value={fJudul} onChange={(e) => setFJudul(e.target.value)} required />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-body/60 mb-1">Kategori</label>
            <select className={selectCls} value={fKategori} onChange={(e) => setFKategori(e.target.value)}>
              {kategori.map((k) => <option key={k.id} value={k.nama}>{k.nama}</option>)}
            </select>
          </div>
          <button className={btnPrimary}>Tambah</button>
        </form>
      )}

      <div className="flex flex-wrap gap-4 mb-6 text-xs text-body/60">
        {kategori.map((k) => (
          <span key={k.id} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: k.warna }} />
            {k.nama}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {months.map(({ bulanIdx, tahun }) => {
          const cells = gridBulan(tahun, bulanIdx);
          const agendaBulan = agenda
            .filter((a) => {
              const d = new Date(a.tanggal + "T00:00:00");
              return d.getFullYear() === tahun && d.getMonth() === bulanIdx;
            })
            .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
          return (
            <div key={`${tahun}-${bulanIdx}`} className={`${cardCls} !p-0 overflow-hidden`}>
              <div className="px-4 py-2.5 bg-primary text-white font-bold text-sm">{BULAN[bulanIdx]} {tahun}</div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-0.5 text-center mb-3">
                  {HARI.map((h) => (
                    <div key={h} className="text-[10px] font-semibold text-body/40 py-1">{h}</div>
                  ))}
                  {cells.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    const iso = toISO(tahun, bulanIdx, d);
                    const events = agendaByDate[iso] ?? [];
                    return (
                      <div
                        key={i}
                        title={events.map((e) => e.judul).join(", ")}
                        className={`h-8 rounded-md text-xs flex items-center justify-center ${events.length ? "text-white font-bold" : "text-body/70"}`}
                        style={events.length ? { background: kategoriWarna[events[0].kategori] ?? "#94a3b8" } : undefined}
                      >
                        {d}
                        {events.length > 1 && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-black/5 pt-3 space-y-1.5">
                  {agendaBulan.length === 0 ? (
                    <p className="text-xs text-body/40">Tidak ada agenda.</p>
                  ) : (
                    agendaBulan.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-none mt-1" style={{ background: kategoriWarna[a.kategori] ?? "#94a3b8" }} />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-ink">{fmtTanggal(a.tanggal)}</span>
                          <span className="text-body/70"> — {a.judul}</span>
                        </div>
                        {canWrite && (
                          <button onClick={() => del(a.id)} className="text-red-400 hover:text-red-600 flex-none">
                            <i className="ri-close-line" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
