import { useEffect, useState } from "react";
import { ChevronRight, Link2, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { roleDataApi, type PatientBundle } from "../../api/roleData";

export function CaregiverPatients(){
  const [patients,setPatients]=useState<PatientBundle[]>([]);
  const [error,setError]=useState("");
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const nav=useNavigate();
  const load=()=>roleDataApi.getPatients("caregiver").then(x=>setPatients(x.patients)).catch(e=>setError(e instanceof Error?e.message:"Unable to load patients."));
  useEffect(()=>{void load();},[]);
  const connect=async()=>{
    if(!email.trim())return;
    try{const r=await roleDataApi.connect(email.trim());setMessage(r.message||"Patient connected successfully.");setEmail("");await load();}
    catch(e){setMessage(e instanceof Error?e.message:"Unable to connect patient.");}
  };
  return <div className="space-y-6">
    <div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Patients</h1><p className="mt-1 text-sm text-charcoal-500">Patients connected to your caregiver account.</p></div>
    <Card>
      <CardHeader title="Connect a patient" subtitle="Enter the patient's HealthSync account email. Once connected, the patient, caregiver and physician can share authorized updates." />
      <div className="flex flex-col gap-2 sm:flex-row"><input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void connect();}} placeholder="Patient account email" className="min-w-0 flex-1 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2.5 text-sm outline-none focus:border-ink-700"/><button onClick={connect} className="flex items-center justify-center gap-2 rounded-xl bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white"><Link2 className="h-3.5 w-3.5"/>Connect patient</button></div>
      {message&&<p className="mt-2 text-xs text-charcoal-500">{message}</p>}
    </Card>
    {error&&<Card><p className="text-sm text-brick-700">{error}</p></Card>}
    {!patients.length&&!error&&<Card><div className="flex items-center gap-3 text-sm text-charcoal-500"><Users2 className="h-5 w-5"/>No connected patients yet. Connect a patient above.</div></Card>}
    <div className="space-y-3">{patients.map(b=><button key={b.patient.id} onClick={()=>nav(`/caregiver/patients/${b.patient.id}`)} className="flex w-full items-center justify-between rounded-2xl border border-paper-200 bg-paper-0 p-4 text-left hover:border-ink-700/30"><div><p className="font-semibold text-charcoal-900">{b.patient.name}</p><p className="mt-1 text-xs text-charcoal-500">{b.patient.patientCode} · {b.medications.length} medicines · {b.vitals.length} vitals</p><div className="mt-2 flex flex-wrap gap-1.5">{(b.careTeam||[]).map(m=><Badge key={m.id} tone={m.role==='doctor'?"ink":"neutral"}>{m.role}: {m.name}</Badge>)}</div></div><div className="flex items-center gap-3"><Badge tone={b.adherenceRate>=80?"sage":"gold"}>{b.adherenceRate}% adherence</Badge><ChevronRight className="h-4 w-4 text-charcoal-500"/></div></button>)}</div>
  </div>;
}
