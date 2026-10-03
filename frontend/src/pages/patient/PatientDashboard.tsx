import { AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, HeartHandshake, Pill, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { AdherenceRing } from "../../components/ui/AdherenceRing";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { useAppData } from "../../data/AppDataContext";
import type { DoseEvent } from "../../types";
import "./PatientDashboard.css";

function doseStatusBadge(status: DoseEvent["status"], takenAt?: string) {
  if (status === "taken") return <Badge tone="sage" icon={<CheckCircle2 className="h-3 w-3" />}>Taken {takenAt}</Badge>;
  if (status === "pending") return <Badge tone="gold">Pending</Badge>;
  if (status === "missed") return <Badge tone="brick">Missed</Badge>;
  return <Badge tone="neutral">Scheduled</Badge>;
}

function riskLabel(band: "low" | "medium" | "high") {
  return band === "high" ? "High risk" : band === "medium" ? "Moderate risk" : "Low risk";
}

export function PatientDashboard() {
  const { patient, medicines, alerts, adherenceRate, logDose, sosActive, toggleSos, riskAssessment } = useAppData();
  const riskPercent = Math.round(riskAssessment.overall.score * 100);
  const topRisk = [...riskAssessment.perMedicine].sort((a, b) => b.risk.score - a.risk.score)[0];
  const activeAlerts = alerts.filter((alert) => !alert.acknowledged);
  const missed = medicines.reduce((count, medicine) => count + medicine.doses.filter((dose) => dose.status === "missed").length, 0);
  const pending = medicines.reduce((count, medicine) => count + medicine.doses.filter((dose) => dose.status === "pending").length, 0);
  const lowStock = medicines.filter((medicine) => medicine.stock <= medicine.lowStockThreshold).length;

  return (
    <div className="patient-overview screen-page">
      <header className="patient-overview__header">
        <div className="patient-overview__heading">
          <div className="patient-overview__eyebrow"><TrendingUp aria-hidden="true" /> Patient overview</div>
          <h1>Good morning, {patient.name.split(" ")[0]}</h1>
          <p>Your medication plan, care network and AI adherence insight are up to date.</p>
        </div>
        <button type="button" onClick={toggleSos} className={`patient-overview__sos ${sosActive ? "is-active" : ""}`}>
          <AlertTriangle aria-hidden="true" />{sosActive ? "Emergency alert sent" : "Emergency SOS"}
        </button>
      </header>

      <section className="patient-summary" aria-label="Today's health summary">
        <article className="summary-card summary-card--adherence">
          <div className="summary-card__topline"><span className="summary-card__icon"><CheckCircle2 /></span><span className={`summary-card__status ${adherenceRate >= 80 ? "is-positive" : "is-attention"}`}>{adherenceRate >= 80 ? "On track" : "Needs attention"}</span></div>
          <p className="summary-card__label">Today's adherence</p>
          <div className="summary-card__metric">{adherenceRate}<span>%</span></div>
          <div className="summary-card__progress" aria-hidden="true"><span style={{ width: `${adherenceRate}%` }} /></div>
        </article>

        <article className="summary-card summary-card--risk">
          <div className="summary-card__topline"><span className="summary-card__icon"><BrainCircuit /></span><RiskBadge risk={riskAssessment.overall} /></div>
          <p className="summary-card__label">AI risk signal</p>
          <div className="summary-card__metric">{riskPercent}<span>%</span></div>
          <p className="summary-card__note">Future missed-dose likelihood</p>
        </article>

        <article className="summary-card summary-card--attention">
          <div className="summary-card__topline"><span className="summary-card__icon"><AlertTriangle /></span><span className="summary-card__quiet">Dose signals</span></div>
          <p className="summary-card__label">Needs attention</p>
          <div className="summary-card__metric">{pending + missed}</div>
          <p className="summary-card__note">{pending} pending <i /> {missed} missed <i /> {lowStock} low stock</p>
        </article>

        <article className="summary-card summary-card--network">
          <div className="summary-card__topline"><span className="summary-card__icon"><HeartHandshake /></span><span className="summary-card__status is-connected"><span /> Connected</span></div>
          <p className="summary-card__label">Care network</p>
          <p className="summary-card__network-title">Your care stays in sync</p>
          <p className="summary-card__note">Caregiver + physician can see adherence updates.</p>
        </article>
      </section>

      <div className="patient-overview__content">
        <section className="medicines-panel clinical-panel" aria-labelledby="medicines-title">
          <div className="clinical-panel__header">
            <div><p className="clinical-panel__kicker">Medication plan</p><h2 id="medicines-title">Today's medicines</h2><p>Log each dose as you take it. Changes recalculate the AI risk signal.</p></div>
            {medicines.length > 0 && <span className="clinical-panel__count">{medicines.length} active</span>}
          </div>

          {medicines.length === 0 ? (
            <div className="medicines-empty">
              <span className="medicines-empty__icon"><Pill /></span>
              <div><h3>No medicines scheduled yet</h3><p>Add medication details to start tracking doses and adherence.</p></div>
              <Link to="/patient/add-data">Add medication data <ArrowRight /></Link>
            </div>
          ) : (
            <div className="medicine-list">
              {medicines.map((medicine) => {
                const nextDose = medicine.doses.find((dose) => dose.status !== "taken");
                return (
                  <article key={medicine.id} className="medicine-row">
                    <span className="medicine-row__icon"><Pill /></span>
                    <div className="medicine-row__copy">
                      <p>{medicine.name} <span>{medicine.dosage}</span></p>
                      <small>{medicine.compartment} <i /> Stock: {medicine.stock}</small>
                      <div className="medicine-row__badges">{medicine.doses.map((dose) => <span key={dose.id}>{doseStatusBadge(dose.status, dose.takenAt)}</span>)}</div>
                    </div>
                    {nextDose && <button type="button" onClick={() => logDose(medicine.id, nextDose.id)}><CheckCircle2 /> Mark taken</button>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="patient-overview__side">
          <section className="insight-panel" aria-labelledby="insight-title">
            <div className="insight-panel__header">
              <span className="insight-panel__icon"><BrainCircuit /></span>
              <div><p><Sparkles /> Decision support</p><h2 id="insight-title">AI adherence insight</h2></div>
              <RiskBadge risk={riskAssessment.overall} />
            </div>
            <div className="insight-panel__score"><AdherenceRing percent={riskPercent} size={92} label="risk score" mode="risk" /><div><h3>{riskLabel(riskAssessment.overall.band)}</h3><p>The model estimates the likelihood of a future missed dose from recent medication behavior.</p></div></div>
            <dl className="insight-panel__details">
              <div><dt>Missed doses</dt><dd>{missed}</dd></div><div><dt>Pending doses</dt><dd className="is-attention">{pending}</dd></div>
              <div><dt>Low-stock medicines</dt><dd>{lowStock}</dd></div><div><dt>Highest-risk medicine</dt><dd>{topRisk?.medicine.name ?? "—"}</dd></div>
            </dl>
            <div className="insight-panel__disclaimer"><ShieldCheck /><p>Decision-support prototype only. It does not diagnose conditions or replace medical advice.</p></div>
          </section>

          <section className="alerts-panel clinical-panel" aria-labelledby="alerts-title">
            <div className="alerts-panel__header"><div><p className="clinical-panel__kicker">Care signals</p><h2 id="alerts-title">Alerts</h2></div><span>{activeAlerts.length}</span></div>
            {activeAlerts.length > 0 ? (
              <div className="alerts-panel__list">{activeAlerts.map((alert) => <article key={alert.id} className={`alert-item alert-item--${alert.severity}`}><Badge tone={alert.severity === "critical" ? "brick" : "gold"}>{alert.type === "missed_dose" ? "Missed dose" : "Low stock"}</Badge><p>{alert.message}</p></article>)}</div>
            ) : (
              <div className="alerts-clear"><span><CheckCircle2 /></span><div><h3>All clear</h3><p>No active alerts need your attention.</p></div></div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
