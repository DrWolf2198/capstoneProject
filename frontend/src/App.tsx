import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { getUser } from "./lib/auth";
import type { Role } from "./types";
import Dashboard from "./pages/Dashboard";
import Catatan from "./pages/Catatan";
import DataMaster from "./pages/DataMaster";
import Dokumentasi from "./pages/Dokumentasi";
import KalenderAkademik from "./pages/KalenderAkademik";
import Laporan from "./pages/Laporan";
import Login from "./pages/Login";
import Pencatatan from "./pages/Pencatatan";
import Profil from "./pages/Profil";
import Riwayat from "./pages/Riwayat";
import Sesi from "./pages/Sesi";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getUser()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="data-master"
          element={
            <RequireRole roles={["admin", "superadmin"]}>
              <DataMaster />
            </RequireRole>
          }
        />
        <Route
          path="pencatatan"
          element={
            <RequireRole roles={["guru"]}>
              <Pencatatan />
            </RequireRole>
          }
        />
        <Route
          path="sesi"
          element={
            <RequireRole roles={["guru"]}>
              <Sesi />
            </RequireRole>
          }
        />
        <Route
          path="dokumentasi"
          element={
            <RequireRole roles={["guru"]}>
              <Dokumentasi />
            </RequireRole>
          }
        />
        <Route path="kalender" element={<KalenderAkademik />} />
        <Route
          path="laporan"
          element={
            <RequireRole roles={["admin", "superadmin", "guru"]}>
              <Laporan />
            </RequireRole>
          }
        />
        <Route
          path="catatan"
          element={
            <RequireRole roles={["guru", "ortu"]}>
              <Catatan />
            </RequireRole>
          }
        />
        <Route path="riwayat" element={<Riwayat />} />
        <Route path="profil" element={<Profil />} />
      </Route>
    </Routes>
  );
}
