import { useCallback, useEffect, useState } from "react";
import AnakSelector from "../components/AnakSelector";
import { btnPrimary, cardCls, selectCls } from "../components/ui";
import { api } from "../lib/api";
import { useAnakSelection } from "../lib/anak";
import { getUser } from "../lib/auth";
import type { Catatan, Murid } from "../types";

function fmtWaktu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CatatanPage() {
  const user = getUser();
  const isOrtu = user?.role === "ortu";
  const [murid, setMurid] = useState<Murid[]>([]);
  const [muridId, setMuridId] = useState("");
  const [items, setItems] = useState<Catatan[]>([]);
  const [isi, setIsi] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIsi, setEditIsi] = useState("");

  const load = useCallback((id: string) => {
    api<Catatan[]>(`/catatan/murid/${id}`).then(setItems).catch(() => {});
    api(`/catatan/murid/${id}/baca`, { method: "POST" }).catch(() => {});
  }, []);

  const { anakId, pilih } = useAnakSelection(isOrtu ? murid : []);

  useEffect(() => {
    api<Murid[]>("/murid").then((m) => {
      setMurid(m);
      if (!isOrtu && m.length > 0) setMuridId(String(m[0].id));
    }).catch(() => {});
  }, [isOrtu]);

  useEffect(() => {
    if (isOrtu && anakId != null) setMuridId(String(anakId));
  }, [isOrtu, anakId]);

  useEffect(() => {
    if (muridId) load(muridId);
  }, [muridId, load]);

  const kirim = async () => {
    if (!muridId || !isi.trim()) return;
    try {
      await api("/catatan", {
        method: "POST",
        body: JSON.stringify({ murid_id: Number(muridId), isi: isi.trim() }),
      });
      setIsi("");
      load(muridId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal mengirim");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const mulaiEdit = (c: Catatan) => {
    setEditingId(c.id);
    setEditIsi(c.isi);
  };

  const simpanEdit = async () => {
    if (!editingId || !editIsi.trim()) return;
    try {
      await api(`/catatan/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ isi: editIsi.trim() }),
      });
      setEditingId(null);
      setEditIsi("");
      if (muridId) load(muridId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const batalEdit = () => {
    setEditingId(null);
    setEditIsi("");
  };

  const hapusCatatan = async (id: number) => {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await api(`/catatan/${id}`, { method: "DELETE" });
      if (muridId) load(muridId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menghapus");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black text-ink mb-1">Catatan Guru &amp; Orang Tua</h1>
      <p className="text-sm text-body/70 mb-6">
        Catatan perkembangan anak yang bisa dibalas dua arah antara guru dan orang tua.
      </p>

      {isOrtu && <AnakSelector murid={murid} value={anakId} onChange={pilih} />}

      {!isOrtu && (
        <div className="max-w-xs mb-5">
          <select
            className={selectCls}
            value={muridId}
            onChange={(e) => setMuridId(e.target.value)}
          >
            <option value="">Pilih murid</option>
            {murid.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {msg && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2">{msg}</div>
      )}

      <div className={`${cardCls} mb-5 max-h-[480px] overflow-y-auto`}>
        {items.length === 0 ? (
          <p className="text-sm text-body/60">Belum ada catatan. Mulai tulis catatan di bawah.</p>
        ) : (
          <div className="space-y-4">
            {items.map((c) => {
              const sendiri = c.pengguna_id === user?.id;
              const isGuru = c.role === "guru";
              return (
                <div key={c.id} className={`flex ${sendiri ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-3 ${
                      isGuru ? "bg-primary/10" : "bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-ink">{c.nama_pengguna ?? "?"}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          isGuru ? "bg-primary text-white" : "bg-amber-500 text-white"
                        }`}
                      >
                        {c.role}
                      </span>
                      <span className="text-[10px] text-body/50">{fmtWaktu(c.created_at)}</span>
                      {sendiri && editingId !== c.id && (
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => mulaiEdit(c)}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            <i className="ri-edit-line" /> Edit
                          </button>
                          <button
                            onClick={() => hapusCatatan(c.id)}
                            className="text-[11px] font-semibold text-red-500 hover:underline"
                          >
                            <i className="ri-delete-bin-line" /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                    {editingId === c.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                          rows={2}
                          value={editIsi}
                          onChange={(e) => setEditIsi(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={batalEdit} className="text-xs font-semibold text-body/60 hover:text-body px-2 py-1">Batal</button>
                          <button onClick={simpanEdit} disabled={!editIsi.trim()} className="text-xs font-semibold text-white bg-primary rounded-lg px-3 py-1 hover:bg-primary/90 disabled:opacity-50">Simpan</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-ink whitespace-pre-wrap">{c.isi}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`${cardCls} flex gap-3`}>
        <textarea
          className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
          rows={2}
          placeholder={isOrtu ? "Balas catatan guru..." : "Tulis catatan untuk orang tua..."}
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) kirim();
          }}
        />
        <button onClick={kirim} className={btnPrimary} disabled={!isi.trim()}>
          <i className="ri-send-plane-fill mr-1.5" />
          Kirim
        </button>
      </div>
    </div>
  );
}
