import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../lib/auth";
import type { Role } from "../types";

const NAV: Record<Role, { to: string; label: string; icon: string }[]> = {
  superadmin: [
    { to: "/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { to: "/data-master", label: "Data Master", icon: "ri-database-2-line" },
    { to: "/kalender", label: "Kalender", icon: "ri-calendar-2-line" },
    { to: "/profil", label: "Profil", icon: "ri-user-3-line" },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { to: "/data-master", label: "Data Master", icon: "ri-database-2-line" },
    { to: "/kalender", label: "Kalender", icon: "ri-calendar-2-line" },
    { to: "/profil", label: "Profil", icon: "ri-user-3-line" },
  ],
  guru: [
    { to: "/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { to: "/pencatatan", label: "Penilaian", icon: "ri-edit-line" },
    { to: "/sesi", label: "Absensi", icon: "ri-calendar-check-line" },
    { to: "/dokumentasi", label: "Weekly Activities", icon: "ri-calendar-check-line" },
    { to: "/kalender", label: "Kalender", icon: "ri-calendar-2-line" },
    { to: "/laporan", label: "Laporan", icon: "ri-file-chart-line" },
    { to: "/riwayat", label: "Riwayat", icon: "ri-history-line" },
    { to: "/profil", label: "Profil", icon: "ri-user-3-line" },
  ],
  ortu: [
    { to: "/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { to: "/catatan", label: "Catatan", icon: "ri-chat-3-line" },
    { to: "/kalender", label: "Kalender", icon: "ri-calendar-2-line" },
    { to: "/riwayat", label: "Riwayat", icon: "ri-history-line" },
    { to: "/profil", label: "Profil", icon: "ri-user-3-line" },
  ],
};

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const nav = NAV[user.role] ?? [];

  const close = () => setOpen(false);
  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar: drawer di mobile, fixed di desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-primary text-white flex flex-col py-7 px-5 overflow-y-auto transition-transform duration-200 lg:translate-x-0 lg:w-60 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-8">
          <img src="/logo.png" alt="KiddyTracker" className="h-10 w-auto" />
          <span className="text-2xl font-black">KiddyTracker</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? "bg-white/20" : "hover:bg-white/10"
                }`
              }
            >
              <i className={`${item.icon} text-lg`} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <div className="text-sm font-semibold">{user.nama}</div>
          <div className="text-xs opacity-70 capitalize mb-3">{user.role}</div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
          >
            <i className="ri-logout-box-r-line" /> Keluar
          </button>
        </div>
      </aside>

      {/* Overlay gelap saat drawer terbuka (mobile) */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close} />}

      {/* Konten utama */}
      <main className="min-h-screen px-4 sm:px-6 py-6 lg:ml-60 lg:px-9 lg:py-8">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-5">
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white shrink-0"
            aria-label="Menu"
          >
            <i className="ri-menu-line text-xl" />
          </button>
          <span className="font-black text-ink text-lg">KiddyTracker</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
