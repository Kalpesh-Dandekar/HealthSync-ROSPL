/// <reference types="vite/client" />
import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Eye, EyeOff, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import "./AuthPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
type AuthMode = "login" | "signup";

const roleOptions = [
  { value: "PATIENT", label: "Patient" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "PHYSICIAN", label: "Physician" },
] as const;

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
    <div className="auth-page">
      <div className="auth-shell">
        <header className="auth-header">
          <button type="button" onClick={() => navigate("/")} className="auth-brand" aria-label="Return to HealthSync home">
            <span className="auth-brand__mark" aria-hidden="true"><HeartPulse /></span>
            <span className="auth-brand__copy"><strong>HealthSync</strong><span>Intelligent connected care</span></span>
          </button>
          <div className="auth-switch">
            {!isLogin && <span>Already have an account?</span>}
            <Link to={isLogin ? `/signup?role=${role.toLowerCase()}` : `/login?role=${role.toLowerCase()}`}>
              {isLogin ? "Create account" : "Log in"}<ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className={`auth-card ${isLogin ? "auth-card--login" : "auth-card--signup"}`}>
          <section className="auth-context" aria-labelledby="auth-context-title">
            <div>
              <div className="auth-context__badge"><span aria-hidden="true" /><ShieldCheck aria-hidden="true" />Secure workspace</div>
              <h1 id="auth-context-title">One health story.<span>Better connected.</span></h1>
              <p>Medication adherence, health signals and coordinated care — designed around the people who need to stay connected.</p>
            </div>
            <div className="auth-roles" aria-label="HealthSync workspace roles">
              {roleOptions.map((option, index) => (
                <button key={option.value} type="button" className={role === option.value ? "is-active" : ""} onClick={() => setRole(option.value)} aria-pressed={role === option.value}>
                  <span>0{index + 1}</span><strong>{option.label}</strong>
                </button>
              ))}
            </div>
            <div className="auth-context__assurance"><LockKeyhole aria-hidden="true" /><span><strong>Private by design</strong>Role-aware access keeps each workspace focused.</span></div>
          </section>

          <section className="auth-form-panel">
            <div className="auth-form-wrap">
              <div className="auth-form-heading">
                <p>HealthSync access</p>
                <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
                <span>{isLogin ? "Sign in to continue to your connected care workspace." : "Create your secure, role-aware connected care workspace."}</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                  <label className="auth-field">
                    <span className="auth-field__label">Full name</span>
                    <span className="auth-control"><UserRound aria-hidden="true" /><input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" placeholder="Your name" /></span>
                  </label>
                )}
                <label className="auth-field">
                  <span className="auth-field__label">Email</span>
                  <span className="auth-control"><Mail aria-hidden="true" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" placeholder="you@example.com" /></span>
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">Password</span>
                  <span className="auth-control"><LockKeyhole aria-hidden="true" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required minLength={6} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff /> : <Eye />}</button>
                  </span>
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">Workspace role</span>
                  <span className="auth-control auth-control--select"><ShieldCheck aria-hidden="true" /><select value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown aria-hidden="true" /></span>
                  {isLogin && <span className="auth-field__hint">Select the role assigned to this account. The server verifies it before sign-in.</span>}
                </label>

                {message && <div className="auth-message" role="alert">{message}</div>}
                <button disabled={busy} className="auth-submit">
                  <span>{busy ? "Please wait…" : isLogin ? "Log in to HealthSync" : "Create HealthSync account"}</span>
                  {!busy && <ArrowRight aria-hidden="true" />}
                </button>
              </form>

              <p className="auth-disclaimer">HealthSync is a student project prototype. It is not a substitute for professional medical advice.</p>
            </div>
          </section>
        </main>

        <footer className="auth-footer"><span>{location.pathname === "/login" ? "Sign in securely" : "Join the connected care demo"}</span><i aria-hidden="true" />HealthSync</footer>
      </div>
    </div>
  );
}
