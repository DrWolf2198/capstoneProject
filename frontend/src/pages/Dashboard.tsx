import { getUser } from "../lib/auth";
import AdminGuruDashboard from "./AdminGuruDashboard";
import OrtuDashboard from "./OrtuDashboard";

export default function Dashboard() {
  const user = getUser();
  return user?.role === "ortu" ? <OrtuDashboard /> : <AdminGuruDashboard />;
}
