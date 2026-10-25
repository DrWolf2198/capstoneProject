import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AnakSelector from "../components/AnakSelector";
import MediaLightbox, { isPdfUrl, isVideoUrl } from "../components/MediaLightbox";
import WeekPicker, { toDateStr } from "../components/WeekPicker";
import { cardCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { useAnakSelection } from "../lib/anak";
import { getUser } from "../lib/auth";
import type { Murid, RiwayatItem } from "../types";

const TIPE_ICON: Record<string, string> = {
  foto: "ri-camera-line",
  video: "ri-video-line",
  hasil_karya: "ri-artboard-line",
  catatan_observasi: "ri-quill-pen-line",
};

export default function Riwayat() {
  const user = getUser();
  const isOrtu = user?.role === "ortu";
  const [searchParams] = useSearchParams();
  const [murid, setMurid] = useState<Murid[]>([]);
  const [muridId, setMuridId] = useState("");
  const [items, setItems] = useState<RiwayatItem[]>([]);
  const { anakId, pilih } = useAnakSelection(isOrtu ? murid : []);
  const [selectedMedia, setSelectedMedia] = useState<RiwayatItem | null>(null);

  const initialTanggal = searchParams.get("tanggal");
  const [selectedDate, setSelectedDate] = useState(() =>
    initialTanggal && /^\d{4}-\d{2}-\d{2}$/.test(initialTanggal) ? initialTanggal : toDateStr(new Date())
  );

  useEffect(() => {
    const initial = searchParams.get("murid");
    api<Murid[]>("/murid")
      .then((m) => {
        setMurid(m);
        if (isOrtu) return;
        if (initial && m.some((x) => String(x.id) === initial)) {
          setMuridId(initial);
        } else if (m.length > 0) {
          setMuridId(String(m[0].id));
        }
      })
      .catch(() => {});
  }, [searchParams, isOrtu]);

  useEffect(() => {
    if (isOrtu && anakId != null) setMuridId(String(anakId));
  }, [isOrtu, anakId]);

  useEffect(() => {
    if (muridId) {
      api<{ items: RiwayatItem[] }>(`/riwayat/murid/${muridId}`)
        .then((d) => setItems(d.items))
        .catch(() => {});
    }
  }, [muridId]);

  const itemsHariIni = items.filter((r) => r.tanggal === selectedDate);

  return (
    <div>
      <h1 className="text-2xl font-black text-ink mb-1">Riwayat Perkembangan</h1>
      <p className="text-sm text-body/70 mb-6">
        {user?.role === "ortu"
          ? "Riwayat perkembangan dan aktivitas anak kamu."
          : "Riwayat perkembangan dan aktivitas per murid."}
      </p>

      {isOrtu && <AnakSelector murid={murid} value={anakId} onChange={pilih} />}

      {!isOrtu && (
        <div className="max-w-xs mb-6">
          <select className={selectCls} value={muridId} onChange={(e) => setMuridId(e.target.value)}>
            <option value="">Pilih murid</option>
            {murid.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <WeekPicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className={cardCls}>
        {itemsHariIni.length === 0 ? (
          <p className="text-sm text-body/60">Belum ada aktivitas tercatat pada hari ini.</p>
        ) : (
          <ol className="relative border-l border-black/10 ml-2">
            {itemsHariIni.map((r, i) => (
              <li key={i} className="mb-6 ml-6">
                <span className="absolute -left-[7px] mt-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white" />
                <div className="text-xs text-body/50">{r.tanggal}</div>
                <div className="flex items-center gap-2 mt-1">
                  {r.jenis === "dokumentasi" && (
                    <i className={`${TIPE_ICON[r.tipe ?? ""] ?? "ri-file-line"} text-primary`} />
                  )}
                  <span className="font-semibold text-ink">
                    {r.jenis === "pencatatan" ? r.aspek : `Dokumentasi ${r.tipe?.replace("_", " ")}`}
                  </span>
                  {r.kategori && (
                    <span className="px-2 py-0.5 bg-accent text-ink text-xs font-semibold rounded">{r.kategori}</span>
                  )}
                </div>
                {r.deskripsi && <p className="mt-1 text-sm text-body/70">{r.deskripsi}</p>}
                {r.jenis === "dokumentasi" && r.url && (
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(r)}
                    className="mt-2 block rounded-lg overflow-hidden bg-slate-200 hover:opacity-90 transition"
                  >
                    {isVideoUrl(r.url) ? (
                      <span className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
                        <i className="ri-play-circle-line text-xl" /> Putar video
                      </span>
                    ) : isPdfUrl(r.url) ? (
                      <span className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
                        <i className="ri-file-pdf-line text-xl" /> Buka PDF
                      </span>
                    ) : (
                      <img src={r.url} alt={r.deskripsi ?? ""} className="max-w-[240px] aspect-[7/5] object-cover" />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
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
