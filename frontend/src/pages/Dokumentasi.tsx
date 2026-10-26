import { useEffect, useMemo, useState } from "react";
import { btnPrimary, cardCls, inputCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import MediaLightbox from "../components/MediaLightbox";
import type { Dokumentasi, Kelas, Murid, SesiKelas } from "../types";

const TIPE: { id: string; label: string; icon: string; accept?: string }[] = [
  { id: "foto", label: "Foto", icon: "ri-camera-line", accept: "image/*" },
  { id: "video", label: "Video", icon: "ri-video-line", accept: "video/*" },
  { id: "hasil_karya", label: "Hasil Karya", icon: "ri-artboard-line", accept: "image/*,.pdf" },
  { id: "catatan_observasi", label: "Catatan Observasi", icon: "ri-quill-pen-line" },
];

const HARI = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

function ActivityCard({ sesi, onDelete }: { sesi: SesiKelas; onDelete: () => void }) {
  const [tema, setTema] = useState(sesi.tema ?? "");
  const [deskripsi, setDeskripsi] = useState(sesi.deskripsi ?? "");
  const [msg, setMsg] = useState("");

  const simpan = async () => {
    try {
      await api(`/sesi/${sesi.id}`, {
        method: "PUT",
        body: JSON.stringify({ tema, deskripsi }),
      });
      setMsg("Tersimpan");
      setTimeout(() => setMsg(""), 1500);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  const hapus = async () => {
    if (!confirm("Hapus aktivitas ini?")) return;
    try {
      await api(`/sesi/${sesi.id}`, { method: "DELETE" });
      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  return (
    <div className="border border-black/10 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          className={inputCls}
          placeholder="Tema aktivitas (mis. Mengenal angka 1-10)"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />
        <button onClick={hapus} className="text-red-500 hover:text-red-700 shrink-0" aria-label="Hapus aktivitas">
          <i className="ri-delete-bin-line text-lg" />
        </button>
      </div>
      <textarea
        className={inputCls}
        rows={2}
        placeholder="Deskripsi aktivitas"
        value={deskripsi}
        onChange={(e) => setDeskripsi(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <button onClick={simpan} className="text-sm font-semibold text-primary hover:underline">
          Simpan
        </button>
        {msg && <span className="text-xs text-body/50">{msg}</span>}
      </div>
    </div>
  );
}

export default function WeeklyActivities() {
  const [today] = useState(() => new Date());
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [murid, setMurid] = useState<Murid[]>([]);
  const [fKelas, setFKelas] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(today));

  const [activities, setActivities] = useState<SesiKelas[]>([]);

  const [dokumentasi, setDokumentasi] = useState<Dokumentasi[]>([]);
  const [uploadMuridId, setUploadMuridId] = useState("");
  const [tipe, setTipe] = useState("foto");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<Dokumentasi | null>(null);

  const weekDates = useMemo(() => {
    const monday = startOfWeek(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 6 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return x;
    });
  }, [today, weekOffset]);

  const muridMap = useMemo(() => {
    const m: Record<number, string> = {};
    murid.forEach((x) => (m[x.id] = x.nama));
    return m;
  }, [murid]);

  useEffect(() => {
    api<Kelas[]>("/kelas")
      .then((k) => {
        setKelas(k);
        if (k[0] && !fKelas) setFKelas(String(k[0].id));
      })
      .catch(() => {});
    api<Murid[]>("/murid").then(setMurid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fKelas || !selectedDate) return;
    api<SesiKelas[]>(`/sesi?kelas_id=${fKelas}&tanggal=${selectedDate}`).then(setActivities).catch(() => {});
    api<Dokumentasi[]>(`/dokumentasi?tanggal=${selectedDate}`).then(setDokumentasi).catch(() => {});
  }, [fKelas, selectedDate]);

  const tipeAktif = TIPE.find((t) => t.id === tipe)!;
  const butuhBerkas = tipe !== "catatan_observasi";
  const isImage = tipe === "foto" || (tipe === "hasil_karya" && /\.(png|jpe?g|webp|gif)$/i.test(url));

  const tambahAktivitas = async () => {
    try {
      const s = await api<SesiKelas>("/sesi", {
        method: "POST",
        body: JSON.stringify({ kelas_id: Number(fKelas), tanggal: selectedDate, tema: "", deskripsi: "" }),
      });
      setActivities((prev) => [...prev, s]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menambah aktivitas");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const hapusAktivitas = (id: number) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const hapusDokumentasi = async (id: number) => {
    if (!confirm("Hapus dokumentasi ini?")) return;
    try {
      await api(`/dokumentasi/${id}`, { method: "DELETE" });
      setDokumentasi((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ url: string; nama: string }>("/dokumentasi/upload", {
        method: "POST",
        body: fd,
      });
      setUrl(res.url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const simpanDokumentasi = async () => {
    if (!uploadMuridId) {
      setMsg("Pilih murid dulu");
      return;
    }
    if (butuhBerkas && !url) {
      setMsg("Upload berkas dulu");
      return;
    }
    try {
      await api("/dokumentasi", {
        method: "POST",
        body: JSON.stringify({
          murid_id: Number(uploadMuridId),
          tipe,
          url: url || null,
          deskripsi: desc,
          tanggal: selectedDate,
        }),
      });
      setUrl("");
      setDesc("");
      setUploadMuridId("");
      setMsg("Dokumentasi tersimpan");
      setTimeout(() => setMsg(""), 2000);
      api<Dokumentasi[]>(`/dokumentasi?tanggal=${selectedDate}`).then(setDokumentasi).catch(() => {});
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  const mingguLabel = `${weekDates[0].getDate()} - ${weekDates[5].getDate()} ${weekDates[0].toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink">Weekly Activities</h1>
      </div>
      <p className="text-sm text-body/70 mb-6">
        Catat aktivitas harian per kelas + unggah dokumentasi tiap harinya.
      </p>

      {msg && <div className="mb-4 text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msg}</div>}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[160px]">
          <label className="block text-xs text-body/60 mb-1">Kelas</label>
          <select className={selectCls} value={fKelas} onChange={(e) => setFKelas(e.target.value)}>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-9 h-9 rounded-lg border border-black/10 hover:bg-black/5 text-body flex items-center justify-center"
            aria-label="Minggu sebelumnya"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <div className="text-sm font-semibold text-ink whitespace-nowrap">{mingguLabel}</div>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-9 h-9 rounded-lg border border-black/10 hover:bg-black/5 text-body flex items-center justify-center"
            aria-label="Minggu berikutnya"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {weekDates.map((d, i) => {
          const ds = toDateStr(d);
          const active = selectedDate === ds;
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] px-3 py-2 rounded-xl border transition ${
                active ? "bg-primary text-white border-transparent" : "bg-white text-body border-black/10 hover:bg-black/5"
              }`}
            >
              <span className="text-[11px] font-semibold opacity-80">{HARI[i]}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-ink">Aktivitas Hari Ini</h2>
            <button
              onClick={tambahAktivitas}
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <i className="ri-add-line" /> Tambah Aktivitas
            </button>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-body/50">Belum ada aktivitas. Klik "Tambah Aktivitas" untuk menambah.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((s) => (
                <ActivityCard key={s.id} sesi={s} onDelete={() => hapusAktivitas(s.id)} />
              ))}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <h2 className="font-bold text-ink mb-4">Unggah Dokumentasi</h2>
          <div className="space-y-3">
            <select className={selectCls} value={uploadMuridId} onChange={(e) => setUploadMuridId(e.target.value)}>
              <option value="">Pilih murid</option>
              {murid
                .filter((m) => m.kelas_id === Number(fKelas))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {TIPE.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTipe(t.id);
                    if (t.id === "catatan_observasi") setUrl("");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                    tipe === t.id ? "border-primary bg-primary/10 text-primary" : "border-black/10 text-body/70 hover:bg-black/5"
                  }`}
                >
                  <i className={t.icon} /> {t.label}
                </button>
              ))}
            </div>
            {butuhBerkas && (
              <>
                <input
                  type="file"
                  accept={tipeAktif.accept}
                  onChange={onFileChange}
                  className="block w-full text-sm text-body/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold hover:file:bg-primary-dark cursor-pointer"
                />
                <p className="text-[11px] text-body/40 mt-1">Ukuran file maks. 20 MB</p>
              </>
            )}
            {uploading && <p className="text-sm text-body/60">Mengupload...</p>}
            {url && isImage && (
              <img src={url} alt="Pratinjau" className="w-full aspect-[7/5] object-cover rounded-lg border border-black/10" />
            )}
            <textarea className={inputCls} rows={2} placeholder="Keterangan" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <button className={btnPrimary} onClick={simpanDokumentasi}>
              Simpan Dokumentasi
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-bold text-ink mb-3">Dokumentasi {selectedDate}</h2>
        {dokumentasi.length === 0 ? (
          <p className="text-sm text-body/50">Belum ada dokumentasi pada hari ini.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dokumentasi.map((d) => (
              <div key={d.id} className="relative group">
                <button onClick={() => d.url && setLightbox(d)} className="text-left w-full">
                  <div className="aspect-[7/5] rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center group-hover:opacity-90 transition">
                    {d.url && d.tipe === "foto" ? (
                      <img src={d.url} alt={d.deskripsi ?? ""} className="w-full h-full object-cover" />
                    ) : d.url && d.tipe === "video" ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <i className="ri-play-circle-fill text-4xl text-white" />
                      </div>
                    ) : (
                      <i className={`${TIPE.find((t) => t.id === d.tipe)?.icon ?? "ri-file-line"} text-3xl text-body/40`} />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-sm font-semibold text-ink truncate">{muridMap[d.murid_id] ?? "Murid"}</div>
                    <div className="text-[11px] text-body/50 capitalize truncate">{d.tipe.replace("_", " ")}</div>
                  </div>
                </button>
                <button
                  onClick={() => hapusDokumentasi(d.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="Hapus"
                  title="Hapus"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <MediaLightbox url={lightbox.url ?? ""} deskripsi={lightbox.deskripsi} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
