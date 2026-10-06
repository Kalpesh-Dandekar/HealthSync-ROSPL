import { useEffect, useState } from "react";
import { Activity, BellRing, ChevronRight, Link2, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { roleDataApi, type PatientBundle } from "../../api/roleData";

export function CaregiverPatients() {
  const [patients, setPatients] = useState<PatientBundle[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const load = () => roleDataApi.getPatients("caregiver").then((data) => setPatients(data.patients)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load patients."));
  useEffect(() => { void load(); }, []);

  const connect = async () => {
    if (!email.trim()) return;
    try {
      const result = await roleDataApi.redeemCaregiverInvite(email.trim());
      setMessage(result.message || "Patient connected successfully.");
      setEmail("");
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to connect patient.");
    }
  };

  return <div className="caregiver-directory space-y-6">
    <div><p className="caregiver-eyebrow">Care coordination</p><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Connected patients</h1><p className="mt-1 text-sm text-charcoal-500">Review the people in your care circle and open a complete support record.</p></div>
    <Card className="caregiver-connect-panel">
      <div className="caregiver-connect-panel__heading"><span><Link2/></span><CardHeader title="Connect a patient" subtitle="Enter the one-time invite code shared by the patient." /></div>
      <div className="flex flex-col gap-2 sm:flex-row"><input value={email} onChange={(event) => setEmail(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") void connect(); }} placeholder="Caregiver invite code" className="min-w-0 flex-1 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2.5 text-sm uppercase outline-none focus:border-ink-700"/><button onClick={connect} className="flex items-center justify-center gap-2 rounded-xl bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white"><Link2 className="h-3.5 w-3.5"/>Connect patient</button></div>
      {message && <p className="mt-2 text-xs text-charcoal-500">{message}</p>}
    </Card>
    {error && <Card><p className="text-sm text-brick-700">{error}</p></Card>}
    {!patients.length && !error && <Card className="caregiver-directory-empty"><span><Users2/></span><div><p className="font-semibold text-charcoal-900">Your care circle is ready to grow</p><p className="mt-1 text-sm text-charcoal-500">Connect with a patient invite code to begin coordinating medications, readings, and alerts.</p></div></Card>}
    <div className="caregiver-patient-list">{patients.map((bundle) => {
      const unread = bundle.alerts?.filter((alert) => !alert.read).length || 0;
      const latest = bundle.vitals?.[0];
      return <button key={bundle.patient.id} onClick={() => navigate(`/caregiver/patients/${bundle.patient.id}`)} className="caregiver-patient-row">
        <div className="caregiver-patient-row__identity"><span>{bundle.patient.name.slice(0, 1).toUpperCase()}</span><div><p className="font-semibold text-charcoal-900">{bundle.patient.name}</p><p className="mt-1 text-xs text-charcoal-500">{bundle.patient.patientCode} · {bundle.medications.length} medicines</p></div></div>
        <div className="caregiver-patient-row__signals"><span><Activity/> {latest ? "Latest reading available" : "No recent reading"}</span><span className={unread ? "has-alert" : ""}><BellRing/> {unread} active alert{unread === 1 ? "" : "s"}</span></div>
        <div className="caregiver-patient-row__action"><Badge tone={bundle.adherenceRate >= 80 ? "sage" : "gold"}>{bundle.adherenceRate}% adherence</Badge><ChevronRight/></div>
      </button>;
    })}</div>
  </div>;
}
