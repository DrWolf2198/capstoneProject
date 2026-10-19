import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MediaLightbox, { isVideoUrl } from "../components/MediaLightbox";
import MuridDetail from "../components/MuridDetail";
import { cardCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser } from "../lib/auth";
import type { Aspek, DistribusiResponse, Dokumentasi, Kategori, Kelas, Murid } from "../types";

export default function AdminGuruDashboard() {
  const user = getUser();
  const [murid, setMurid] = useState<Murid[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [aspek, setAspek] = useState<Aspek[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [distribusi, setDistribusi] = useState<DistribusiResponse | null>(null);
  const [guruCount, setGuruCount] = useState(0);
  const [detailMurid, setDetailMurid] = useState<Murid | null>(null);
  const [kegiatan, setKegiatan] = useState<Dokumentasi[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Dokumentasi | null>(null);

  useEffect(() => {
    api<Murid[]>("/murid").then(setMurid).catch(() => {});
    api<Kelas[]>("/kelas").then(setKelas).catch(() => {});
    api<Aspek[]>("/aspek").then(setAspek).catch(() => {});
    api<Kategori[]>("/kategori").then(setKategori).catch(() => {});
    api<DistribusiResponse>("/dashboard/distribusi").then(setDistribusi).catch(() => {});
    api<{ guru: number }>("/dashboard/stats").then((d) => setGuruCount(d.guru)).catch(() => {});
    api<Dokumentasi[]>("/dokumentasi").then(setKegiatan).catch(() => {});
  }, []);

  const kelasMap = useMemo(() => {
    const m: Record<number, string> = {};
    kelas.forEach((k) => (m[k.id] = k.nama));
    return m;
  }, [kelas]);

  const kategoriWarna = useMemo(() => {
    const m: Record<string, string> = {};
    kategori.forEach((k) => (m[k.nama] = k.warna));
    return m;
  }, [kategori]);

  const muridMap = useMemo(() => {
    const m: Record<number, string> = {};
    murid.forEach((s) => (m[s.id] = s.nama));
    return m;
  }, [murid]);

  const mediaKegiatan = kegiatan.filter((d) => d.url);

  const stats: { label: string; value: number; icon: string; to?: string }[] = [
    { label: "Murid", value: murid.length, icon: "ri-user-smile-line" },
    { label: "Kelas", value: kelas.length, icon: "ri-building-line" },
    { label: "Guru", value: guruCount, icon: "ri-team-line", to: "/data-master?tab=pengguna" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-body/70 mb-6">Halo, {user?.nama}. Berikut ringkasan data sekolah.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((s) => {
          const inner = (
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <i className={`${s.icon} text-xl`} />
              </div>
              <div>
                <div className="text-2xl font-black text-ink">{s.value}</div>
                <div className="text-sm text-body/70">{s.label}</div>
              </div>
            </div>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className={`${cardCls} hover:shadow-md transition cursor-pointer`}>
              {inner}
            </Link>
          ) : (
            <div key={s.label} className={cardCls}>{inner}</div>
          );
        })}
      </div>

      {distribusi && (
        <div className={cardCls + " mb-8"}>
          <h2 className="font-bold text-ink mb-1">Distribusi Capaian per Aspek Perkembangan</h2>
          <p className="text-sm text-body/60 mb-4">
            {distribusi.total_murid} murid — periode berjalan
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distribusi.rows}
                layout="vertical"
                margin={{ left: 90, right: 16, top: 8 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="aspek" width={90} tick={{ fontSize: 12, fill: "#334155" }} />
                <Tooltip />
                <Legend align="left" />
                {distribusi.kategori.map((k) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={kategoriWarna[k] ?? "#94a3b8"} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className={cardCls + " mb-8"}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-ink">Kegiatan Terbaru</h2>
          <Link to="/dokumentasi" className="text-xs font-semibold text-green-600 hover:underline">
            Lihat semua
          </Link>
        </div>
        {mediaKegiatan.length === 0 ? (
          <p className="text-sm text-body/50">Belum ada kegiatan yang diunggah.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {mediaKegiatan.slice(0, 6).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedMedia(d)}
                className="text-left group"
              >
                <div className="aspect-[7/5] rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center group-hover:opacity-90 transition">
                  {d.url && !isVideoUrl(d.url) ? (
                    <img src={d.url} alt={d.deskripsi ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <i className="ri-play-circle-line text-3xl text-slate-400" />
                  )}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-ink truncate">
                  {muridMap[d.murid_id] ?? "-"}
                </div>
                <div className="text-[11px] text-body/50 truncate">{d.deskripsi || d.tipe}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cardCls}>
        <h2 className="font-bold text-ink mb-4">Daftar Murid</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-body/60 border-b border-black/5">
              <th className="py-2.5 font-medium">Nama</th>
              <th className="py-2.5 font-medium">Kelas</th>
              <th className="py-2.5 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {murid.map((m) => (
              <tr key={m.id} className="border-b border-black/5 last:border-0">
                <td className="py-3 font-semibold text-ink">{m.nama}</td>
                <td className="py-3 text-body/70">{kelasMap[m.kelas_id ?? -1] ?? "-"}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setDetailMurid(m)}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {detailMurid && (
        <MuridDetail
          muridId={detailMurid.id}
          muridNama={detailMurid.nama}
          onClose={() => setDetailMurid(null)}
        />
      )}

      {selectedMedia?.url && (
        <MediaLightbox
          url={selectedMedia.url}
          deskripsi={selectedMedia.deskripsi}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
