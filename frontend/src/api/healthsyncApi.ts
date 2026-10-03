import { io, type Socket } from "socket.io-client";
import type { AlertItem, Appointment, HandoffNote, Medicine, Patient } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export async function demoLogin(role: "patient" | "caregiver" | "doctor") {
  const res = await fetch(`${API_URL}/auth/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("HealthSync backend is not available");
  const data = await res.json();
  localStorage.setItem("healthsync_token", data.token);
  localStorage.setItem("healthsync_role", role);
  return data;
}

function authHeaders() {
  const token = localStorage.getItem("healthsync_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "HealthSync API request failed");
  return res.json() as Promise<T>;
}

export function getPatient() {
  return request<Patient & { medicines: Medicine[]; alerts: AlertItem[]; appointments: Appointment[]; handoffNotes: HandoffNote[]; reports: any[]; vitals: any[]; sosActive: boolean }>("/patient");
}

export function takeDose(doseId: string) {
  return request<{ doseId: string; medicineId: string; status: string; takenAt: string }>(`/doses/${doseId}/take`, { method: "POST" });
}

export function acknowledgeAlert(alertId: string) {
  return request<{ alertId: string; acknowledged: boolean }>(`/alerts/${alertId}/acknowledge`, { method: "PATCH" });
}

export function createHandoffNote(note: string) {
  return request<HandoffNote>("/handoff-notes", { method: "POST", body: JSON.stringify({ note }) });
}

export function createAppointment(appt: Omit<Appointment, "id" | "status">) {
  return request<Appointment>("/appointments", { method: "POST", body: JSON.stringify(appt) });
}

export function cancelAppointment(id: string) {
  return request<{ appointmentId: string; status: string }>(`/appointments/${id}/cancel`, { method: "PATCH" });
}

export function setSos(active: boolean) {
  return request<{ active: boolean }>("/sos", { method: "POST", body: JSON.stringify({ active }) });
}

export function connectRealtime(onEvent: (event: string, payload: any) => void) {
  socket?.disconnect();
  const token = localStorage.getItem("healthsync_token");
  if (!token) return () => undefined;
  socket = io(SOCKET_URL, { auth: { token } });
  ["dose:updated", "alert:updated", "handoff:created", "appointment:created", "appointment:updated", "sos:updated"].forEach(event => {
    socket?.on(event, payload => onEvent(event, payload));
  });
  return () => socket?.disconnect();
}
