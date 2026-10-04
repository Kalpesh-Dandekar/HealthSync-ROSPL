import { useEffect, useState } from "react";
import { CheckCircle2, Info, PackageX, TriangleAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { patientDataApi, type AlertRecord } from "../../api/patientData";

const icons: Record<string, typeof Info> = { missed_dose: TriangleAlert, low_stock: PackageX, vitals: TriangleAlert, emergency: TriangleAlert, handoff_note: Info, clinical_note: Info, care_observation: Info };

export function CaregiverAlerts() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [error, setError] = useState("");
  const load = () => patientDataApi.getAlerts().then((data) => setAlerts(data.alerts)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load alerts."));
  useEffect(() => { void load(); }, []);
  const acknowledge = async (id: number) => { try { await patientDataApi.acknowledgeAlert(id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to acknowledge alert."); } };

  return <div className="caregiver-alerts space-y-6">
    <div><p className="caregiver-eyebrow">Attention centre</p><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Care alerts</h1><p className="mt-1 text-sm text-charcoal-500">Prioritized updates from every patient connected to your caregiver account.</p></div>
    {error && <Card><p className="text-sm text-brick-700">{error}</p></Card>}
    <div className="caregiver-alert-list">
      {!alerts.length && !error && <Card className="caregiver-alerts-empty"><span><CheckCircle2/></span><div><p className="font-semibold text-charcoal-900">All caught up</p><p className="mt-1 text-sm text-charcoal-500">There are no care alerts requiring review right now.</p></div></Card>}
      {alerts.map((alert) => { const Icon = icons[alert.type] || Info; return <Card key={alert.id} className={`caregiver-alert ${alert.read ? "is-read" : "is-active"}`}><div className="flex items-start gap-3.5"><span className={`caregiver-alert__icon ${alert.severity === "HIGH" ? "is-high" : "is-medium"}`}><Icon/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={alert.severity === "HIGH" ? "brick" : "gold"}>{alert.type.replaceAll("_", " ")}</Badge><span className="text-xs text-charcoal-500">{new Date(alert.createdAt).toLocaleString()}</span>{alert.read && <Badge tone="sage">Acknowledged</Badge>}</div><p className="mt-2 text-sm leading-relaxed text-charcoal-700">{alert.message}</p>{!alert.read && <button onClick={() => acknowledge(alert.id)} className="caregiver-alert__action"><CheckCircle2/>Acknowledge</button>}</div></div></Card>; })}
    </div>
  </div>;
}
