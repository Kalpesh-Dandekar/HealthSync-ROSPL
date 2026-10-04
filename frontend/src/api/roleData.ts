const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
function token(){ return localStorage.getItem("healthsync_token") || ""; }
async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token()?{Authorization:`Bearer ${token()}`}:{}) ,...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message||"Request failed.");
  return data as T;
}
export interface CareTeamMember { id:number; name:string; email:string; role:"patient"|"caregiver"|"doctor"; }
export interface PatientBundle { patient:any; medications:any[]; vitals:any[]; alerts:any[]; appointments:any[]; clinicalRecords?:import("./clinicalRecordApi").ClinicalRecord[]; careTeam?:CareTeamMember[]; adherenceRate:number; }
export interface ReportRecord { id:string; patientId:number; patientName:string; title:string; category:"adherence"|"vitals"|"consultation"|"lab"|"clinical"; generatedOn:string; authoredBy:string; summary:string; }
export interface EmergencyRecord { id:number; patientId:number; patientName:string; message:string; active:boolean; createdAt:string; }
export const roleDataApi={
 getPatients:(role:"caregiver"|"doctor")=>request<{patients:PatientBundle[]}>(`/${role === "doctor" ? "doctor" : "caregiver"}/patients`),
 getPatient:(role:"caregiver"|"doctor", id:string|number)=>request<PatientBundle>(`/${role === "doctor" ? "doctor" : "caregiver"}/patients/${id}`),
 connect:(email:string)=>request<any>("/care-network/connect",{method:"POST",body:JSON.stringify({email})}),
 logMedication:(patientId:string|number, medicationId:string|number, status:"TAKEN"|"MISSED"|"PENDING")=>request<any>(`/caregiver/patients/${patientId}/medications/${medicationId}/log`,{method:"POST",body:JSON.stringify({status})}),
 addPatientVital:(patientId:string|number,data:{heartRate:string;systolic:string;diastolic:string;glucose:string})=>request<any>(`/caregiver/patients/${patientId}/vitals`,{method:"POST",body:JSON.stringify(data)}),
 scheduleForPatient:(patientId:string|number,data:{title:string;date:string;time:string})=>request<any>(`/doctor/patients/${patientId}/appointments`,{method:"POST",body:JSON.stringify(data)}),
 updateAppointmentStatus:(id:string|number,status:"Scheduled"|"Confirmed"|"Completed"|"Cancelled")=>request<any>(`/appointments/${id}/status`,{method:"PATCH",body:JSON.stringify({status})}),
 getNotes:(patientId?:string|number)=>request<{notes:any[]}>(`/handoff-notes${patientId?`?patientId=${patientId}`:""}`),
 addNote:(note:string, patientId?:string|number)=>request<any>("/handoff-notes",{method:"POST",body:JSON.stringify({note,...(patientId?{patientId:Number(patientId)}:{})})}),
 getAppointments:()=>request<{appointments:any[]}>("/role/appointments"),
 optimizeAppointments:(data:any)=>request<{engine:string;suggestions:any[];criteria:any}>("/appointments/optimize",{method:"POST",body:JSON.stringify(data)}),
 sendSos:(active:boolean)=>request<{active:boolean}>("/sos",{method:"POST",body:JSON.stringify({active})}),
 chat:(message:string)=>request<{answer:string;ai?:any}>("/ai/chat",{method:"POST",body:JSON.stringify({message})}),
 aiStatus:()=>request<{backend:boolean;ollama:boolean;model:string|null;configuredModel:string;message:string}>("/ai/status"),
 aiContext:()=>request<{role:string;patients:PatientBundle[]}>("/ai/context"),
 aiInsights:()=>request<{insights:string[];message?:string;ai?:any}>("/ai/insights"),
 aiMedicationCoach:()=>request<{answer:string;ai?:any}>("/ai/medication-coach"),
 aiVitalsAnalysis:()=>request<{answer:string;ai?:any}>("/ai/vitals-analysis"),
 aiSymptomAnalysis:(symptoms:string)=>request<{answer:string;ai?:any}>("/ai/symptom-analysis",{method:"POST",body:JSON.stringify({symptoms})}),
 getCareNetwork:()=>request<{connections:any[]}>("/care-network"),
 getReports:()=>request<{reports:ReportRecord[]}>("/reports"),
 getEmergencies:()=>request<{emergencies:EmergencyRecord[]}>("/emergencies"),
};
