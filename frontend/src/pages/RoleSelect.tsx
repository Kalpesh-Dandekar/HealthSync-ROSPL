import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, HeartPulse, Pill, ShieldCheck, Stethoscope, Users } from "lucide-react";
import type { CSSProperties } from "react";
import "./RoleSelect.css";

const roles = [
  { key: "patient", title: "Patient", label: "Personal health", desc: "Track medications, vitals and appointments in one private health space.", icon: Pill, accent: "patient" },
  { key: "caregiver", title: "Caregiver", label: "Connected care", desc: "Stay connected to adherence signals and respond when support is needed.", icon: Users, accent: "care" },
  { key: "doctor", title: "Physician", label: "Clinical intelligence", desc: "Review authorized patient trends, records, appointments and urgent events.", icon: Stethoscope, accent: "clinical" },
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
            <span className="landing-brand__copy"><span className="landing-brand__name">HealthSync</span><span className="landing-brand__tagline">Intelligent connected care</span></span>
          </Link>
          <nav className="landing-nav" aria-label="Account navigation">
            <Link to="/login" className="landing-button landing-button--secondary">Log in</Link>
            <Link to="/signup" className="landing-button landing-button--primary">Sign up <ArrowRight aria-hidden="true" /></Link>
          </nav>
        </header>

        <main className="landing-hero">
          <section className="landing-intro" aria-labelledby="landing-title">
            <div className="landing-eyebrow"><span className="landing-eyebrow__pulse" aria-hidden="true" /><Activity aria-hidden="true" />Connected health monitoring</div>
            <h1 id="landing-title" className="landing-title">Healthcare,<span>finally in sync.</span></h1>
            <p className="landing-description">HealthSync brings medication adherence, health signals and coordinated follow-ups into one role-aware platform for patients, caregivers and physicians.</p>
            <div className="landing-cues" aria-label="Platform highlights">
              <span className="landing-cue landing-cue--patient"><span className="landing-cue__icon" aria-hidden="true"><Pill /></span>Medication adherence</span>
              <span className="landing-cue landing-cue--clinical"><span className="landing-cue__icon" aria-hidden="true"><Activity /></span>Health signals</span>
              <span className="landing-cue landing-cue--care"><span className="landing-cue__icon" aria-hidden="true"><Users /></span>Connected care</span>
            </div>
          </section>

          <section className="workspace-panel" aria-labelledby="workspace-title">
            <div className="workspace-panel__header">
              <div><p className="workspace-panel__eyebrow">Enter workspace</p><h2 id="workspace-title">Choose your care view</h2><p>One platform, focused for your role.</p></div>
              <span className="workspace-panel__status" aria-label="Secure platform access"><span aria-hidden="true" />Secure access</span>
            </div>
            <div className="workspace-panel__context" aria-label="Connected care context">
              <span><Pill />Adherence</span><i aria-hidden="true" /><span><Activity />Monitoring</span><i aria-hidden="true" /><span><Users />Care team</span>
            </div>
            <div className="workspace-roles">
              {roles.map((role, index) => (
                <button key={role.key} type="button" onClick={() => navigate(`/login?role=${role.key}`)} className="workspace-role" data-accent={role.accent} style={{ "--role-delay": `${index * 70}ms` } as CSSProperties} aria-label={`Continue as ${role.title}`}>
                  <span className="workspace-role__icon" aria-hidden="true"><role.icon /></span>
                  <span className="workspace-role__copy"><span className="workspace-role__meta">{role.label}</span><span className="workspace-role__title">{role.title}</span><span className="workspace-role__description">{role.desc}</span></span>
                  <span className="workspace-role__arrow" aria-hidden="true"><ArrowRight /></span>
                </button>
              ))}
            </div>
            <div className="workspace-panel__assurance"><ShieldCheck aria-hidden="true" />Role-aware access keeps every care view focused and private.</div>
          </section>
        </main>

        <footer className="landing-footer"><span><HeartPulse aria-hidden="true" />HealthSync <i aria-hidden="true" /> Connected care platform</span><span>Private, role-aware health coordination</span></footer>
      </div>
    </div>
  );
}
