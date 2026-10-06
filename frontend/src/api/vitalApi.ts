const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
function token(){ return localStorage.getItem("healthsync_token") || ""; }
async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token()?{Authorization:`Bearer ${token()}`}:{}) ,...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message||"Request failed.");
  return data as T;
}
export type VitalSource = "PATIENT" | "PHYSICIAN" | "CAREGIVER" | "LEGACY";
export interface VitalInput { heartRate:string; systolic:string; diastolic:string; glucose:string; }
export interface VitalRecord { id:number; userId:number; heartRate:number|null; systolic:number|null; diastolic:number|null; glucose:number|null; recordedAt:string; source:VitalSource; recordedBy:{id:number;name:string;role:"patient"|"doctor"|"caregiver"}|null; }
export const emptyVitalInput:VitalInput={heartRate:"",systolic:"",diastolic:"",glucose:""};
export const vitalApi={
  listOwn:()=>request<{vitals:VitalRecord[]}>("/vitals"),
  createOwn:(data:VitalInput)=>request<{vital:VitalRecord}>("/vitals",{method:"POST",body:JSON.stringify(data)}),
  listForPatient:(role:"doctor"|"caregiver",patientId:string|number)=>request<{vitals:VitalRecord[]}>(`/${role}/patients/${patientId}/vitals`),
  createForPatient:(role:"doctor"|"caregiver",patientId:string|number,data:VitalInput)=>request<{vital:VitalRecord}>(`/${role}/patients/${patientId}/vitals`,{method:"POST",body:JSON.stringify(data)}),
};
