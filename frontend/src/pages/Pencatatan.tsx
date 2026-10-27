import { useEffect, useMemo, useState } from "react";
import { cardCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser } from "../lib/auth";
import type { Aspek, Catatan, Kategori, Kelas, Murid, Pencatatan } from "../types";

interface PenilaianItem {
  kategori: string | null;
  deskripsi: string;
}

function fmtTanggal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtWaktu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date {
  return new Date(s + "T00:00:00");
}

/** Senin dari minggu yang memuat tanggal d (Senin–Sabtu). */
function mondayOf(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0=Minggu .. 6=Sabtu
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** 6 hari sekolah (Senin–Sabtu) dari awal minggu. */
function getWeekDates(weekStart: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 6; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** n minggu terakhir (terlama dulu, minggu ini terakhir). */
function getRecentWeeks(n: number): Date[] {
  const current = mondayOf(new Date());
  const weeks: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(d.getDate() - i * 7);
    weeks.push(d);
  }
  return weeks;
}

function fmtWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 5);
  const f = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${f(weekStart)} – ${f(end)}`;
}

export default function Pencatatan() {
  const user = getUser();
  const [murid, setMurid] = useState<Murid[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [aspek, setAspek] = useState<Aspek[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [kelasFilter, setKelasFilter] = useState<number | null>(null);
  const [byDate, setByDate] = useState<Record<string, Record<number, PenilaianItem>>>({});
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateStr(new Date()));
  const [orangTua, setOrangTua] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [popupError, setPopupError] = useState<string | null>(null);
  const [catatan, setCatatan] = useState<Catatan[]>([]);
  const [isiCatatan, setIsiCatatan] = useState("");
  const [msgCatatan, setMsgCatatan] = useState("");
  const [editingCatatanId, setEditingCatatanId] = useState<number | null>(null);
  const [editCatatanIsi, setEditCatatanIsi] = useState("");

  useEffect(() => {
    api<Murid[]>("/murid").then(setMurid).catch(() => {});
    api<Kelas[]>("/kelas")
      .then((k) => {
        setKelas(k);
        setKelasFilter((prev) => prev ?? (k[0]?.id ?? null));
      })
      .catch(() => {});
    api<Aspek[]>("/aspek").then(setAspek).catch(() => {});
    api<Kategori[]>("/kategori").then(setKategori).catch(() => {});
  }, []);

  const kelasMap = useMemo(() => {
    const m: Record<number, string> = {};
    kelas.forEach((k) => (m[k.id] = k.nama));
    return m;
  }, [kelas]);

  const filteredMurid = useMemo(
    () => murid.filter((m) => (m.kelas_id ?? -1) === kelasFilter),
    [murid, kelasFilter],
  );

  const weeks = useMemo(() => getRecentWeeks(8), []);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const selected = murid.find((m) => m.id === selectedId) ?? null;
  const penilaian = byDate[selectedDate] ?? {};

  const pilihMurid = (m: Murid) => {
    setSelectedId(m.id);
    setOrangTua(null);
    setByDate({});
    api<Pencatatan[]>(`/pencatatan/murid/${m.id}`)
      .then((rows) => {
        const grouped: Record<string, Record<number, PenilaianItem>> = {};
        rows.forEach((r) => {
          const d = (r.tanggal ?? "").slice(0, 10);
          if (!d) return;
          const entry = (grouped[d] ??= {});
          entry[r.aspek_id] = { kategori: r.kategori ?? null, deskripsi: r.deskripsi ?? "" };
        });
        setByDate(grouped);
      })
      .catch(() => {});
    api<{ orang_tua: string | null }>(`/dashboard/murid/${m.id}/ringkasan`)
      .then((d) => setOrangTua(d.orang_tua))
      .catch(() => {});
    api<Catatan[]>(`/catatan/murid/${m.id}`).then(setCatatan).catch(() => {});
    api(`/catatan/murid/${m.id}/baca`, { method: "POST" }).catch(() => {});
  };

  const pilihWeek = (weekStartStr: string) => {
    const ws = parseDateStr(weekStartStr);
    setWeekStart(ws);
    const days = getWeekDates(ws);
    const todayStr = toDateStr(new Date());
    const todayInWeek = days.some((d) => toDateStr(d) === todayStr);
    setSelectedDate(todayInWeek ? todayStr : toDateStr(days[0]));
  };

  const setLevel = (aspekId: number, kategori: string) => {
    setByDate((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] ?? {}),
        [aspekId]: { ...(prev[selectedDate]?.[aspekId] ?? { kategori: null, deskripsi: "" }), kategori },
      },
    }));
  };

  const setNote = (aspekId: number, deskripsi: string) => {
    setByDate((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] ?? {}),
        [aspekId]: { ...(prev[selectedDate]?.[aspekId] ?? { kategori: null, deskripsi: "" }), deskripsi },
      },
    }));
  };

  const simpan = async () => {
    if (!selectedId) return;
    const items = aspek
      .map((a) => {
        const p = penilaian[a.id];
        return {
          aspek_id: a.id,
          kategori: p?.kategori ?? null,
          deskripsi: p?.deskripsi ?? "",
        };
      })
      .filter((it) => it.kategori);
    if (items.length === 0) {
      setPopupError("Pilih level penilaian minimal satu aspek sebelum menyimpan.");
      return;
    }
    try {
      await api("/pencatatan/bulk", {
        method: "POST",
        body: JSON.stringify({ murid_id: selectedId, tanggal: selectedDate, items }),
      });
      setMsg("Penilaian berhasil disimpan");
      setTimeout(() => setMsg(""), 2400);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  const kirimCatatan = async () => {
    if (!selectedId || !isiCatatan.trim()) return;
    try {
      await api("/catatan", {
        method: "POST",
        body: JSON.stringify({ murid_id: selectedId, isi: isiCatatan.trim() }),
      });
      setIsiCatatan("");
      api<Catatan[]>(`/catatan/murid/${selectedId}`).then(setCatatan).catch(() => {});
    } catch (err) {
      setMsgCatatan(err instanceof Error ? err.message : "Gagal mengirim");
      setTimeout(() => setMsgCatatan(""), 2500);
    }
  };

  const mulaiEditCatatan = (c: Catatan) => {
    setEditingCatatanId(c.id);
    setEditCatatanIsi(c.isi);
  };

  const simpanEditCatatan = async () => {
    if (!editingCatatanId || !editCatatanIsi.trim()) return;
    try {
      await api(`/catatan/${editingCatatanId}`, {
        method: "PUT",
        body: JSON.stringify({ isi: editCatatanIsi.trim() }),
      });
      setEditingCatatanId(null);
      setEditCatatanIsi("");
      if (selectedId) api<Catatan[]>(`/catatan/murid/${selectedId}`).then(setCatatan).catch(() => {});
    } catch (err) {
      setMsgCatatan(err instanceof Error ? err.message : "Gagal menyimpan");
      setTimeout(() => setMsgCatatan(""), 2500);
    }
  };

  const batalEditCatatan = () => {
    setEditingCatatanId(null);
    setEditCatatanIsi("");
  };

  const hapusCatatan = async (id: number) => {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await api(`/catatan/${id}`, { method: "DELETE" });
      if (selectedId) api<Catatan[]>(`/catatan/murid/${selectedId}`).then(setCatatan).catch(() => {});
    } catch (err) {
      setMsgCatatan(err instanceof Error ? err.message : "Gagal menghapus");
      setTimeout(() => setMsgCatatan(""), 2500);
    }
  };

  const selectedDateLabel = parseDateStr(selectedDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink">Penilaian Perkembangan</h1>
        <button
          onClick={simpan}
          disabled={!selected}
          className="bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simpan Penilaian
        </button>
      </div>
      <p className="text-sm text-body/70 mb-6">
        Nilai murid per aspek perkembangan dengan skala 4 level, dikelompokkan per minggu.
      </p>

      {msg && (
        <div className="mb-4 text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <div className={cardCls}>
          <h2 className="font-bold text-ink mb-4">Murid</h2>
          <div className="mb-4">
            <label htmlFor="kelas" className="text-xs font-medium text-body/60 block mb-1.5">
              Kelas
            </label>
            <select
              id="kelas"
              value={kelasFilter ?? ""}
              onChange={(e) => setKelasFilter(Number(e.target.value))}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
            >
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            {filteredMurid.map((m) => (
              <button
                key={m.id}
                onClick={() => pilihMurid(m)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedId === m.id
                    ? "bg-primary text-white font-semibold"
                    : "hover:bg-black/5 text-body"
                }`}
              >
                {m.nama}
              </button>
            ))}
            {filteredMurid.length === 0 && (
              <p className="text-xs text-body/40 px-3">Belum ada murid</p>
            )}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className={`${cardCls} text-center py-16 text-body/50`}>
              Pilih murid untuk mulai menilai.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {weekDates.map((d) => {
                    const ds = toDateStr(d);
                    const active = selectedDate === ds;
                    const hasData = Object.keys(byDate[ds] ?? {}).length > 0;
                    return (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => setSelectedDate(ds)}
                        className={`flex flex-col items-center gap-0.5 min-w-[52px] px-3 py-2 rounded-xl border transition ${
                          active
                            ? "bg-primary text-white border-transparent"
                            : "bg-white text-body border-black/10 hover:bg-black/5"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wide opacity-70">
                          {d.toLocaleDateString("id-ID", { weekday: "short" })}
                        </span>
                        <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${hasData ? "bg-accent" : "bg-transparent"}`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <label htmlFor="week" className="text-xs font-medium text-body/60 whitespace-nowrap">
                    Minggu
                  </label>
                  <select
                    id="week"
                    value={toDateStr(weekStart)}
                    onChange={(e) => pilihWeek(e.target.value)}
                    className="border border-black/10 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                  >
                    {weeks.map((w) => (
                      <option key={toDateStr(w)} value={toDateStr(w)}>
                        {fmtWeekLabel(w)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`${cardCls} mb-5`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-lg">
                    {selected.nama.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <h2 className="font-bold text-ink">{selected.nama}</h2>
                    <p className="text-xs text-body/50 truncate">
                      {kelasMap[selected.kelas_id ?? -1] ?? "-"}
                      {selected.tanggal_lahir ? ` • Lahir ${fmtTanggal(selected.tanggal_lahir)}` : ""}
                      {orangTua ? ` • Orang tua: ${orangTua}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink whitespace-nowrap">
                    {selectedDateLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {aspek.map((a) => {
                  const p = penilaian[a.id];
                  return (
                    <div key={a.id} className={cardCls}>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-ink text-sm">{a.nama}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {kategori.map((l) => {
                            const active = p?.kategori === l.nama;
                            return (
                              <button
                                key={l.id}
                                onClick={() => setLevel(a.id, l.nama)}
                                style={
                                  active
                                    ? { background: l.warna, borderColor: "transparent", color: "#fff" }
                                    : undefined
                                }
                                className="min-w-[44px] border border-[#e2e8f0] rounded-md bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#64748b] transition"
                              >
                                {l.nama}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <textarea
                        value={p?.deskripsi ?? ""}
                        onChange={(e) => setNote(a.id, e.target.value)}
                        placeholder="Catatan pengamatan..."
                        rows={2}
                        className="w-full border border-[#e2e8f0] rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#475569] focus:outline-none focus:border-primary resize-y"
                      />
                    </div>
                  );
                })}
              </div>

              <div className={`${cardCls} mt-6`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="font-bold text-ink">Catatan Guru ↔ Orang Tua</h2>
                  {msgCatatan && <span className="text-xs text-red-600">{msgCatatan}</span>}
                </div>

                {catatan.length === 0 ? (
                  <p className="text-sm text-body/50">Belum ada catatan untuk murid ini.</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {catatan.map((c) => {
                      const isGuru = c.role === "guru";
                      const sendiri = c.pengguna_id === user?.id;
                      return (
                        <div key={c.id} className="flex gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-none ${
                              isGuru ? "bg-primary/15 text-primary" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {c.nama_pengguna?.charAt(0) ?? "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-body/50">
                                {c.nama_pengguna ?? "?"} · {fmtWaktu(c.created_at)}
                              </span>
                              {sendiri && editingCatatanId !== c.id && (
                                <div className="ml-auto flex items-center gap-2">
                                  <button onClick={() => mulaiEditCatatan(c)} className="text-[11px] font-semibold text-primary hover:underline">
                                    <i className="ri-edit-line" /> Edit
                                  </button>
                                  <button onClick={() => hapusCatatan(c.id)} className="text-[11px] font-semibold text-red-500 hover:underline">
                                    <i className="ri-delete-bin-line" /> Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingCatatanId === c.id ? (
                              <div className="space-y-2 mt-1">
                                <textarea
                                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                                  rows={2}
                                  value={editCatatanIsi}
                                  onChange={(e) => setEditCatatanIsi(e.target.value)}
                                  autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={batalEditCatatan} className="text-xs font-semibold text-body/60 hover:text-body px-2 py-1">Batal</button>
                                  <button onClick={simpanEditCatatan} disabled={!editCatatanIsi.trim()} className="text-xs font-semibold text-white bg-primary rounded-lg px-3 py-1 hover:bg-primary/90 disabled:opacity-50">Simpan</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-ink">{c.isi}</p>
                            )}
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
                    placeholder="Tulis catatan untuk orang tua..."
                    value={isiCatatan}
                    onChange={(e) => setIsiCatatan(e.target.value)}
                  />
                  <button
                    onClick={kirimCatatan}
                    disabled={!isiCatatan.trim()}
                    className="bg-green-600 text-white rounded-lg px-4 text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {popupError && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPopupError(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-none">
                <i className="ri-error-warning-line text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-ink mb-1">Perhatian</h3>
                <p className="text-sm text-body/80">{popupError}</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setPopupError(null)} className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/80 transition">
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
