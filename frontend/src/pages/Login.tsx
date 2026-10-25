import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";
import type { Pengguna } from "../types";
import { btnPrimary, inputCls } from "../components/ui";

interface LoginResp {
  access_token: string;
  token_type: string;
  user: Pengguna;
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<LoginResp>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: identifier, password }),
      });
      setAuth(res.access_token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="KiddyTracker" className="h-12 w-auto" />
          <h1 className="text-3xl font-black text-ink">KiddyTracker</h1>
        </div>
        <p className="text-sm text-body/70 mb-6">
          Pencatatan perkembangan anak
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Email / Nomor HP"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputCls}
          />
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Memuat..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
