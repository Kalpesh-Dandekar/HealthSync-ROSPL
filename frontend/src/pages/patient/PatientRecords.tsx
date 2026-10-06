import { useEffect, useState } from "react";
import { CalendarDays, Download, HeartPulse, Pill, Stethoscope, UserRound } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ClinicalRecordList } from "../../components/clinical/ClinicalRecordList";
import { clinicalRecordApi, type ClinicalRecord } from "../../api/clinicalRecordApi";
import { useAppData } from "../../data/AppDataContext";

export function PatientRecords() {
  const { patient, medicines, vitals, appointments } = useAppData();
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>([]);
  const [clinicalState, setClinicalState] = useState("Loading clinical records…");
  const latest = vitals[0];

  useEffect(() => {
    let active = true;
    clinicalRecordApi.list().then(result => { if (active) { setClinicalRecords(result.records); setClinicalState(""); } }).catch(() => { if (active) setClinicalState("Unable to load clinical records. Please try again."); });
    return () => { active = false; };
  }, []);

  const exportRecord = () => {
    const clinical = clinicalRecords.map(record => `${record.clinicalDate} — ${record.title}\nType: ${record.type}\nPhysician: ${record.physicianName}\nStatus: ${record.status}\nFindings: ${record.findings}\nInterpretation: ${record.interpretation}\nRecommendations: ${record.recommendations}${record.followUpRequired ? `\nFollow-up: ${record.followUpDate || "required"}` : ""}`).join("\n\n");
    const content = `HealthSync health record\nPatient: ${patient.name || "Patient"}\nPatient ID: ${patient.patientCode || "Not available"}\n\nClinical records\n${clinical || "No clinical records available."}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "healthsync-health-record.txt"; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="patient-workspace-page patient-records space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Health record</h1><p className="mt-1 text-sm text-charcoal-500">Live information currently stored for your account.</p></div><button onClick={exportRecord} className="flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2 text-xs font-semibold text-charcoal-700 hover:bg-paper-100"><Download className="h-3.5 w-3.5"/>Export record</button></div>
    <Card><CardHeader title="Patient information" action={<span className="record-section-icon"><UserRound/></span>}/><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-charcoal-500">Name</p><p className="mt-1 font-semibold">{patient.name || "—"}</p></div><div><p className="text-xs text-charcoal-500">Patient ID</p><p className="mt-1 font-semibold">{patient.patientCode || "—"}</p></div><div><p className="text-xs text-charcoal-500">Caregiver</p><p className="mt-1 font-semibold">{patient.primaryCaregiver}</p></div><div><p className="text-xs text-charcoal-500">Physician</p><p className="mt-1 font-semibold">{patient.physician}</p></div></div></Card>
    <Card><CardHeader title="Clinical records" subtitle={`${clinicalRecords.length} physician-authored record${clinicalRecords.length === 1 ? "" : "s"}`} action={<span className="record-section-icon"><Stethoscope/></span>}/>{clinicalState ? <p className="record-empty text-sm text-charcoal-500">{clinicalState}</p> : <ClinicalRecordList records={clinicalRecords}/>}</Card>
    <Card><CardHeader title="Medications" subtitle={`${medicines.length} stored medication${medicines.length === 1 ? "" : "s"}`} action={<span className="record-section-icon"><Pill/></span>}/>{medicines.length ? medicines.map(medicine => <div key={medicine.id} className="mb-2 rounded-lg border border-paper-200 bg-paper-50 px-3.5 py-2.5"><p className="font-semibold">{medicine.name} <span className="text-xs font-normal text-charcoal-500">{medicine.dosage}</span></p><p className="text-xs text-charcoal-500">{medicine.frequency} · Stock {medicine.stock}</p></div>) : <p className="record-empty text-sm text-charcoal-500"><Pill/>No medications have been added yet.</p>}</Card>
    <Card><CardHeader title="Latest health readings" action={<span className="record-section-icon"><HeartPulse/></span>}/>{latest ? <div className="flex flex-wrap gap-2"><Badge tone="sage">HR {latest.heartRate || "—"}</Badge><Badge tone="sage">BP {latest.bpSys || "—"}/{latest.bpDia || "—"}</Badge><Badge tone="sage">Glucose {latest.glucose || "—"}</Badge></div> : <p className="record-empty text-sm text-charcoal-500"><HeartPulse/>No vital readings have been added yet.</p>}</Card>
    <Card><CardHeader title="Appointments" action={<span className="record-section-icon"><CalendarDays/></span>}/>{appointments.length ? appointments.map(appointment => <div key={appointment.id} className="mb-2 rounded-lg border border-paper-200 px-3.5 py-2.5"><p className="font-semibold">{appointment.reason}</p><p className="text-xs text-charcoal-500">{appointment.withName} · {appointment.date} at {appointment.time}</p></div>) : <p className="record-empty text-sm text-charcoal-500"><CalendarDays/>No appointments have been added yet.</p>}</Card>
  </div>;
}
