const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
function token(){ return localStorage.getItem("healthsync_token") || ""; }
export class ApiRequestError extends Error { constructor(message:string, public status:number){ super(message); } }
async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token()?{Authorization:`Bearer ${token()}`}:{}) ,...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new ApiRequestError(data.message||"Request failed.",response.status);
  return data as T;
}
export type AiRole = "patient"|"doctor"|"caregiver";
export type AiAccessType = "SELF"|"CARE_NETWORK"|"EMERGENCY";
export interface AiPatientChoice { id:number; name:string; accessType:AiAccessType; }
export interface AiSource { type:string; label:string; count:number; includedCount:number; }
export interface AiMetadata { provider:string; model:string|null; live:boolean; grounded:boolean; mode:"record"|"general"|"safety"|"urgent"|"fallback"; }
export interface AiResponse { answer:string; ai:AiMetadata; sources:AiSource[]; }
export interface AiContextResponse { role:AiRole; patients:AiPatientChoice[]; selectedPatient:AiPatientChoice|null; }
export interface AiInsightsResponse extends AiResponse { insights:string[]; message?:string; }
export interface CareTeamMember { id:number; name:string; email:string; role:"patient"|"caregiver"|"doctor"; }
export interface PatientBundle { patient:any; medications:any[]; vitals:any[]; alerts:any[]; appointments:any[]; clinicalRecords?:import("./clinicalRecordApi").ClinicalRecord[]; careTeam?:CareTeamMember[]; adherenceRate:number; }
export interface ReportRecord { id:string; patientId:number; patientName:string; title:string; category:"adherence"|"vitals"|"consultation"|"lab"|"clinical"; generatedOn:string; authoredBy:string; summary:string; }
export interface EmergencyRecord { id:number; patientId:number; patientName:string; status:"ACTIVE"|"ACKNOWLEDGED"|"RESOLVED"; active:boolean; triggeredBy:{id:number;name:string;role:string}; respondingPhysician:{id:number;name:string}|null; caregiverAcknowledgements:{id:number;caregiverId:number;caregiverName:string;acknowledgedAt:string}[]; latestVital:any|null; medications:{name:string;dosage:string;schedule:string}[]; careTeam:CareTeamMember[]; latestClinicalRecord:{title:string;status:string;clinicalDate:string}|null; acknowledgedAt:string|null; resolvedAt:string|null; resolvedBy:{id:number;name:string}|null; resolutionNote:string|null; createdAt:string; updatedAt:string; }
export const roleDataApi={
 getPatients:(role:"caregiver"|"doctor")=>request<{patients:PatientBundle[]}>(`/${role === "doctor" ? "doctor" : "caregiver"}/patients`),
 getPatient:(role:"caregiver"|"doctor", id:string|number)=>request<PatientBundle>(`/${role === "doctor" ? "doctor" : "caregiver"}/patients/${id}`),
 sendPhysicianRequest:(email:string)=>request<any>("/care-network/physician-requests",{method:"POST",body:JSON.stringify({email})}),
 getPhysicianRequests:()=>request<{requests:any[]}>("/care-network/physician-requests"),
 resolvePhysicianRequest:(id:number,action:"accept"|"decline")=>request<any>(`/care-network/physician-requests/${id}/${action}`,{method:"PATCH"}),
 getCaregiverInvite:()=>request<{invite:any|null}>("/care-network/caregiver-invite"),
 generateCaregiverInvite:()=>request<{invite:{code:string;active:boolean;codeHint:string;createdAt:string};message:string}>("/care-network/caregiver-invite",{method:"POST"}),
 redeemCaregiverInvite:(code:string)=>request<any>("/care-network/caregiver-invite/redeem",{method:"POST",body:JSON.stringify({code})}),
 disconnectCareConnection:(id:number)=>request<{success:boolean;message:string}>(`/care-network/connections/${id}`,{method:"DELETE"}),
 logMedication:(patientId:string|number, medicationId:string|number, status:"TAKEN"|"MISSED"|"PENDING")=>request<any>(`/caregiver/patients/${patientId}/medications/${medicationId}/log`,{method:"POST",body:JSON.stringify({status})}),
 addPatientVital:(patientId:string|number,data:{heartRate:string;systolic:string;diastolic:string;glucose:string})=>request<any>(`/caregiver/patients/${patientId}/vitals`,{method:"POST",body:JSON.stringify(data)}),
 scheduleForPatient:(patientId:string|number,data:{title:string;date:string;time:string})=>request<any>(`/doctor/patients/${patientId}/appointments`,{method:"POST",body:JSON.stringify(data)}),
 updateAppointmentStatus:(id:string|number,status:"Scheduled"|"Confirmed"|"Completed"|"Cancelled")=>request<any>(`/appointments/${id}/status`,{method:"PATCH",body:JSON.stringify({status})}),
 getNotes:(patientId?:string|number)=>request<{notes:any[]}>(`/handoff-notes${patientId?`?patientId=${patientId}`:""}`),
 addNote:(note:string, patientId?:string|number)=>request<any>("/handoff-notes",{method:"POST",body:JSON.stringify({note,...(patientId?{patientId:Number(patientId)}:{})})}),
 getAppointments:()=>request<{appointments:any[]}>("/role/appointments"),
 optimizeAppointments:(data:any)=>request<{engine:string;suggestions:any[];criteria:any}>("/appointments/optimize",{method:"POST",body:JSON.stringify(data)}),
 sendSos:(active:boolean)=>request<{active:boolean}>("/sos",{method:"POST",body:JSON.stringify({active})}),
 chat:(message:string,patientId?:number)=>request<AiResponse>("/ai/chat",{method:"POST",body:JSON.stringify({message,...(patientId?{patientId}:{})})}),
 aiStatus:()=>request<{backend:boolean;ollama:boolean;model:string|null;configuredModel:string;message:string}>("/ai/status"),
 aiContext:(patientId?:number)=>request<AiContextResponse>(`/ai/context${patientId?`?patientId=${patientId}`:""}`),
 aiInsights:(patientId?:number)=>request<AiInsightsResponse>("/ai/insights",{method:"POST",body:JSON.stringify(patientId?{patientId}:{})}),
 aiMedicationCoach:(patientId?:number)=>request<AiResponse>("/ai/medication-coach",{method:"POST",body:JSON.stringify(patientId?{patientId}:{})}),
 aiVitalsAnalysis:(patientId?:number)=>request<AiResponse>("/ai/vitals-analysis",{method:"POST",body:JSON.stringify(patientId?{patientId}:{})}),
 aiSymptomAnalysis:(symptoms:string,patientId?:number)=>request<AiResponse>("/ai/symptom-analysis",{method:"POST",body:JSON.stringify({symptoms,...(patientId?{patientId}:{})})}),
 getCareNetwork:()=>request<{connections:any[]}>("/care-network"),
 getReports:()=>request<{reports:ReportRecord[]}>("/reports"),
 getEmergencies:()=>request<{emergencies:EmergencyRecord[]}>("/emergencies"),
 getCurrentEmergency:(patientId?:string|number)=>request<{emergency:EmergencyRecord|null}>(`/emergencies/current${patientId?`?patientId=${patientId}`:""}`),
 triggerEmergency:(patientId?:string|number)=>request<{emergency:EmergencyRecord;message:string}>("/emergencies",{method:"POST",body:JSON.stringify(patientId?{patientId:Number(patientId)}:{})}),
 claimEmergency:(id:number)=>request<{emergency:EmergencyRecord}>(`/emergencies/${id}/claim`,{method:"POST"}),
 acknowledgeEmergency:(id:number)=>request<{emergency:EmergencyRecord}>(`/emergencies/${id}/caregiver-acknowledge`,{method:"POST"}),
 resolveEmergency:(id:number,resolutionNote:string)=>request<{emergency:EmergencyRecord}>(`/emergencies/${id}/resolve`,{method:"POST",body:JSON.stringify({resolutionNote})}),
};
