import { Outlet } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Calendar,
  ClipboardList,
  FileText,
  Users2,
} from "lucide-react";
import { AppShell, type NavItem } from "../../components/layout/AppShell";
import "./DoctorLayout.css";

const navItems: NavItem[] = [
  { to: "/doctor", label: "Patients", icon: Users2, end: true },
  { to: "/doctor/ai", label: "AI Assistant", icon: Bot },
  { to: "/doctor/appointments", label: "Appointments", icon: Calendar },
  { to: "/doctor/reports", label: "Reports", icon: ClipboardList },
  { to: "/doctor/emergencies", label: "Emergencies", icon: AlertTriangle },
  { to: "/doctor/care-network", label: "Care Network", icon: FileText },
];

export function DoctorLayout() {
  const storedUser = localStorage.getItem("healthsync_user");

  let doctorName = "Doctor";

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      doctorName = user.name || "Doctor";
    } catch {
      doctorName = "Doctor";
    }
  }

  return (
    <AppShell
      role="doctor"
      navItems={navItems}
      userName={doctorName}
    >
      <Outlet />
    </AppShell>
  );
}
