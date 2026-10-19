import { useEffect, useState } from "react";
import { btnPrimary, cardCls, inputCls } from "../components/ui";
import { api } from "../lib/api";
import { getUser, setUser } from "../lib/auth";
import type { Pengguna } from "../types";

export default function Profil() {
  const user = getUser();
  const [nama, setNama] = useState(user?.nama ?? "");
  const [noHp, setNoHp] = useState(user?.no_hp ?? "");
  const [msg, setMsg] = useState("");

  const [pwLama, setPwLama] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [msgPw, setMsgPw] = useState("");

  useEffect(() => {
    api<Pengguna>("/auth/me")
      .then((u) => {
        setNama(u.nama ?? "");
        setNoHp(u.no_hp ?? "");
      })
      .catch(() => {});
  }, []);

  const simpan = async () => {
    try {
      const u = await api<Pengguna>("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ nama, no_hp: noHp || null }),
      });
      setUser(u);
      setMsg("Profil tersimpan");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  const gantiPassword = async () => {
    if (!pwLama || !pwBaru) {
      setMsgPw("Isi password lama dan baru");
      return;
    }
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ password_lama: pwLama, password_baru: pwBaru }),
      });
      setPwLama("");
      setPwBaru("");
      setMsgPw("Password berhasil diubah");
      setTimeout(() => setMsgPw(""), 2500);
    } catch (err) {
      setMsgPw(err instanceof Error ? err.message : "Gagal mengubah password");
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-black text-ink mb-1">Profil</h1>
      <p className="text-sm text-body/70 mb-6">Kelola data diri dan password akun.</p>

      <div className={`${cardCls} space-y-4`}>
        <h2 className="font-bold text-ink">Data Diri</h2>
        {msg && <div className="text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msg}</div>}
        <div>
          <label className="text-xs font-medium text-body/60 block mb-1.5">Email</label>
          <input className={`${inputCls} opacity-60`} value={user?.email ?? ""} disabled />
        </div>
        <div>
          <label className="text-xs font-medium text-body/60 block mb-1.5">Nama</label>
          <input className={inputCls} value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-body/60 block mb-1.5">No. HP</label>
          <input className={inputCls} value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="08xxxxxxxxxx" />
        </div>
        <button className={btnPrimary} onClick={simpan}>
          Simpan Profil
        </button>
      </div>

      <div className={`${cardCls} space-y-4 mt-6`}>
        <h2 className="font-bold text-ink">Ganti Password</h2>
        {msgPw && <div className="text-sm bg-primary/10 text-primary rounded-lg px-4 py-2">{msgPw}</div>}
        <div>
          <label className="text-xs font-medium text-body/60 block mb-1.5">Password Lama</label>
          <input className={inputCls} type="password" value={pwLama} onChange={(e) => setPwLama(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-body/60 block mb-1.5">Password Baru</label>
          <input className={inputCls} type="password" value={pwBaru} onChange={(e) => setPwBaru(e.target.value)} />
        </div>
        <button className={btnPrimary} onClick={gantiPassword}>
          Ganti Password
        </button>
      </div>
    </div>
  );
}
