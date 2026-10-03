import { useEffect, useState } from "react";
import { CheckCircle2, Info, PackageX, TriangleAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { patientDataApi, type AlertRecord } from "../../api/patientData";

const icons:any = { missed_dose: TriangleAlert, low_stock: PackageX, vitals: TriangleAlert, emergency: TriangleAlert, handoff_note: Info, clinical_note: Info, care_observation: Info };
export function CaregiverAlerts() {
  const [alerts,setAlerts]=useState<AlertRecord[]>([]); const [error,setError]=useState("");
  const load=()=>patientDataApi.getAlerts().then(x=>setAlerts(x.alerts)).catch(e=>setError(e instanceof Error?e.message:"Unable to load alerts."));
  useEffect(()=>{void load();},[]);
  const acknowledge=async(id:number)=>{try{await patientDataApi.acknowledgeAlert(id);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to acknowledge alert.");}};
  return <div className="space-y-6"><div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Alerts</h1><p className="mt-1 text-sm text-charcoal-500">Alerts from all patients connected to your caregiver account.</p></div>{error&&<Card><p className="text-sm text-brick-700">{error}</p></Card>}<div className="space-y-3">{!alerts.length&&!error&&<Card><p className="text-sm text-charcoal-500">No alerts recorded.</p></Card>}{alerts.map(a=>{const Icon=icons[a.type]||Info;return <Card key={a.id}><div className="flex items-start gap-3.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.severity==="HIGH"?"bg-brick-100 text-brick-700":"bg-gold-100 text-gold-700"}`}><Icon className="h-4.5 w-4.5"/></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={a.severity==="HIGH"?"brick":"gold"}>{a.type.replaceAll("_"," ")}</Badge><span className="text-xs text-charcoal-500">{new Date(a.createdAt).toLocaleString()}</span>{a.read&&<Badge tone="sage">Acknowledged</Badge>}</div><p className="mt-2 text-sm leading-relaxed text-charcoal-700">{a.message}</p>{!a.read&&<button onClick={()=>acknowledge(a.id)} className="mt-3 flex items-center gap-1.5 rounded-lg border border-paper-300 px-3 py-1.5 text-xs font-semibold text-charcoal-700 hover:bg-paper-100"><CheckCircle2 className="h-3.5 w-3.5"/>Acknowledge</button>}</div></div></Card>})}</div></div>;
}
