const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function token() { return localStorage.getItem("healthsync_token") || ""; }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to complete the clinical record request.");
  return data as T;
}

export type ClinicalRecordType = "CONSULTATION" | "VITAL_ASSESSMENT" | "LAB_RESULT" | "FOLLOW_UP" | "GENERAL_NOTE";
export type ClinicalRecordStatus = "NORMAL" | "NEEDS_ATTENTION" | "CRITICAL";
export interface ClinicalRecord {
  id: number;
  patientId: number;
  physicianId: number;
  patientName: string;
  physicianName: string;
  type: ClinicalRecordType;
  title: string;
  clinicalDate: string;
  findings: string;
  interpretation: string;
  recommendations: string;
  status: ClinicalRecordStatus;
  followUpRequired: boolean;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export type ClinicalRecordInput = Pick<ClinicalRecord, "type" | "title" | "clinicalDate" | "findings" | "interpretation" | "recommendations" | "status" | "followUpRequired" | "followUpDate">;

export const clinicalRecordApi = {
  list: (patientId?: string | number) => request<{ records: ClinicalRecord[] }>(`/clinical-records${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`),
  create: (patientId: string | number, data: ClinicalRecordInput) => request<{ record: ClinicalRecord }>(`/doctor/patients/${patientId}/clinical-records`, { method: "POST", body: JSON.stringify(data) }),
};
