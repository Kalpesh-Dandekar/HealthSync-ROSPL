import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, HeartPulse, Pill, ShieldCheck, Stethoscope, Users } from "lucide-react";
import type { CSSProperties } from "react";
import "./RoleSelect.css";

const roles = [
  { key: "patient", title: "Patient", desc: "Track medications, vitals and appointments in one private health space.", icon: Pill, accent: "primary" },
  { key: "caregiver", title: "Caregiver", desc: "Stay connected to adherence signals and respond when support is needed.", icon: Users, accent: "care" },
  { key: "doctor", title: "Physician", desc: "Review patient trends, records, appointments and urgent events.", icon: Stethoscope, accent: "clinical" },
] as const;

export function RoleSelect() {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <div className="landing-ambient landing-ambient--one" aria-hidden="true" />
      <div className="landing-ambient landing-ambient--two" aria-hidden="true" />
      <div className="landing-frame">
        <header className="landing-header">
          <Link className="landing-brand" to="/" aria-label="HealthSync home">
            <span className="landing-brand__mark" aria-hidden="true"><HeartPulse /></span>
            <span className="landing-brand__copy">
              <span className="landing-brand__name">HealthSync</span>
              <span className="landing-brand__tagline">Intelligent connected care</span>
            </span>
          </Link>
          <nav className="landing-nav" aria-label="Account navigation">
            <Link to="/login" className="landing-button landing-button--secondary">Log in</Link>
            <Link to="/signup" className="landing-button landing-button--primary">Sign up <ArrowRight aria-hidden="true" /></Link>
          </nav>
        </header>

        <main className="landing-hero">
          <section className="landing-intro" aria-labelledby="landing-title">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow__pulse" aria-hidden="true" />
              <Activity aria-hidden="true" /> Connected health monitoring
            </div>
            <h1 id="landing-title" className="landing-title">One health story.<span>Better connected.</span></h1>
            <p className="landing-description">HealthSync brings medication adherence, remote health signals and coordinated care into a single role-aware workspace for patients, caregivers and physicians.</p>
            <div className="landing-cues" aria-label="Platform highlights">
              <span className="landing-cue"><span className="landing-cue__icon" aria-hidden="true"><ShieldCheck /></span>Role-based access</span>
              <span className="landing-cue"><span className="landing-cue__icon" aria-hidden="true"><Activity /></span>Risk insights</span>
            </div>
          </section>

          <section className="workspace-panel" aria-labelledby="workspace-title">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-panel__eyebrow">Enter workspace</p>
                <h2 id="workspace-title">Choose your care view</h2>
                <p>Choose a role to explore the platform.</p>
              </div>
              <span className="workspace-panel__status" aria-label="Platform online"><span aria-hidden="true" />Secure access</span>
            </div>
            <div className="workspace-roles">
              {roles.map((role, index) => (
                <button key={role.key} type="button" onClick={() => navigate(`/login?role=${role.key}`)} className="workspace-role" data-accent={role.accent} style={{ "--role-delay": `${index * 70}ms` } as CSSProperties} aria-label={`Continue as ${role.title}`}>
                  <span className="workspace-role__icon" aria-hidden="true"><role.icon /></span>
                  <span className="workspace-role__copy"><span className="workspace-role__title">{role.title}</span><span className="workspace-role__description">{role.desc}</span></span>
                  <span className="workspace-role__arrow" aria-hidden="true"><ArrowRight /></span>
                </button>
              ))}
            </div>
            <div className="workspace-panel__assurance"><ShieldCheck aria-hidden="true" />Role-aware access keeps every care view focused and private.</div>
          </section>
        </main>

        <footer className="landing-footer">
          <span><HeartPulse aria-hidden="true" />HealthSync <i aria-hidden="true" /> Connected care platform</span>
          <span>PostgreSQL + secure authentication backend</span>
        </footer>
      </div>
    </div>
  );
}
