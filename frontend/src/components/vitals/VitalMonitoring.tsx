import { FormEvent, useState } from "react";
import { HeartPulse } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";
import { emptyVitalInput, type VitalInput, type VitalRecord } from "../../api/vitalApi";

function recorderLabel(vital:VitalRecord){
  if(!vital.recordedBy || vital.source === "LEGACY") return "Legacy reading · recorder unavailable";
  const role=vital.source === "PHYSICIAN" ? "Physician" : vital.source === "CAREGIVER" ? "Caregiver" : "Patient";
  return `Recorded by ${role} ${vital.recordedBy.name}`;
}

export function VitalEntryForm({onSubmit,busy=false}:{onSubmit:(input:VitalInput)=>Promise<void>;busy?:boolean}){
  const [input,setInput]=useState<VitalInput>(emptyVitalInput);
  async function submit(event:FormEvent){event.preventDefault();await onSubmit(input);setInput(emptyVitalInput);}
  const fields:[keyof VitalInput,string,string][]=[["heartRate","Heart rate","BPM"],["systolic","Systolic","mmHg"],["diastolic","Diastolic","mmHg"],["glucose","Glucose","mg/dL"]];
  return <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">{fields.map(([key,label,unit])=><label key={key}><span className="mb-1 block text-[11px] font-semibold text-charcoal-500">{label} <span className="font-normal">({unit})</span></span><input type="number" step={key==="glucose"?"0.1":"1"} value={input[key]} onChange={event=>setInput({...input,[key]:event.target.value})} className="w-full rounded-xl border border-paper-300 p-2.5 text-sm"/></label>)}<button disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white sm:col-span-4"><HeartPulse className="h-3.5 w-3.5"/>{busy?"Saving…":"Save vital reading"}</button><p className="text-[11px] text-charcoal-500 sm:col-span-4">Enter at least one reading. Blood pressure requires both systolic and diastolic values.</p></form>;
}

export function VitalSummary({vitals}:{vitals:VitalRecord[]}){
  const latest=vitals[0]; const items=[{label:"Heart rate",value:latest?.heartRate??"—",unit:"BPM"},{label:"Blood pressure",value:latest?.systolic!=null&&latest?.diastolic!=null?`${latest.systolic}/${latest.diastolic}`:"—",unit:"mmHg"},{label:"Glucose",value:latest?.glucose??"—",unit:"mg/dL"}];
  return <div className="grid gap-3 sm:grid-cols-3">{items.map(item=><Card key={item.label} className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">{item.label}</p><div className="mt-2 flex items-baseline gap-1.5"><span className="text-2xl font-semibold text-charcoal-900">{item.value}</span><span className="text-xs text-charcoal-500">{item.unit}</span></div><p className="mt-2 text-[11px] text-charcoal-500">{latest?new Date(latest.recordedAt).toLocaleString():"No reading yet"}</p></Card>)}</div>;
}

export function VitalTrends({vitals}:{vitals:VitalRecord[]}){
  const data=[...vitals].reverse().map(v=>({...v,time:new Date(v.recordedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}));
  const charts=[{title:"Heart rate trend",keys:["heartRate"],colors:["#237757"]},{title:"Blood pressure trend",keys:["systolic","diastolic"],colors:["#287b73","#8b6429"]},{title:"Glucose trend",keys:["glucose"],colors:["#8b6429"]}];
  return <div className="grid gap-4 lg:grid-cols-3">{charts.map(chart=><Card key={chart.title} className="p-4"><h3 className="text-sm font-semibold text-charcoal-900">{chart.title}</h3><div className="mt-3 h-44">{data.length?<ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{left:-24,right:8}}><CartesianGrid strokeDasharray="3 3" stroke="#dce7e1"/><XAxis dataKey="time" fontSize={10} tickLine={false}/><YAxis fontSize={10} tickLine={false}/><Tooltip/>{chart.keys.map((key,index)=><Line key={key} type="monotone" dataKey={key} connectNulls stroke={chart.colors[index]} strokeWidth={2} dot={{r:2}}/>)}</LineChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-xs text-charcoal-500">No readings yet</div>}</div></Card>)}</div>;
}

export function VitalHistory({vitals,limit=12}:{vitals:VitalRecord[];limit?:number}){
  if(!vitals.length)return <p className="rounded-xl border border-dashed border-paper-300 p-4 text-sm text-charcoal-500">No vital readings have been recorded.</p>;
  return <div className="grid gap-2 sm:grid-cols-2">{vitals.slice(0,limit).map(v=><div key={v.id} className="rounded-xl border border-paper-200 bg-paper-50 p-3"><p className="text-xs font-semibold text-charcoal-900">{new Date(v.recordedAt).toLocaleString()}</p><p className="mt-1 text-xs text-charcoal-600">HR {v.heartRate??"—"} · BP {v.systolic??"—"}/{v.diastolic??"—"} · Glucose {v.glucose??"—"}</p><p className="mt-1 text-[10px] text-charcoal-500">{recorderLabel(v)}</p></div>)}</div>;
}
