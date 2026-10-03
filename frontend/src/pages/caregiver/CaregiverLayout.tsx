import { Outlet } from "react-router-dom";
import {
  Bell,
  Bot,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "../../components/layout/AppShell";

const navItems: NavItem[] = [
  { to: "/caregiver", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/caregiver/patients", label: "Patients", icon: Users },
  { to: "/caregiver/ai", label: "AI Assistant", icon: Bot },
  { to: "/caregiver/alerts", label: "Alerts", icon: Bell },
  { to: "/caregiver/appointments", label: "Appointments", icon: Calendar },
  { to: "/caregiver/reports", label: "Reports", icon: ClipboardList },
  { to: "/caregiver/care-network", label: "Care Network", icon: Users },
];

export function CaregiverLayout() {
  const storedUser = localStorage.getItem("healthsync_user");

  let caregiverName = "Caregiver";

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      caregiverName = user.name || "Caregiver";
    } catch {
      caregiverName = "Caregiver";
    }
  }

  return (
    <AppShell
      role="caregiver"
      navItems={navItems}
      userName={caregiverName}
    >
      <Outlet />
    </AppShell>
  );
}