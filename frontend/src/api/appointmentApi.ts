const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
function token() { return localStorage.getItem("healthsync_token") || ""; }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data as T;
}

export type AppointmentStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "REJECTED" | "CANCELLED";
export interface AppointmentRecord { id: number; userId: number; physicianId: number | null; reason: string; title: string; doctor: string; physicianName: string; patientName?: string; date: string; time: string; durationMinutes: number; status: AppointmentStatus; }
export interface PhysicianOption { id: number; name: string; }
export interface AvailabilityRow { id?: number; dayOfWeek: number; startTime: string; endTime: string; slotDuration: number; }
export interface UnavailablePeriod { id: number; startDate: string; endDate: string; reason: string | null; }
export interface SlotResponse { physician: PhysicianOption; availability?: AvailabilityRow; slots: string[]; message?: string | null; unavailable?: UnavailablePeriod; }

export const appointmentApi = {
  list: () => request<{ appointments: AppointmentRecord[] }>("/appointments"),
  physicians: () => request<{ physicians: PhysicianOption[] }>("/physicians"),
  slots: (physicianId: number, date: string) => request<SlotResponse>(`/physicians/${physicianId}/slots?date=${encodeURIComponent(date)}`),
  request: (data: { physicianId: number; date: string; time: string; reason: string }) => request<{ appointment: AppointmentRecord }>("/appointments", { method: "POST", body: JSON.stringify(data) }),
  cancel: (id: number) => request<{ appointment: AppointmentRecord }>(`/appointments/${id}/cancel`, { method: "PATCH" }),
  updateStatus: (id: number, status: "CONFIRMED" | "COMPLETED" | "REJECTED" | "CANCELLED") => request<{ appointment: AppointmentRecord }>(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getAvailability: () => request<{ availability: AvailabilityRow[] }>("/physician/availability"),
  saveAvailability: (availability: AvailabilityRow[]) => request<{ availability: AvailabilityRow[] }>("/physician/availability", { method: "PUT", body: JSON.stringify({ availability }) }),
  getPeriods: () => request<{ periods: UnavailablePeriod[] }>("/physician/unavailable-periods"),
  addPeriod: (data: { startDate: string; endDate: string; reason: string }) => request<{ period: UnavailablePeriod }>("/physician/unavailable-periods", { method: "POST", body: JSON.stringify(data) }),
  removePeriod: (id: number) => request<{ success: boolean }>(`/physician/unavailable-periods/${id}`, { method: "DELETE" }),
};
