import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

const roles = [
  {
    key: "patient",
    title: "Patient",
    desc: "Track medications, vitals and appointments in one private health space.",
    icon: Pill,
  },
  {
    key: "caregiver",
    title: "Caregiver",
    desc: "Stay connected to adherence signals and respond when support is needed.",
    icon: Users,
  },
  {
    key: "doctor",
    title: "Physician",
    desc: "Review patient trends, records, appointments and urgent events.",
    icon: Stethoscope,
  },
] as const;

export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="cv-grid min-h-screen overflow-hidden bg-paper-50 px-4 py-5 text-charcoal-900 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-paper-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-white shadow-xl shadow-ink-800/20">
              <HeartPulse className="h-5.5 w-5.5" />
            </div>

            <div>
              <h1 className="text-base font-bold tracking-tight sm:text-lg">
                HealthSync
              </h1>

              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-charcoal-500 sm:text-[10px]">
                Intelligent connected care
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl border border-paper-200 bg-paper-0 px-3 py-2 text-[11px] font-semibold text-charcoal-700 transition hover:border-ink-700/40 hover:text-charcoal-900"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="rounded-xl bg-ink-800 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-ink-700"
            >
              Sign up
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="animate-soft-pop">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-700/20 bg-ink-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
              <Activity className="h-3.5 w-3.5" />
              Connected health monitoring
            </div>

            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-charcoal-900 sm:text-5xl lg:text-6xl">
              One health story.
              <br />
              <span className="text-ink-600">Better connected.</span>
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-charcoal-500 sm:text-base">
              HealthSync brings medication adherence, remote health signals
              and coordinated care into a single role-aware workspace for
              patients, caregivers and physicians.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-xs text-charcoal-500">
              <span className="flex items-center gap-2 rounded-lg border border-paper-200 bg-paper-0 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-ink-600" />
                Role-based access
              </span>

              <span className="flex items-center gap-2 rounded-lg border border-paper-200 bg-paper-0 px-3 py-2">
                <Activity className="h-4 w-4 text-ink-600" />
                Risk insights
              </span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-500">
                  Enter workspace
                </p>

                <p className="mt-1 text-sm text-charcoal-700">
                  Choose a role to explore the platform.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {roles.map((r, index) => (
                <button
                  key={r.key}
                  onClick={() => navigate(`/login?role=${r.key}`)}
                  className="animate-soft-pop cv-glow group flex w-full items-center gap-4 rounded-2xl border border-paper-200 bg-paper-0 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ink-700/40 hover:bg-paper-100 sm:p-5"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 transition-colors group-hover:bg-ink-800 group-hover:text-white">
                    <r.icon className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal-900">
                        {r.title}
                      </span>
                    </span>

                    <span className="mt-1 block max-w-md text-xs leading-5 text-charcoal-500">
                      {r.desc}
                    </span>
                  </span>

                  <ArrowRight className="h-4.5 w-4.5 shrink-0 text-charcoal-500 transition-transform group-hover:translate-x-1 group-hover:text-ink-600" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-paper-200 py-4 text-[10px] text-charcoal-500 sm:flex-row sm:items-center sm:justify-between">
          <span>HealthSync • Connected care platform</span>
          <span>PostgreSQL + secure authentication backend</span>
        </footer>
      </div>
    </div>
  );
}