import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarClock, Link2, Stethoscope, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { roleDataApi, type PatientBundle } from "../../api/roleData";

export function DoctorPatientList() {
  const [patients, setPatients] = useState<PatientBundle[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const load = () => roleDataApi.getPatients("doctor").then((data) => setPatients(data.patients)).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load patients."));
  useEffect(() => { void load(); }, []);

  const connect = async () => {
    if (!email.trim()) return;
    try {
      const response = await roleDataApi.connect(email.trim());
      setMessage(response.message || "Patient connected successfully.");
      setEmail("");
      await load();
    } catch (connectError) {
      setMessage(connectError instanceof Error ? connectError.message : "Unable to connect patient.");
    }
  };

  const attentionCount = patients.filter((bundle) => bundle.adherenceRate < 80 || bundle.alerts.some((alert) => !alert.read && !alert.acknowledged)).length;
  const activeAlerts = patients.reduce((count, bundle) => count + bundle.alerts.filter((alert) => !alert.read && !alert.acknowledged).length, 0);
  const upcomingCount = patients.reduce((count, bundle) => count + bundle.appointments.filter((appointment) => ["upcoming", "Scheduled", "Confirmed", "REQUESTED", "CONFIRMED"].includes(appointment.status)).length, 0);

  return (
    <div className="doctor-workspace-page doctor-overview">
      <header className="doctor-page-header">
        <div><p className="doctor-eyebrow"><Stethoscope /> Clinical overview</p><h1>Physician workspace</h1><p>Monitor connected patients, care signals and scheduled follow-ups from one clinical view.</p></div>
      </header>

      <section className="doctor-metrics" aria-label="Clinical workload summary">
        <article><span><UsersRound /></span><div><p>Connected patients</p><strong>{patients.length}</strong><small>Active clinical panel</small></div></article>
        <article><span><Activity /></span><div><p>Needs review</p><strong>{attentionCount}</strong><small>Adherence or alert signals</small></div></article>
        <article><span><AlertTriangle /></span><div><p>Active alerts</p><strong>{activeAlerts}</strong><small>Across connected patients</small></div></article>
        <article><span><CalendarClock /></span><div><p>Upcoming care</p><strong>{upcomingCount}</strong><small>Scheduled appointments</small></div></article>
      </section>

      <section className="doctor-connect-panel">
        <span className="doctor-connect-panel__icon"><Link2 /></span>
        <div className="doctor-connect-panel__copy"><p className="doctor-eyebrow">Panel access</p><h2>Connect a patient</h2><span>Add a patient using their HealthSync account email.</span></div>
        <div className="doctor-connect-panel__control"><input value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void connect(); }} placeholder="Patient account email" /><button onClick={connect}><Link2 />Connect patient</button></div>
        {message && <p className="doctor-connect-panel__message">{message}</p>}
      </section>

      {error && <div className="doctor-status-message is-error">{error}</div>}

      <section className="doctor-patient-panel" aria-labelledby="patient-panel-title">
        <div className="doctor-section-heading"><div><p className="doctor-eyebrow">Clinical panel</p><h2 id="patient-panel-title">Patients</h2></div><span>{patients.length} connected</span></div>
        {patients.length === 0 && !error ? (
          <div className="doctor-empty-state"><span><UsersRound /></span><div><h3>No connected patients yet</h3><p>Use the secure connection form above to add a patient to your clinical panel.</p></div></div>
        ) : (
          <div className="doctor-patient-list">
            {patients.map((bundle) => {
              const latestVital = bundle.vitals[0];
              const openAlerts = bundle.alerts.filter((alert) => !alert.read && !alert.acknowledged).length;
              const nextAppointment = bundle.appointments.find((appointment) => ["upcoming", "Scheduled", "Confirmed", "REQUESTED", "CONFIRMED"].includes(appointment.status));
              return (
                <button key={bundle.patient.id} onClick={() => navigate(`/doctor/patients/${bundle.patient.id}`)} className="doctor-patient-row">
                  <span className="doctor-patient-row__avatar">{String(bundle.patient.name || "P").charAt(0).toUpperCase()}</span>
                  <div className="doctor-patient-row__identity"><div><h3>{bundle.patient.name}</h3><code>{bundle.patient.patientCode}</code></div><p>{bundle.medications.length} medications · {bundle.vitals.length} vital readings</p><div>{(bundle.careTeam || []).map((member) => <Badge key={member.id} tone={member.role === "doctor" ? "ink" : "neutral"}>{member.role}: {member.name}</Badge>)}</div></div>
                  <div className="doctor-patient-row__signals"><div><small>Adherence</small><strong>{bundle.adherenceRate}%</strong></div><div><small>Latest HR</small><strong>{latestVital?.heartRate ?? "—"}</strong></div><div><small>Alerts</small><strong className={openAlerts ? "is-alert" : ""}>{openAlerts}</strong></div></div>
                  <div className="doctor-patient-row__care"><small>Next care</small><strong>{nextAppointment ? `${nextAppointment.date} · ${nextAppointment.time}` : "No visit scheduled"}</strong></div>
                  <span className="doctor-patient-row__action">Review <ArrowRight /></span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
