import type {
  AlertItem,
  Appointment,
  HandoffNote,
  Medicine,
  Patient,
  ReportSummary,
  VitalReading,
} from "../types";

export const PATIENT: Patient = {
  id: "p-8942",
  name: "Eleanor Vance",
  age: 68,
  patientCode: "#8942",
  primaryCaregiver: "Sarah Vance (Daughter)",
  physician: "Dr. Robert Chen, MD — St. Jude Medical Center",
  allergies: ["Penicillin — severe reaction (anaphylaxis)"],
  diagnoses: [
    "Type 2 Diabetes Mellitus (ICD-10 E11)",
    "Essential Primary Hypertension (ICD-10 I10)",
  ],
  adherenceRate: 85,
};

export const MEDICINES: Medicine[] = [
  {
    id: "m-1",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    compartment: "Morning · Compartment A",
    stock: 18,
    lowStockThreshold: 6,
    doses: [
      { id: "d-1", time: "08:00 AM", status: "taken", takenAt: "08:02 AM" },
      { id: "d-2", time: "08:00 PM", status: "scheduled" },
    ],
  },
  {
    id: "m-2",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    compartment: "Evening · Compartment B",
    stock: 24,
    lowStockThreshold: 6,
    doses: [{ id: "d-3", time: "06:00 PM", status: "scheduled" }],
  },
  {
    id: "m-3",
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    compartment: "Night · Compartment C",
    stock: 3,
    lowStockThreshold: 6,
    doses: [{ id: "d-4", time: "09:00 PM", status: "pending" }],
  },
];

export const VITALS: VitalReading[] = [
  { time: "06:00 AM", heartRate: 72, bpSys: 120, bpDia: 80, glucose: 98 },
  { time: "10:00 AM", heartRate: 78, bpSys: 124, bpDia: 82, glucose: 132 },
  { time: "02:00 PM", heartRate: 85, bpSys: 130, bpDia: 85, glucose: 118 },
  { time: "06:00 PM", heartRate: 74, bpSys: 122, bpDia: 81, glucose: 108 },
  { time: "10:00 PM", heartRate: 68, bpSys: 118, bpDia: 78, glucose: 101 },
];

export const ALERTS: AlertItem[] = [
  {
    id: "a-1",
    type: "low_stock",
    severity: "warning",
    message:
      "Atorvastatin 20mg: dispenser weight sensor indicates 3 doses left — refill needed before Thursday.",
    timestamp: "2h ago",
    acknowledged: false,
  },
  {
    id: "a-2",
    type: "missed_dose",
    severity: "critical",
    message: "Atorvastatin 20mg was not taken within 90 minutes of the scheduled time yesterday.",
    timestamp: "1d ago",
    acknowledged: false,
  },
];

export const HANDOFF_NOTES: HandoffNote[] = [
  {
    id: "h-1",
    author: "Sarah Vance",
    authorRole: "caregiver",
    note: "Mom mentioned mild dizziness after the evening dose today — noting in case it comes up at the next appointment.",
    timestamp: "Yesterday, 7:40 PM",
  },
  {
    id: "h-2",
    author: "Dr. Robert Chen",
    authorRole: "doctor",
    note: "Reviewed adherence log — 85% weekly is solid. Discussed switching Atorvastatin to a once-weekly refill cadence.",
    timestamp: "3 days ago",
  },
];

export const APPOINTMENTS: Appointment[] = [
  {
    id: "ap-1",
    withName: "Dr. Robert Chen, MD",
    reason: "Quarterly diabetes & hypertension review",
    date: "Thu, Jun 12",
    time: "10:30 AM",
    mode: "video",
    status: "upcoming",
  },
  {
    id: "ap-2",
    withName: "St. Jude Medical Center — Lab Services",
    reason: "A1C and lipid panel bloodwork",
    date: "Mon, Jun 16",
    time: "08:15 AM",
    mode: "in_person",
    status: "upcoming",
    location: "St. Jude Medical Center, Level 2",
  },
  {
    id: "ap-3",
    withName: "Dr. Robert Chen, MD",
    reason: "Medication adjustment follow-up",
    date: "Tue, May 20",
    time: "02:00 PM",
    mode: "video",
    status: "completed",
  },
];

export const REPORTS: ReportSummary[] = [
  {
    id: "r-1",
    title: "7-day adherence summary",
    category: "adherence",
    generatedOn: "Jun 9",
    summary:
      "85% adherence across 3 medications. One missed Atorvastatin dose flagged and acknowledged; no missed doses for Metformin or Lisinopril.",
    authoredBy: "Auto-generated",
  },
  {
    id: "r-2",
    title: "Vitals trend — past 24 hours",
    category: "vitals",
    generatedOn: "Jun 10",
    summary:
      "Heart rate and blood pressure within target range. Glucose peaked at 132 mg/dL mid-morning, consistent with post-breakfast pattern.",
    authoredBy: "Auto-generated",
  },
  {
    id: "r-3",
    title: "Consultation notes — Medication adjustment",
    category: "consultation",
    generatedOn: "May 20",
    summary:
      "Discussed switching Atorvastatin to a once-weekly refill cadence. Patient reported mild dizziness after evening doses; advised to monitor and report recurrence.",
    authoredBy: "Dr. Robert Chen, MD",
  },
];
