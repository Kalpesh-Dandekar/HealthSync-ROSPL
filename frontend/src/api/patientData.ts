import type { VitalInput, VitalRecord } from "./vitalApi";
export type { VitalRecord } from "./vitalApi";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
function token(){ return localStorage.getItem("healthsync_token") || ""; }
async function request<T>(path:string, options:RequestInit={}):Promise<T>{ const response=await fetch(`${API_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token()?{Authorization:`Bearer ${token()}`}:{}) ,...(options.headers||{})}}); const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||"Request failed."); return data as T; }
export interface MedicationLogRecord{id:number;status:"TAKEN"|"MISSED"|"PENDING";scheduledAt:string;takenAt:string|null;}
export interface MedicationRecord{id:number;name:string;dosage:string;schedule:string;stock:number;createdAt:string;logs?:MedicationLogRecord[];}
export interface AppointmentRecord{id:number;title:string;doctor:string;date:string;time:string;status:string;}
export interface AlertRecord{id:number;type:string;message:string;severity:"INFO"|"WARNING"|"HIGH";read:boolean;createdAt:string;}
export interface CareConnectionRecord{caregiver:{id:number;name:string;email:string;role:string}|null;physician:{id:number;name:string;email:string;role:string}|null;}
export const patientDataApi={
 getMedications:()=>request<{medications:MedicationRecord[]}>("/medications"),
 addMedication:(data:{name:string;dosage:string;schedule:string;stock:number})=>request<{medication:MedicationRecord}>("/medications",{method:"POST",body:JSON.stringify(data)}),
 deleteMedication:(id:number)=>request<{success:boolean}>(`/medications/${id}`,{method:"DELETE"}),
 takeMedication:(id:number)=>request<{medicationId:number}>(`/medications/${id}/take`,{method:"POST"}),
 getVitals:()=>request<{vitals:VitalRecord[]}>("/vitals"),
 addVital:(data:VitalInput)=>request<{vital:VitalRecord}>("/vitals",{method:"POST",body:JSON.stringify(data)}),
 getAppointments:()=>request<{appointments:AppointmentRecord[]}>("/appointments"),
 addAppointment:(data:{title:string;doctor:string;date:string;time:string})=>request<{appointment:AppointmentRecord}>("/appointments",{method:"POST",body:JSON.stringify(data)}),
 cancelAppointment:(id:number)=>request<{appointment:AppointmentRecord}>(`/appointments/${id}/cancel`,{method:"PATCH"}),
 getAlerts:()=>request<{alerts:AlertRecord[]}>("/alerts"),
 acknowledgeAlert:(id:number)=>request<{alert:AlertRecord}>(`/alerts/${id}/acknowledge`,{method:"PATCH"}),
 getCareNetwork:()=>request<{connections:CareConnectionRecord[]}>("/care-network"),
};
