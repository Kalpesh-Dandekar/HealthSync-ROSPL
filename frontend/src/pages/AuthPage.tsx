/// <reference types="vite/client" />
import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, HeartPulse, LockKeyhole, Mail, UserRound } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type AuthMode = "login" | "signup";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(() => {
    const selected = (searchParams.get("role") || "PATIENT").toUpperCase();
    return ["PATIENT", "CAREGIVER", "PHYSICIAN"].includes(selected) ? selected : "PATIENT";
  });
  const [busy, setBusy] = useState(false);

  const roleOptions = [
    { value: "PATIENT", label: "Patient" },
    { value: "CAREGIVER", label: "Caregiver" },
    { value: "PHYSICIAN", label: "Physician" },
  ] as const;
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      if (isLogin) {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Invalid email or password");

        localStorage.setItem("healthsync_token", data.token);
        localStorage.setItem("healthsync_role", data.user.role);
        localStorage.setItem("healthsync_user", JSON.stringify(data.user));
        navigate(`/${data.user.role}`);
      } else {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to create account");

        localStorage.setItem("healthsync_token", data.token);
        localStorage.setItem("healthsync_role", data.user.role);
        localStorage.setItem("healthsync_user", JSON.stringify(data.user));
        navigate(`/${data.user.role}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cv-grid flex min-h-screen items-center justify-center bg-paper-50 px-4 py-6 text-charcoal-900 sm:px-6">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-white shadow-lg shadow-ink-800/20">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight">HealthSync</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-500">Intelligent connected care</span>
            </span>
          </button>
          <Link to={isLogin ? `/signup?role=${role.toLowerCase()}` : `/login?role=${role.toLowerCase()}`} className="text-xs font-semibold text-charcoal-500 transition hover:text-ink-500">
            {isLogin ? "Create account" : "Already have an account? Log in"}
          </Link>
        </div>

        <div className="grid overflow-hidden rounded-3xl border border-paper-200 bg-paper-0 shadow-2xl shadow-black/30 lg:grid-cols-[.85fr_1.15fr]">
          <section className="hidden border-r border-paper-200 bg-paper-50 p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-700/25 bg-ink-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-600" /> Secure workspace
              </span>
              <h1 className="mt-8 max-w-sm text-4xl font-semibold tracking-[-0.04em]">One health story.<br /><span className="text-ink-600">Better connected.</span></h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-charcoal-500">Medication adherence, health signals and coordinated care — designed around the people who need to stay connected.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-charcoal-500">
              <div className="rounded-xl border border-paper-200 bg-paper-0 p-3"><span className="block text-ink-500">01</span>Patient</div>
              <div className="rounded-xl border border-paper-200 bg-paper-0 p-3"><span className="block text-gold-500">02</span>Caregiver</div>
              <div className="rounded-xl border border-paper-200 bg-paper-0 p-3"><span className="block text-ink-500">03</span>Physician</div>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">HealthSync access</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal-500">{isLogin ? "Sign in to continue to your connected care workspace." : "Set up your workspace now. Secure database registration will be enabled next."}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {!isLogin && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-charcoal-700">Full name</span>
                    <span className="relative block">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500" />
                      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="h-12 w-full rounded-xl border border-paper-200 bg-paper-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-charcoal-500 focus:border-ink-600" />
                    </span>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-charcoal-700">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="h-12 w-full rounded-xl border border-paper-200 bg-paper-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-charcoal-500 focus:border-ink-600" />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-charcoal-700">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500" />
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required minLength={6} placeholder="••••••••" className="h-12 w-full rounded-xl border border-paper-200 bg-paper-50 pl-10 pr-11 text-sm outline-none transition placeholder:text-charcoal-500 focus:border-ink-600" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-charcoal-500 hover:bg-paper-100 hover:text-charcoal-900">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-charcoal-700">Workspace role</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="h-12 w-full rounded-xl border border-paper-200 bg-paper-50 px-3 text-sm outline-none focus:border-ink-600"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {isLogin && (
                    <span className="mt-1.5 block text-[10px] leading-4 text-charcoal-500">
                      Select the role assigned to this account. The server verifies it before sign-in.
                    </span>
                  )}
                </label>

                {message && <div className="rounded-xl border border-gold-600/30 bg-gold-100 px-3 py-3 text-xs leading-5 text-gold-500">{message}</div>}

                <button disabled={busy} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-800 px-4 text-sm font-bold text-white shadow-lg shadow-ink-800/15 transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? "Please wait…" : isLogin ? "Log in to HealthSync" : "Create HealthSync account"}
                  {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <p className="mt-6 text-center text-[10px] leading-5 text-charcoal-500">HealthSync is a student project prototype. It is not a substitute for professional medical advice.</p>
            </div>
          </section>
        </div>

        <p className="mt-4 text-center text-[10px] text-charcoal-500">{location.pathname === "/login" ? "Sign in securely" : "Join the connected care demo"} · HealthSync</p>
      </div>
    </div>
  );
}
