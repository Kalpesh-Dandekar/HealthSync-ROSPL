import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, Send, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { AdherenceRing } from "../../components/ui/AdherenceRing";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { roleDataApi, type EmergencyRecord, type PatientBundle } from "../../api/roleData";
import { assessPatientRisk } from "../../ml/riskModel";
import type { Medicine } from "../../types";

function toMedicines(bundle: PatientBundle): Medicine[] {
  return bundle.medications.map((medication: any) => {
    const log = medication.logs?.[0];
    const status = log?.status === "TAKEN" ? "taken" : log?.status === "MISSED" ? "missed" : "pending";
    return { id: String(medication.id), name: medication.name, dosage: medication.dosage, frequency: medication.schedule, compartment: medication.schedule, stock: medication.stock, lowStockThreshold: 6, doses: [{ id: log ? `log-${log.id}` : `med-${medication.id}-dose`, time: log ? new Date(log.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : medication.schedule, status, takenAt: log?.takenAt ? new Date(log.takenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined }] };
  });
}

export function CaregiverDashboard() {
  const [patients, setPatients] = useState<PatientBundle[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState("");
  const [emergencies,setEmergencies]=useState<EmergencyRecord[]>([]);
  const load = () => Promise.all([roleDataApi.getPatients("caregiver"),roleDataApi.getEmergencies()]).then(([data,emergencyData]) => { setPatients(data.patients); setEmergencies(emergencyData.emergencies); if (!selectedId && data.patients[0]) setSelectedId(data.patients[0].patient.id); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load connected patients."));
  useEffect(() => { void load(); const refresh=()=>void load(); window.addEventListener("healthsync:realtime",refresh); return()=>window.removeEventListener("healthsync:realtime",refresh); }, []);

  const selected = patients.find((bundle) => bundle.patient.id === selectedId) || patients[0];
  const medicines = useMemo(() => selected ? toMedicines(selected) : [], [selected]);
  const risk = useMemo(() => assessPatientRisk(medicines), [medicines]);
  const alerts = selected?.alerts || [];
  const unacknowledged = alerts.filter((alert) => !alert.read);
  const feed = medicines.flatMap((medicine) => medicine.doses.map((dose) => ({ medicine: medicine.name, dosage: medicine.dosage, ...dose })));
  const attentionCount = patients.filter((bundle) => bundle.adherenceRate < 80 || bundle.alerts.some((alert) => !alert.read)).length;
  const activeAlertCount = patients.reduce((count, bundle) => count + bundle.alerts.filter((alert) => !alert.read).length, 0) + emergencies.filter(item=>item.active).length;
  const selectedEmergency=emergencies.find(item=>item.patientId===selected?.patient.id&&item.active);
  const upcomingCount = patients.reduce((count, bundle) => count + bundle.appointments.filter((appointment) => ["upcoming", "Scheduled", "Confirmed", "REQUESTED", "CONFIRMED"].includes(appointment.status)).length, 0);

  const submitObservation = async () => {
    if (!observation.trim() || !selected) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/caregiver/patients/${selected.patient.id}/observation`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("healthsync_token") || ""}` }, body: JSON.stringify({ note: observation.trim() }) });
      setObservation(""); setMessage("Observation shared with the care team."); await load();
    } catch { setMessage("Unable to save observation."); }
  };

  return <div className="caregiver-dashboard">
    <header className="caregiver-dashboard__header"><div><p><Users2 />Connected care overview</p><h1>Caregiver workspace</h1><span>Monitor connected patients, medication activity, care signals and upcoming follow-ups from one place.</span></div></header>
    <section className="caregiver-metrics" aria-label="Care summary">
      <article><span><Users2 /></span><div><p>Connected patients</p><strong>{patients.length}</strong><small>People in your care</small></div></article>
      <article><span><Activity /></span><div><p>Needs attention</p><strong>{attentionCount}</strong><small>Adherence or care signals</small></div></article>
      <article><span><AlertTriangle /></span><div><p>Active alerts</p><strong>{activeAlertCount}</strong><small>Unacknowledged signals</small></div></article>
      <article><span><CalendarClock /></span><div><p>Upcoming care</p><strong>{upcomingCount}</strong><small>Scheduled follow-ups</small></div></article>
    </section>
    {error && <div className="caregiver-status-message">{error}</div>}
    {patients.length > 0 && <section className="caregiver-selector"><div><p>People you care for</p><span>Select a connected patient to review current care activity.</span></div><div>{patients.map((bundle) => <button key={bundle.patient.id} onClick={() => setSelectedId(bundle.patient.id)} className={selected?.patient.id === bundle.patient.id ? "is-active" : ""}><strong>{bundle.patient.name}</strong><small>{bundle.patient.patientCode} · {bundle.adherenceRate}% adherence</small></button>)}</div></section>}
    {!selected && <section className="caregiver-empty"><span className="caregiver-empty__icon"><Users2 /></span><div className="caregiver-empty__copy"><small>Care circle</small><h2>Your care circle is ready</h2><p>Connect a patient to begin coordinating medication activity, care alerts and upcoming follow-ups.</p><div className="caregiver-empty__actions"><Link className="is-primary" to="/caregiver/patients">Connect a patient <ArrowRight /></Link><Link to="/caregiver/care-network">Open Care Network</Link></div></div></section>}
    {selected && <>
      {selectedEmergency && <div className="caregiver-emergency"><AlertTriangle /><div><p>Emergency alert — {selected.patient.name}</p><span>{selectedEmergency.status==="ACKNOWLEDGED"?`${selectedEmergency.respondingPhysician?.name || "A physician"} is responding.`:"Awaiting a physician response."}</span></div></div>}
      <div className="caregiver-section-heading"><div><p>Care overview</p><h2>Watching over {selected.patient.name}</h2></div><span>Live care activity</span></div>
      <div className="grid gap-4 lg:grid-cols-3"><Card className="flex flex-col items-center justify-center"><AdherenceRing percent={selected.adherenceRate} /><div className="mt-3"><RiskBadge risk={risk.overall} showModel /></div>{unacknowledged.length > 0 && <p className="mt-3 text-center text-xs text-brick-700">{unacknowledged.length} alert{unacknowledged.length > 1 ? "s" : ""} need attention</p>}</Card><Card className="lg:col-span-2"><CardHeader title="Live dose feed" subtitle="Latest medication logs for the selected patient" /><div className="space-y-2.5">{feed.length === 0 && <p className="caregiver-inline-empty">No medication logs recorded.</p>}{feed.map((dose) => <div key={dose.id} className="flex items-center justify-between rounded-lg border border-paper-200 px-3.5 py-2.5"><div className="flex items-center gap-2.5"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${dose.status === "taken" ? "bg-sage-100 text-sage-700" : "bg-paper-100 text-charcoal-500"}`}>{dose.status === "taken" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}</span><div><p className="text-sm font-medium text-charcoal-900">{dose.medicine} <span className="text-xs font-normal text-charcoal-500">{dose.dosage}</span></p><p className="text-xs text-charcoal-500">Scheduled {dose.time}</p></div></div><Badge tone={dose.status === "taken" ? "sage" : "neutral"}>{dose.status === "taken" ? `Taken ${dose.takenAt || ""}` : "Waiting"}</Badge></div>)}</div></Card></div>
      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader title="Adherence risk" subtitle="Calculated from recorded dosing patterns" /><div className="space-y-2.5">{risk.perMedicine.length === 0 && <p className="caregiver-inline-empty">No medication risk signals yet.</p>}{risk.perMedicine.map(({ medicine, risk: medicineRisk }) => <div key={medicine.id} className="flex items-center justify-between rounded-lg border border-paper-200 px-3.5 py-2.5"><p className="text-sm font-medium text-charcoal-900">{medicine.name}</p><RiskBadge risk={medicineRisk} /></div>)}</div></Card><Card><CardHeader title="Care observation" subtitle="Share a day-to-day observation with the connected care team" /><textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={3} placeholder="Example: Patient felt dizzy after breakfast…" className="w-full rounded-xl border border-paper-300 p-3 text-sm outline-none focus:border-ink-700" /><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-charcoal-500">{message}</p><button onClick={submitObservation} className="flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2 text-xs font-semibold text-white"><Send className="h-3.5 w-3.5" />Share observation</button></div></Card></div>
    </>}
  </div>;
}
