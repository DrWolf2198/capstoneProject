import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { getUser } from "./lib/auth";
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
        <Route path="data-master" element={<DataMaster />} />
        <Route path="pencatatan" element={<Pencatatan />} />
        <Route path="sesi" element={<Sesi />} />
        <Route path="dokumentasi" element={<Dokumentasi />} />
        <Route path="kalender" element={<KalenderAkademik />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="catatan" element={<Catatan />} />
        <Route path="riwayat" element={<Riwayat />} />
        <Route path="profil" element={<Profil />} />
      </Route>
    </Routes>
  );
}
