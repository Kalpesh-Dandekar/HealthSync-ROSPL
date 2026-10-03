import { AlertTriangle, BrainCircuit, CheckCircle2, Pill, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { AdherenceRing } from "../../components/ui/AdherenceRing";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { useAppData } from "../../data/AppDataContext";
import type { DoseEvent } from "../../types";

function doseStatusBadge(status: DoseEvent["status"], takenAt?: string) {
  if (status === "taken")
    return (
      <Badge tone="sage" icon={<CheckCircle2 className="h-3 w-3" />}>
        Taken {takenAt}
      </Badge>
    );
  if (status === "pending") return <Badge tone="gold">Pending</Badge>;
  if (status === "missed") return <Badge tone="brick">Missed</Badge>;
  return <Badge tone="neutral">Scheduled</Badge>;
}

function riskLabel(band: "low" | "medium" | "high") {
  return band === "high" ? "High risk" : band === "medium" ? "Moderate risk" : "Low risk";
}

export function PatientDashboard() {
  const {
    patient,
    medicines,
    alerts,
    adherenceRate,
    logDose,
    sosActive,
    toggleSos,
    riskAssessment,
  } = useAppData();

  const riskPercent = Math.round(riskAssessment.overall.score * 100);
  const topRisk = [...riskAssessment.perMedicine].sort(
    (a, b) => b.risk.score - a.risk.score,
  )[0];

  const missed = medicines.reduce(
    (count, medicine) => count + medicine.doses.filter((d) => d.status === "missed").length,
    0,
  );
  const pending = medicines.reduce(
    (count, medicine) => count + medicine.doses.filter((d) => d.status === "pending").length,
    0,
  );
  const lowStock = medicines.filter((m) => m.stock <= m.lowStockThreshold).length;

  return (
    <div className="patient-dashboard screen-page flex min-h-0 flex-col gap-3 overflow-hidden">
      <div className="dashboard-header flex shrink-0 items-center justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-ink-700/20 bg-ink-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-500">
            <TrendingUp className="h-3.5 w-3.5" /> Patient overview
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-charcoal-900 sm:text-2xl">
            Good morning, {patient.name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-xs text-charcoal-500">
            Your medication plan, care network and AI adherence insight are up to date.
          </p>
        </div>
        <button
          onClick={toggleSos}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            sosActive
              ? "bg-brick-600 text-white shadow-lg shadow-brick-600/20"
              : "border border-brick-600/30 bg-brick-100 text-brick-700 hover:border-brick-600/50"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          {sosActive ? "Emergency alert sent" : "Emergency SOS"}
        </button>
      </div>

      <div className="dashboard-stats grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="dashboard-stat-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-500">Today's adherence</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold tracking-tight text-charcoal-900">{adherenceRate}%</p>
            <Badge tone={adherenceRate >= 80 ? "sage" : "gold"}>{adherenceRate >= 80 ? "On track" : "Needs attention"}</Badge>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper-200">
            <div className="h-full rounded-full bg-ink-700 transition-all" style={{ width: `${adherenceRate}%` }} />
          </div>
        </Card>

        <Card className="dashboard-stat-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-500">AI risk signal</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-charcoal-900">{riskPercent}%</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
              <BrainCircuit className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2"><RiskBadge risk={riskAssessment.overall} showModel /></div>
        </Card>

        <Card className="dashboard-stat-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-500">Needs attention</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-2xl font-semibold tracking-tight text-charcoal-900">{pending + missed}</p>
            <span className="pb-1 text-xs text-charcoal-500">dose signals</span>
          </div>
          <p className="mt-2 text-xs text-charcoal-500">{pending} pending · {missed} missed · {lowStock} low stock</p>
        </Card>

        <Card className="dashboard-stat-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-500">Care network</p>
          <p className="mt-2 text-base font-semibold text-charcoal-900">Connected</p>
          <p className="mt-1 text-xs text-charcoal-500">Caregiver + physician can see adherence updates.</p>
        </Card>
      </div>

      <div className="dashboard-main min-h-0 flex-1 grid gap-2 overflow-hidden xl:grid-cols-[1.45fr_.75fr]">
        <Card className="dashboard-medicines min-h-0 overflow-hidden">
          <CardHeader
            title="Today's medicines"
            subtitle="Log each dose as you take it. Changes recalculate the AI risk signal."
          />
          <div className="min-h-0 space-y-2 overflow-hidden">
            {medicines.map((med) => {
              const nextDose = med.doses.find((d) => d.status !== "taken");
              return (
                <div key={med.id} className="flex min-h-[78px] items-center gap-3 rounded-xl border border-paper-200 bg-paper-50 px-3 py-2.5 transition-colors hover:border-ink-700/30">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
                      <Pill className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-charcoal-900">{med.name} <span className="text-xs font-normal text-charcoal-500">{med.dosage}</span></p>
                      <p className="mt-0.5 text-xs text-charcoal-500">{med.compartment} · Stock: {med.stock}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {med.doses.map((d) => <span key={d.id}>{doseStatusBadge(d.status, d.takenAt)}</span>)}
                      </div>
                    </div>
                  </div>
                  {nextDose && (
                    <button onClick={() => logDose(med.id, nextDose.id)} className="ml-auto flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ink-700/40 bg-ink-100 px-3 py-2 text-[11px] font-semibold text-ink-500 transition-all hover:bg-ink-800 hover:text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark taken
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="dashboard-side min-h-0 grid grid-rows-[1fr_auto] gap-2 overflow-hidden">
          <Card className="min-h-0 overflow-hidden border-ink-700/20 bg-[radial-gradient(circle_at_top_right,rgba(53,173,124,.12),transparent_42%),#0d1012] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-600"><BrainCircuit className="h-4.5 w-4.5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal-900">AI adherence insight</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-500">Browser ML prototype</p>
                  </div>
                </div>
              </div>
              <RiskBadge risk={riskAssessment.overall} />
            </div>

            <div className="mt-3 flex items-center gap-4">
              <AdherenceRing percent={riskPercent} size={82} label="risk score" mode="risk" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal-900">{riskLabel(riskAssessment.overall.band)}</p>
                <p className="mt-1 text-xs leading-5 text-charcoal-500">
                  The model estimates the likelihood of a future missed dose from recent medication behavior.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-paper-200 pt-3 text-xs">
              <div className="flex justify-between"><span className="text-charcoal-500">Missed doses</span><span className="font-medium text-charcoal-900">{missed}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Pending doses</span><span className="font-medium text-gold-500">{pending}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Low-stock medicines</span><span className="font-medium text-charcoal-900">{lowStock}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Highest-risk medicine</span><span className="font-medium text-charcoal-900">{topRisk?.medicine.name ?? "—"}</span></div>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-ink-700/20 bg-ink-100/60 p-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" />
              <p className="text-[11px] leading-5 text-charcoal-500">Decision-support prototype only. It does not diagnose conditions or replace medical advice.</p>
            </div>
          </Card>

          <Card className="min-h-0 overflow-hidden p-4">
            <CardHeader title="Alerts" subtitle="Signals your care team may need to review" />
            <div className="space-y-1.5">
              {alerts.filter((a) => !a.acknowledged).map((a) => (
                <div key={a.id} className="rounded-xl border border-paper-200 bg-paper-50 p-2.5">
                  <Badge tone={a.severity === "critical" ? "brick" : "gold"}>{a.type === "missed_dose" ? "Missed dose" : "Low stock"}</Badge>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-700">{a.message}</p>
                </div>
              ))}
              {alerts.filter((a) => !a.acknowledged).length === 0 && <p className="text-sm text-charcoal-500">No active alerts.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
