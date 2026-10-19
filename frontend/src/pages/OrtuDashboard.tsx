import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import AnakSelector from "../components/AnakSelector";
import MediaLightbox from "../components/MediaLightbox";
import { cardCls } from "../components/ui";
import { api } from "../lib/api";
import { useAnakSelection } from "../lib/anak";
import { getUser } from "../lib/auth";
import type { Catatan, Dokumentasi, Kelas, Murid, RekapKehadiran, RingkasanMurid } from "../types";

function fmtTanggal(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtHariIni(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtWaktu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrtuDashboard() {
  const user = getUser();
  const [murid, setMurid] = useState<Murid[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanMurid | null>(null);
  const [dokumentasi, setDokumentasi] = useState<Dokumentasi[]>([]);
  const [catatan, setCatatan] = useState<Catatan[]>([]);
  const [unread, setUnread] = useState(0);
  const [rekapKehadiran, setRekapKehadiran] = useState<RekapKehadiran | null>(null);
  const [isi, setIsi] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Dokumentasi | null>(null);

  useEffect(() => {
    api<Murid[]>("/murid").then(setMurid).catch(() => {});
    api<Kelas[]>("/kelas").then(setKelas).catch(() => {});
  }, []);

  const { anakId, pilih } = useAnakSelection(murid);

  const load = useCallback(() => {
    if (!anakId) return;
    api<RingkasanMurid>(`/dashboard/murid/${anakId}/ringkasan`)
      .then(setRingkasan)
      .catch(() => {});
    api<Dokumentasi[]>(`/dokumentasi/murid/${anakId}`).then(setDokumentasi).catch(() => {});
    api<Catatan[]>(`/catatan/murid/${anakId}`).then(setCatatan).catch(() => {});
    api<{ unread: number }>(`/catatan/murid/${anakId}/unread`)
      .then((d) => setUnread(d.unread))
      .catch(() => {});
    const now = new Date();
    const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    api<RekapKehadiran>(`/sesi/absensi/murid/${anakId}/rekap?bulan=${bulan}`)
      .then(setRekapKehadiran)
      .catch(() => {});
  }, [anakId]);

  useEffect(() => {
    load();
  }, [load]);

  const kelasNama = kelas.find((k) => k.id === murid[0]?.kelas_id)?.nama ?? "-";
  const media = dokumentasi.filter((d) => d.tipe !== "catatan_observasi");

  const tertinggi = useMemo(() => {
    if (!ringkasan || ringkasan.radar.length === 0) return null;
    return [...ringkasan.radar].sort((a, b) => b.level - a.level)[0];
  }, [ringkasan]);

  const kirimBalasan = async () => {
    if (!anakId || !isi.trim()) return;
    try {
      await api("/catatan", {
        method: "POST",
        body: JSON.stringify({ murid_id: anakId, isi: isi.trim() }),
      });
      setIsi("");
      await api(`/catatan/murid/${anakId}/baca`, { method: "POST" });
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal mengirim");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const kpi = [
    {
      label: "Kehadiran Bulan Ini",
      value: rekapKehadiran?.persentase != null ? `${rekapKehadiran.persentase}%` : "—",
      sub: rekapKehadiran?.total
        ? `${rekapKehadiran.hadir} dari ${rekapKehadiran.total} hari`
        : "belum ada data absensi",
      accent: "bg-green-500",
    },
    {
      label: "Penilaian Terakhir",
      value: tertinggi?.kategori ?? "—",
      sub: tertinggi ? `${tertinggi.aspek}: ${tertinggi.kategori}` : "belum ada penilaian",
      accent: "bg-indigo-500",
    },
    {
      label: "Media Baru",
      value: media.length,
      sub: "total dokumentasi",
      accent: "bg-purple-500",
    },
    {
      label: "Catatan Belum Dibaca",
      value: unread,
      sub: "dari guru",
      accent: "bg-amber-500",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Halo, {user?.nama} 👋</h1>
          <p className="text-sm text-body/70 mt-0.5">
            Perkembangan {ringkasan?.murid.nama ?? murid[0]?.nama ?? "anak"} — {kelasNama}
          </p>
        </div>
        <div className="text-xs font-medium text-body/70 bg-white border border-black/10 rounded-lg px-3 py-2">
          {fmtHariIni()}
        </div>
      </div>

      <AnakSelector murid={murid} value={anakId} onChange={pilih} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpi.map((k) => (
          <div key={k.label} className={cardCls + " !p-0"}>
            <div className="px-5 pt-5 pb-4">
              <div className={`w-9 h-1 rounded ${k.accent} mb-3`} />
              <div className="text-xs font-medium text-body/60">{k.label}</div>
              <div className="text-2xl font-black text-ink">{k.value}</div>
              <div className="text-[11px] text-body/40 mt-0.5">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 mb-6">
        <div className={cardCls}>
          <h2 className="font-bold text-ink">Profil Perkembangan</h2>
          <p className="text-xs text-body/50 mb-3">
            Penilaian terakhir — {fmtTanggal(ringkasan?.penilaian_terakhir)}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={ringkasan?.radar ?? []} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="aspek" tick={{ fontSize: 11, fill: "#334155" }} />
                <PolarRadiusAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 10 }} />
                <Radar dataKey="level" stroke="#3b97bc" fill="#3b97bc" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-bold text-ink">Dokumentasi Terbaru</h2>
            <Link to="/riwayat" className="text-xs font-semibold text-green-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          {media.length === 0 ? (
            <p className="text-sm text-body/50">Belum ada dokumentasi.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => d.url && setSelectedMedia(d)}
                  disabled={!d.url}
                  className="aspect-[7/5] rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center hover:opacity-90 transition disabled:cursor-default"
                >
                  {d.tipe === "foto" && d.url ? (
                    <img src={d.url} alt={d.deskripsi ?? ""} className="w-full h-full object-cover" />
                  ) : d.tipe === "video" ? (
                    <i className="ri-play-circle-line text-4xl text-slate-400" />
                  ) : d.url ? (
                    <img src={d.url} alt={d.deskripsi ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <i className="ri-image-line text-3xl text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          )}
          {media[0] && (
            <p className="text-[11px] text-body/40 mt-2">
              {media[0].deskripsi || media[0].tipe} — {fmtTanggal(media[0].tanggal)}
            </p>
          )}
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-ink">Catatan dari Guru</h2>
          {msg && <span className="text-xs text-red-600">{msg}</span>}
        </div>

        {catatan.length === 0 ? (
          <p className="text-sm text-body/50">Belum ada catatan.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {catatan.map((c) => {
              const isGuru = c.role === "guru";
              return (
                <div key={c.id} className="flex gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-none ${
                      isGuru ? "bg-primary/15 text-primary" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.nama_pengguna?.charAt(0) ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-body/50">
                      {c.nama_pengguna ?? "?"}
                      {c.pengguna_id === user?.id ? " (Anda)" : ""} · {fmtWaktu(c.created_at)}
                    </div>
                    <p className="text-sm text-ink">{c.isi}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            rows={2}
            placeholder="Tulis balasan untuk guru..."
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
          />
          <button
            onClick={kirimBalasan}
            disabled={!isi.trim()}
            className="bg-green-600 text-white rounded-lg px-4 text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Balas
          </button>
        </div>
      </div>

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
