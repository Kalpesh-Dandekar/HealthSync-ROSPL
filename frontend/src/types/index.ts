export type UserRole = "patient" | "caregiver" | "doctor";

export interface DoseEvent {
  id: string;
  time: string; // scheduled time label, e.g. "08:00 AM"
  status: "taken" | "scheduled" | "pending" | "missed";
  takenAt?: string;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  compartment: string;
  stock: number;
  lowStockThreshold: number;
  doses: DoseEvent[];
}

export interface VitalReading {
  time: string;
  heartRate: number;
  bpSys: number;
  bpDia: number;
  glucose: number;
}

export interface AlertItem {
  id: string;
  type: "missed_dose" | "low_stock" | "vitals" | "emergency" | "handoff_note" | "clinical_note" | "care_observation";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface HandoffNote {
  id: string;
  author: string;
  authorRole: UserRole;
  note: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  withName: string; // physician or patient name depending on viewer
  reason: string;
  date: string; // e.g. "Thu, Jun 12"
  time: string; // e.g. "10:30 AM"
  mode: "in_person" | "video";
  status: "upcoming" | "completed" | "cancelled";
  location?: string;
  patientName?: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  category: "adherence" | "vitals" | "consultation" | "lab";
  generatedOn: string;
  summary: string;
  authoredBy: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  patientCode: string;
  primaryCaregiver: string;
  physician: string;
  allergies: string[];
  diagnoses: string[];
  adherenceRate: number; // 0-100, rolling 7-day
}
