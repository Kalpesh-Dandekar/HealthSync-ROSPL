import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Send, Users2 } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { AdherenceRing } from "../../components/ui/AdherenceRing";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { roleDataApi, type PatientBundle } from "../../api/roleData";
import { assessPatientRisk } from "../../ml/riskModel";
import type { Medicine } from "../../types";

function toMedicines(bundle: PatientBundle): Medicine[] {
  return bundle.medications.map((m:any) => { const log=m.logs?.[0]; const status=log?.status==="TAKEN"?"taken":log?.status==="MISSED"?"missed":"pending"; return { id:String(m.id), name:m.name, dosage:m.dosage, frequency:m.schedule, compartment:m.schedule, stock:m.stock, lowStockThreshold:6, doses:[{id:log?`log-${log.id}`:`med-${m.id}-dose`,time:log?new Date(log.scheduledAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):m.schedule,status,takenAt:log?.takenAt?new Date(log.takenAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):undefined}]}; });
}

export function CaregiverDashboard() {
  const [patients,setPatients]=useState<PatientBundle[]>([]); const [selectedId,setSelectedId]=useState<number|null>(null); const [message,setMessage]=useState(""); const [observation,setObservation]=useState(""); const [error,setError]=useState("");
  const load=()=>roleDataApi.getPatients("caregiver").then(x=>{setPatients(x.patients); if(!selectedId&&x.patients[0]) setSelectedId(x.patients[0].patient.id);}).catch(e=>setError(e instanceof Error?e.message:"Unable to load connected patients."));
  useEffect(()=>{void load();},[]);
  const selected=patients.find(p=>p.patient.id===selectedId)||patients[0];
  const medicines=useMemo(()=>selected?toMedicines(selected):[],[selected]);
  const risk=useMemo(()=>assessPatientRisk(medicines),[medicines]);
  const alerts=selected?.alerts||[]; const unack=alerts.filter(a=>!a.read); const feed=medicines.flatMap(m=>m.doses.map(d=>({medicine:m.name,dosage:m.dosage,...d}))); 
  const submitObservation=async()=>{if(!observation.trim()||!selected)return;try{await fetch(`${import.meta.env.VITE_API_URL||"http://localhost:5000/api"}/caregiver/patients/${selected.patient.id}/observation`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("healthsync_token")||""}`},body:JSON.stringify({note:observation.trim()})});setObservation("");setMessage("Observation shared with the care team.");await load();}catch{setMessage("Unable to save observation.");}};
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Caregiver dashboard</h1><p className="mt-1 text-sm text-charcoal-500">Monitor the patients connected to your caregiver account.</p></div><div className="flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-xs text-charcoal-600"><Users2 className="h-4 w-4"/>{patients.length} connected patient{patients.length===1?"":"s"}</div></div>
    {error&&<Card><p className="text-sm text-brick-700">{error}</p></Card>}
    {patients.length>0&&<Card><CardHeader title="Patient selection" subtitle="Choose which connected patient to monitor on this dashboard."/><div className="flex flex-wrap gap-2">{patients.map(p=><button key={p.patient.id} onClick={()=>setSelectedId(p.patient.id)} className={`rounded-xl border px-3.5 py-2 text-left ${selected?.patient.id===p.patient.id?"border-ink-700 bg-ink-100":"border-paper-300 bg-paper-0"}`}><p className="text-sm font-semibold text-charcoal-900">{p.patient.name}</p><p className="text-[11px] text-charcoal-500">{p.patient.patientCode} · {p.adherenceRate}% adherence</p></button>)}</div></Card>}
    {!selected&&<Card><p className="text-sm text-charcoal-500">No connected patients yet. Add a patient from Care Network.</p></Card>}
    {selected&&<>
      {unack.some(a=>a.type==="emergency")&&<div className="flex items-center gap-3 rounded-xl border border-brick-600/30 bg-brick-100 px-4 py-3"><AlertTriangle className="h-5 w-5 text-brick-700"/><div><p className="text-sm font-semibold text-brick-700">Emergency alert — {selected.patient.name}</p><p className="text-xs text-brick-700/80">An active SOS is recorded for this patient.</p></div></div>}
      <div><h2 className="font-display text-lg font-semibold text-charcoal-900">Watching over {selected.patient.name}</h2><p className="mt-1 text-sm text-charcoal-500">Live medication adherence, alerts and care observations from PostgreSQL.</p></div>
      <div className="grid gap-6 lg:grid-cols-3"><Card className="flex flex-col items-center justify-center"><AdherenceRing percent={selected.adherenceRate}/><div className="mt-3"><RiskBadge risk={risk.overall} showModel/></div>{unack.length>0&&<p className="mt-3 text-center text-xs text-brick-700">{unack.length} alert{unack.length>1?"s":""} need attention</p>}</Card><Card className="lg:col-span-2"><CardHeader title="Live dose feed" subtitle="Latest medication logs for the selected patient"/><div className="space-y-2.5">{feed.length===0&&<p className="text-sm text-charcoal-500">No medication logs recorded.</p>}{feed.map(d=><div key={d.id} className="flex items-center justify-between rounded-lg border border-paper-200 px-3.5 py-2.5"><div className="flex items-center gap-2.5"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${d.status==="taken"?"bg-sage-100 text-sage-700":"bg-paper-100 text-charcoal-500"}`}>{d.status==="taken"?<CheckCircle2 className="h-3.5 w-3.5"/>:<Clock className="h-3.5 w-3.5"/>}</span><div><p className="text-sm font-medium text-charcoal-900">{d.medicine} <span className="text-xs font-normal text-charcoal-500">{d.dosage}</span></p><p className="text-xs text-charcoal-500">Scheduled {d.time}</p></div></div><Badge tone={d.status==="taken"?"sage":"neutral"}>{d.status==="taken"?`Taken ${d.takenAt||""}`:"Waiting"}</Badge></div>)}</div></Card></div>
      <Card><CardHeader title="Adherence risk model" subtitle="Risk calculated from the selected patient's recorded dosing patterns."/><div className="space-y-2.5">{risk.perMedicine.map(({medicine,risk:r})=><div key={medicine.id} className="flex items-center justify-between rounded-lg border border-paper-200 px-3.5 py-2.5"><p className="text-sm font-medium text-charcoal-900">{medicine.name}</p><RiskBadge risk={r}/></div>)}</div></Card>
      <Card><CardHeader title="Care observation" subtitle="Share a day-to-day observation with the connected care team"/><textarea value={observation} onChange={e=>setObservation(e.target.value)} rows={3} placeholder="Example: Patient felt dizzy after breakfast…" className="w-full rounded-xl border border-paper-300 p-3 text-sm outline-none focus:border-ink-700"/><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-charcoal-500">{message}</p><button onClick={submitObservation} className="flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2 text-xs font-semibold text-white"><Send className="h-3.5 w-3.5"/>Share observation</button></div></Card>
    </>}
  </div>;
}
