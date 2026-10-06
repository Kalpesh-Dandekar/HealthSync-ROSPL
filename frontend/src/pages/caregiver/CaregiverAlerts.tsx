import { useEffect, useState } from "react";
import { CheckCircle2, Info, PackageX, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { patientDataApi, type AlertRecord } from "../../api/patientData";
import { roleDataApi, type EmergencyRecord } from "../../api/roleData";

const icons:Record<string,typeof Info>={missed_dose:TriangleAlert,low_stock:PackageX,vitals:TriangleAlert,emergency:TriangleAlert,handoff_note:Info,clinical_note:Info,care_observation:Info};

export function CaregiverAlerts(){
 const [alerts,setAlerts]=useState<AlertRecord[]>([]),[emergencies,setEmergencies]=useState<EmergencyRecord[]>([]),[feedback,setFeedback]=useState("");
 const load=()=>Promise.all([patientDataApi.getAlerts(),roleDataApi.getEmergencies()]).then(([a,e])=>{setAlerts(a.alerts);setEmergencies(e.emergencies);}).catch(cause=>setFeedback(cause instanceof Error?cause.message:"Unable to load alerts."));
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("healthsync:realtime",refresh);return()=>window.removeEventListener("healthsync:realtime",refresh);},[]);
 const acknowledge=async(id:number)=>{try{await patientDataApi.acknowledgeAlert(id);setFeedback("Alert acknowledged.");await load();}catch(cause){setFeedback(cause instanceof Error?cause.message:"Unable to acknowledge alert.");}};
 const acknowledgeEmergency=async(id:number)=>{try{await roleDataApi.acknowledgeEmergency(id);setFeedback("Emergency acknowledged.");await load();}catch(cause){setFeedback(cause instanceof Error?cause.message:"Unable to acknowledge emergency.");}};
 const caregiverId=(()=>{try{return Number(JSON.parse(localStorage.getItem("healthsync_user")||"{}").id||0);}catch{return 0;}})();
 return <div className="caregiver-alerts space-y-6">
  <div><p className="caregiver-eyebrow">Attention centre</p><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Care alerts</h1><p className="mt-1 text-sm text-charcoal-500">Prioritized updates from every patient connected to your caregiver account.</p></div>
  {feedback&&<div className="caregiver-status-message" role="status">{feedback}</div>}
  <div className="caregiver-alert-list">
   {!alerts.length&&!emergencies.length&&!feedback&&<Card className="caregiver-alerts-empty"><span><CheckCircle2/></span><div><p className="font-semibold text-charcoal-900">All caught up</p><p className="mt-1 text-sm text-charcoal-500">There are no care alerts requiring review right now.</p></div></Card>}
   {emergencies.map(emergency=>{const acknowledged=emergency.caregiverAcknowledgements.some(item=>item.caregiverId===caregiverId);return <Card key={`emergency-${emergency.id}`} className={`caregiver-alert caregiver-emergency-alert ${emergency.active?"is-active":"is-read"}`}><div className="caregiver-emergency-alert__top"><Badge tone={emergency.active?"brick":"sage"}>Emergency SOS · {emergency.status}</Badge><time>{new Date(emergency.createdAt).toLocaleString()}</time></div><div className="caregiver-emergency-alert__body"><span className="caregiver-alert__icon is-high"><TriangleAlert/></span><div><h2>{emergency.patientName}</h2><dl><div><dt>Triggered by</dt><dd>{emergency.triggeredBy.name} · {emergency.triggeredBy.role}</dd></div><div><dt>Status</dt><dd>{emergency.respondingPhysician?`Being handled by ${emergency.respondingPhysician.name}`:"Awaiting physician response"}</dd></div></dl><div className="caregiver-emergency-alert__actions">{emergency.active&&!acknowledged?<button onClick={()=>void acknowledgeEmergency(emergency.id)} className="caregiver-alert__action"><CheckCircle2/>Acknowledge</button>:<span className="caregiver-emergency-alert__ack"><CheckCircle2/>Acknowledged</span>}<Link to={`/caregiver/patients/${emergency.patientId}`} className="caregiver-alert__action">View patient</Link></div></div></div></Card>;})}
   {alerts.map(alert=>{const Icon=icons[alert.type]||Info;return <Card key={alert.id} className={`caregiver-alert ${alert.read?"is-read":"is-active"}`}><div className="flex items-start gap-3.5"><span className={`caregiver-alert__icon ${alert.severity==="HIGH"?"is-high":"is-medium"}`}><Icon/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={alert.severity==="HIGH"?"brick":"gold"}>{alert.type.replaceAll("_"," ")}</Badge><span className="text-xs text-charcoal-500">{new Date(alert.createdAt).toLocaleString()}</span>{alert.read&&<Badge tone="sage">Acknowledged</Badge>}</div><p className="mt-2 text-sm leading-relaxed text-charcoal-700">{alert.message}</p>{!alert.read&&<button onClick={()=>void acknowledge(alert.id)} className="caregiver-alert__action"><CheckCircle2/>Acknowledge</button>}</div></div></Card>;})}
  </div>
 </div>;
}
