import { useEffect, useMemo, useState } from "react";
import { btnPrimary, cardCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser } from "../lib/auth";
import type { Kategori, LaporanMurid, Murid } from "../types";

function fmtTanggal(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtBulan(bulan: string): string {
  const [y, m] = bulan.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function hitungUmur(tgl?: string | null): string {
  if (!tgl) return "-";
  const lahir = new Date(tgl + "T00:00:00");
  if (Number.isNaN(lahir.getTime())) return "-";
  const now = new Date();
  let tahun = now.getFullYear() - lahir.getFullYear();
  let bulan = now.getMonth() - lahir.getMonth();
  if (bulan < 0) {
    tahun -= 1;
    bulan += 12;
  }
  if (tahun < 1) return `${bulan} bulan`;
  return `${tahun} tahun ${bulan} bulan`;
}

const LEVEL_COLORS_FALLBACK = "#94a3b8";

export default function Laporan() {
  const user = getUser();
  const isOrtu = user?.role === "ortu";
  const [murid, setMurid] = useState<Murid[]>([]);
  const [muridId, setMuridId] = useState("");
  const [bulan, setBulan] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<LaporanMurid | null>(null);
  const [kategori, setKategori] = useState<Kategori[]>([]);

  useEffect(() => {
    api<Murid[]>("/murid").then((m) => {
      setMurid(m);
      if (m.length > 0) setMuridId(String(m[0].id));
    }).catch(() => {});
    api<Kategori[]>("/kategori").then(setKategori).catch(() => {});
  }, []);

  useEffect(() => {
    if (!muridId) return;
    api<LaporanMurid>(`/laporan/murid/${muridId}?bulan=${bulan}`)
      .then(setData)
      .catch(() => {});
  }, [muridId, bulan]);

  const kategoriWarna = useMemo(() => {
    const m: Record<string, string> = {};
    kategori.forEach((k) => (m[k.nama] = k.warna));
    return m;
  }, [kategori]);

  const kategoriDominan = useMemo(() => {
    if (!data || data.penilaian.length === 0) return null;
    const order = kategori.map((k) => k.nama);
    const found = data.penilaian.filter((p) => p.kategori);
    if (found.length === 0) return null;
    return found.sort((a, b) => order.indexOf(b.kategori ?? "") - order.indexOf(a.kategori ?? ""))[0].kategori;
  }, [data, kategori]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink">Laporan Perkembangan</h1>
        {data && (
          <button onClick={() => window.print()} className={`${btnPrimary} no-print`}>
            <i className="ri-printer-line mr-1.5" /> Cetak Laporan
          </button>
        )}
      </div>
      <p className="text-sm text-body/70 mb-6">
        Rekap otomatis penilaian, kehadiran, dokumentasi, dan catatan dalam satu periode.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 no-print">
        <select className={selectCls + " max-w-xs"} value={muridId} onChange={(e) => setMuridId(e.target.value)}>
          <option value="">Pilih murid</option>
          {murid.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
        </select>
        <input className={selectCls + " max-w-[180px]"} type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} />
      </div>

      {!data ? (
        <div className={`${cardCls} text-center py-16 text-body/50`}>Pilih murid dan periode.</div>
      ) : (
        <div className="space-y-6">
          {/* Header laporan */}
          <div className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-ink">{data.murid.nama}</h2>
                <p className="text-sm text-body/60">
                  {data.kelas ?? "-"} · {data.murid.jenis_kelamin === "L" ? "Laki-laki" : data.murid.jenis_kelamin === "P" ? "Perempuan" : ""}
                  {data.murid.tanggal_lahir ? ` · Lahir ${fmtTanggal(data.murid.tanggal_lahir)}` : ""}
                  {" · "}Usia {hitungUmur(data.murid.tanggal_lahir)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-body/50 uppercase tracking-wide">Periode</div>
                <div className="font-bold text-ink">{fmtBulan(data.bulan ?? "")}</div>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cardCls + " !p-4"}>
              <div className="text-xs text-body/50">Kehadiran</div>
              <div className="text-2xl font-black text-ink">
                {data.absensi.persentase != null ? `${data.absensi.persentase}%` : "-"}
              </div>
              <div className="text-[11px] text-body/40">
                {data.absensi.total ? `${data.absensi.hadir} hadir dari ${data.absensi.total} hari` : "belum ada data"}
              </div>
            </div>
            <div className={cardCls + " !p-4"}>
              <div className="text-xs text-body/50">Capaian Dominan</div>
              <div className="text-2xl font-black text-ink">{kategoriDominan ?? "-"}</div>
              <div className="text-[11px] text-body/40">dari {data.penilaian.length} aspek</div>
            </div>
            <div className={cardCls + " !p-4"}>
              <div className="text-xs text-body/50">Dokumentasi</div>
              <div className="text-2xl font-black text-ink">{data.dokumentasi.length}</div>
              <div className="text-[11px] text-body/40">foto / video / karya</div>
            </div>
            <div className={cardCls + " !p-4"}>
              <div className="text-xs text-body/50">Catatan</div>
              <div className="text-2xl font-black text-ink">{data.catatan.length}</div>
              <div className="text-[11px] text-body/40">guru ↔ orang tua</div>
            </div>
          </div>

          {/* Penilaian */}
          <div className={cardCls}>
            <h3 className="font-bold text-ink mb-4">Penilaian Perkembangan</h3>
            {data.penilaian.length === 0 ? (
              <p className="text-sm text-body/50">Belum ada penilaian pada periode ini.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-body/60 border-b border-black/5">
                    <th className="py-2 font-medium">Aspek</th>
                    <th className="py-2 font-medium">Capaian</th>
                    <th className="py-2 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.penilaian.map((p, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="py-3 font-semibold text-ink">{p.aspek ?? "-"}</td>
                      <td className="py-3">
                        {p.kategori && (
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-white"
                            style={{ background: kategoriWarna[p.kategori ?? ""] ?? LEVEL_COLORS_FALLBACK }}
                          >
                            {p.kategori}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-body/70">{p.deskripsi ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Dokumentasi */}
          <div className={cardCls}>
            <h3 className="font-bold text-ink mb-4">Dokumentasi Kegiatan</h3>
            {data.dokumentasi.length === 0 ? (
              <p className="text-sm text-body/50">Belum ada dokumentasi pada periode ini.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {data.dokumentasi.map((d, i) => (
                  <li key={i} className="py-3 flex items-center gap-3">
                    <span className="text-xs text-body/40 w-24 flex-none">{fmtTanggal(d.tanggal)}</span>
                    <i className="ri-camera-line text-primary" />
                    <span className="text-sm text-ink capitalize">{d.tipe.replace("_", " ")}</span>
                    {d.deskripsi && <span className="text-sm text-body/60">— {d.deskripsi}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Catatan */}
          <div className={cardCls}>
            <h3 className="font-bold text-ink mb-4">Catatan Guru & Orang Tua</h3>
            {data.catatan.length === 0 ? (
              <p className="text-sm text-body/50">Belum ada catatan pada periode ini.</p>
            ) : (
              <div className="space-y-3">
                {data.catatan.map((c, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-none ${c.role === "guru" ? "bg-primary/15 text-primary" : "bg-amber-100 text-amber-700"}`}>
                      {c.nama_pengguna?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div className="text-[11px] text-body/50">
                        {c.nama_pengguna ?? "?"} ({c.role === "guru" ? "Guru" : "Orang Tua"})
                      </div>
                      <p className="text-sm text-ink">{c.isi}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
