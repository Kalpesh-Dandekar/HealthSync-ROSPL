import { useEffect, useState } from "react";
import { Calendar, MapPin, Plus, Video, X } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../data/AppDataContext";
import type { UserRole } from "../../types";
import { roleDataApi, type PatientBundle } from "../../api/roleData";

const statusTone = {
  upcoming: "ink",
  completed: "sage",
  cancelled: "neutral",
} as const;

export function AppointmentsPage({ role }: { role: UserRole }) {
  const { appointments, cancelAppointment, bookAppointment, patient } =
    useAppData();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"in_person" | "video">("video");
  const [patients, setPatients] = useState<PatientBundle[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | "">("");
  const [doctorActionMessage, setDoctorActionMessage] = useState("");
  const [urgency, setUrgency] = useState("1");
  const [preferredClinic, setPreferredClinic] = useState("");
  const [preferredDoctor, setPreferredDoctor] = useState("");
  const [preferredStart, setPreferredStart] = useState("");
  const [preferredEnd, setPreferredEnd] = useState("");
  const [accessibilityRequired, setAccessibilityRequired] = useState(false);
  const [sensoryPreference, setSensoryPreference] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [optimizerEngine, setOptimizerEngine] = useState("");
  const [optimizerLoading, setOptimizerLoading] = useState(false);

  useEffect(() => {
    if (role !== "caregiver") return;
    roleDataApi.getPatients("caregiver").then(data => {
      setPatients(data.patients);
      if (data.patients[0]) setSelectedPatientId(data.patients[0].patient.id);
    }).catch(() => setPatients([]));
  }, [role]);

  const canBook = role === "patient" || role === "caregiver";
  const canCancel = role !== "doctor";

  const submit = () => {
    if (!reason.trim() || !date.trim() || !time.trim()) return;
    if (role === "caregiver" && !selectedPatientId) return;
    bookAppointment({
      withName: patient.physician.split(",")[0] || "Assigned physician",
      reason: reason.trim(),
      date: date.trim(),
      time: time.trim(),
      mode,
      ...(role === "caregiver" ? { patientId: Number(selectedPatientId) } : {}),
    });
    setReason("");
    setDate("");
    setTime("");
    setShowForm(false);
  };

  const upcoming = appointments.filter((a) => a.status === "upcoming");
  const updateDoctorStatus = async (id:string, status:"Confirmed"|"Completed"|"Cancelled") => {
    try {
      await roleDataApi.updateAppointmentStatus(id, status);
      setDoctorActionMessage(`Appointment marked ${status.toLowerCase()}.`);
      window.location.reload();
    } catch (e) {
      setDoctorActionMessage(e instanceof Error ? e.message : "Unable to update appointment.");
    }
  };
  const past = appointments.filter((a) => a.status !== "upcoming");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {role === "doctor"
              ? `Scheduled visits and follow-ups for ${patient.name}.`
              : "Visits, follow-ups, and lab work — synced with your physician's calendar."}
          </p>
        </div>
        {canBook && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 rounded-lg bg-ink-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Request appointment
          </button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Request a new appointment" />
          <div className="grid gap-3 sm:grid-cols-2">
            {role === "caregiver" && <select value={selectedPatientId} onChange={e=>setSelectedPatientId(e.target.value?Number(e.target.value):"")} className="rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2.5 text-sm text-charcoal-900 sm:col-span-2"><option value="">Select patient</option>{patients.map(p=><option key={p.patient.id} value={p.patient.id}>{p.patient.name} ({p.patient.patientCode})</option>)}</select>}
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for visit"
              className="rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-500/70 focus:border-ink-600 focus:outline-none sm:col-span-2"
            />
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Preferred date (e.g. Fri, Jun 20)"
              className="rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-500/70 focus:border-ink-600 focus:outline-none"
            />
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Preferred time (e.g. 11:00 AM)"
              className="rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-500/70 focus:border-ink-600 focus:outline-none"
            />
            <div className="flex gap-2 sm:col-span-2">
              <button
                onClick={() => setMode("video")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === "video"
                    ? "border-ink-700 bg-ink-100 text-ink-800"
                    : "border-paper-300 text-charcoal-600"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                Video visit
              </button>
              <button
                onClick={() => setMode("in_person")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === "in_person"
                    ? "border-ink-700 bg-ink-100 text-ink-800"
                    : "border-paper-300 text-charcoal-600"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                In person
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-charcoal-600 hover:bg-paper-100"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-lg bg-ink-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-ink-900"
            >
              Send request
            </button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Smart appointment scheduling" subtitle="Find conflict-free slots using urgency, preferences and accessibility constraints." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={urgency} onChange={e=>setUrgency(e.target.value)} className="rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm"><option value="1">Low urgency</option><option value="2">Medium urgency</option><option value="3">High urgency</option></select>
          <input value={preferredClinic} onChange={e=>setPreferredClinic(e.target.value)} placeholder="Preferred clinic (optional)" className="rounded-lg border border-paper-300 px-3 py-2 text-sm" />
          <input value={preferredDoctor} onChange={e=>setPreferredDoctor(e.target.value)} placeholder="Preferred doctor (optional)" className="rounded-lg border border-paper-300 px-3 py-2 text-sm" />
          <select value={sensoryPreference} onChange={e=>setSensoryPreference(e.target.value)} className="rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm"><option value="">No sensory preference</option><option value="light">Low-light preference</option><option value="noise">Low-noise preference</option></select>
          <input type="time" value={preferredStart} onChange={e=>setPreferredStart(e.target.value)} className="rounded-lg border border-paper-300 px-3 py-2 text-sm" />
          <input type="time" value={preferredEnd} onChange={e=>setPreferredEnd(e.target.value)} className="rounded-lg border border-paper-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 rounded-lg border border-paper-300 px-3 py-2 text-xs font-medium"><input type="checkbox" checked={accessibilityRequired} onChange={e=>setAccessibilityRequired(e.target.checked)} /> Accessible clinic required</label>
          <button disabled={optimizerLoading} onClick={async()=>{setOptimizerLoading(true);try{const r=await roleDataApi.optimizeAppointments({date:date||new Date().toISOString().slice(0,10),mode,urgency:Number(urgency),preferredClinic,preferredDoctor,preferredStart,preferredEnd,accessibilityRequired,sensoryPreference});setSuggestions(r.suggestions);setOptimizerEngine(r.engine);}catch(e){setDoctorActionMessage(e instanceof Error?e.message:"Unable to optimize slots.");}finally{setOptimizerLoading(false);}}} className="rounded-lg bg-ink-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{optimizerLoading?"Finding slots…":"Find optimized slots"}</button>
        </div>
        {suggestions.length>0 && <div className="mt-4 space-y-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-500">Suggested slots · {optimizerEngine}</div>{suggestions.map((x:any,i:number)=><div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper-200 px-3 py-2.5"><div><p className="text-sm font-medium text-charcoal-900">{x.date} at {x.time}</p><p className="text-xs text-charcoal-500">{x.clinic} · {x.doctor} · {x.mode === "video" ? "Telemedicine" : "In person"}{x.distanceKm!=null?` · ${x.distanceKm} km`:""}</p></div><button onClick={()=>{setDate(x.date);setTime(x.time);setReason(reason||"Medical consultation");setDoctorActionMessage(`Selected ${x.date} at ${x.time}.`);}} className="rounded-lg border border-ink-700/30 bg-ink-100 px-3 py-1.5 text-[11px] font-semibold text-ink-800">Use slot</button></div>)}</div>}
      </Card>

      {doctorActionMessage && <div className="rounded-xl border border-ink-700/30 bg-ink-100 px-4 py-3 text-xs text-ink-800">{doctorActionMessage}</div>}

      <Card>
        <CardHeader
          title="Upcoming"
          subtitle={`${upcoming.length} scheduled`}
        />
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-sm text-charcoal-500">
              No upcoming appointments.
            </p>
          )}
          {upcoming.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-xl border border-paper-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-800">
                  {a.mode === "video" ? (
                    <Video className="h-4.5 w-4.5" />
                  ) : (
                    <Calendar className="h-4.5 w-4.5" />
                  )}
                </span>
                <div>
                  <p className="font-medium text-charcoal-900">{a.reason}</p>
                  <p className="text-xs text-charcoal-500">
                    {role === "doctor" ? patient.name : a.withName} &middot;{" "}
                    {a.date} at {a.time}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <Badge tone={statusTone[a.status]}>
                  {a.mode === "video" ? "Video" : "In person"}
                </Badge>
                {role === "doctor" ? (
                  <>
                    <button onClick={() => void updateDoctorStatus(a.id, "Confirmed")} className="rounded-lg border border-sage-600/30 bg-sage-100 px-2.5 py-1.5 text-[11px] font-semibold text-sage-700">Confirm</button>
                    <button onClick={() => void updateDoctorStatus(a.id, "Completed")} className="rounded-lg border border-ink-700/30 bg-ink-100 px-2.5 py-1.5 text-[11px] font-semibold text-ink-800">Complete</button>
                  </>
                ) : canCancel && (
                  <button
                    onClick={() => cancelAppointment(a.id)}
                    aria-label="Cancel appointment"
                    className="rounded-lg p-1.5 text-charcoal-500 hover:bg-brick-100 hover:text-brick-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader title="Past & cancelled" />
          <div className="space-y-2.5">
            {past.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-paper-200 px-3.5 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-charcoal-900">
                    {a.reason}
                  </p>
                  <p className="text-xs text-charcoal-500">
                    {a.date} at {a.time}
                  </p>
                </div>
                <Badge tone={statusTone[a.status]}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
