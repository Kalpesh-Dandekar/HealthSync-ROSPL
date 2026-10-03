import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HeartPulse, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { UserRole } from "../../types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const roleLabels: Record<UserRole, string> = {
  patient: "Patient",
  caregiver: "Caregiver",
  doctor: "Physician",
};

const roleDescriptions: Record<UserRole, string> = {
  patient: "Your personal health space",
  caregiver: "Connected care overview",
  doctor: "Clinical monitoring workspace",
};

export function AppShell({
  role,
  navItems,
  userName,
  children,
}: {
  role: UserRole;
  navItems: NavItem[];
  userName: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleLabel = roleLabels[role];

  return (
    <div className="h-screen overflow-hidden bg-paper-50 text-charcoal-900 lg:flex">
      {/* Desktop navigation */}
      <aside className="hidden w-[272px] min-h-0 shrink-0 flex-col border-r border-paper-200 bg-paper-0 lg:flex">
        <div className="border-b border-paper-200 px-5 py-5">
          <button onClick={() => navigate(`/${role}`)} className="flex items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-white shadow-lg shadow-ink-800/20">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight">HealthSync</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-500">Connected care</span>
            </span>
          </button>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-paper-200 bg-paper-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Workspace</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-sage-600"><span className="h-1.5 w-1.5 rounded-full bg-sage-600" />Live</span>
          </div>
          <p className="mt-2 text-sm font-semibold">{roleLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{roleDescriptions[role]}</p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal-500">Navigation</p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-700/20"
                      : "text-charcoal-700 hover:bg-paper-100 hover:text-charcoal-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-ink-800 text-white" : "bg-paper-100 text-charcoal-500 group-hover:text-charcoal-900"}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-ink-600" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-paper-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-paper-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="text-[10px] uppercase tracking-wide text-charcoal-500">{roleLabel}</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem("healthsync_token"); localStorage.removeItem("healthsync_role"); localStorage.removeItem("healthsync_user"); navigate("/"); }} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-charcoal-500 hover:bg-paper-100 hover:text-charcoal-900">
            <LogOut className="h-3.5 w-3.5" /> Switch workspace
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-paper-200 bg-paper-0/95 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => navigate(`/${role}`)} className="flex items-center gap-2.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800 text-white"><HeartPulse className="h-4.5 w-4.5" /></span>
          <span><span className="block text-sm font-bold">HealthSync</span><span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">{roleLabel}</span></span>
        </button>
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-xl border border-paper-200 bg-paper-100 p-2.5 text-charcoal-700">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col border-l border-paper-200 bg-paper-0 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-paper-200 pb-4">
              <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800 text-white"><HeartPulse className="h-4 w-4" /></span><span className="font-bold">HealthSync</span></div>
              <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-charcoal-500 hover:bg-paper-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-paper-200 bg-paper-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">{roleLabel} workspace</p><p className="mt-1 text-sm text-charcoal-700">{roleDescriptions[role]}</p></div>
            <nav className="mt-5 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-semibold ${isActive ? "bg-ink-100 text-ink-500" : "text-charcoal-700 hover:bg-paper-100"}`}>
                  <item.icon className="h-5 w-5" />{item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto border-t border-paper-200 pt-4">
              <button onClick={() => { localStorage.removeItem("healthsync_token"); localStorage.removeItem("healthsync_role"); localStorage.removeItem("healthsync_user"); navigate("/"); }} className="flex w-full items-center gap-2 rounded-xl bg-paper-100 px-3 py-3 text-sm font-semibold text-charcoal-700"><LogOut className="h-4 w-4" />Switch workspace</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="pointer-events-none fixed inset-0 -z-0 opacity-40 cv-grid" />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4 lg:px-6 lg:pb-5 lg:pt-5">
          <div className="w-full">{children}</div>
        </main>


      </div>
    </div>
  );
}
