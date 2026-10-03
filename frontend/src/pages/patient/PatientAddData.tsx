import { FormEvent, useEffect, useState } from "react";
import { Activity, CalendarDays, CheckCircle2, Pill, Trash2 } from "lucide-react";
import { patientDataApi, type AppointmentRecord, type MedicationRecord, type VitalRecord } from "../../api/patientData";

const inputClass = "h-11 w-full rounded-xl border border-paper-200 bg-paper-50 px-3 text-sm text-charcoal-900 outline-none transition placeholder:text-charcoal-500 focus:border-ink-600";

export function PatientAddData() {
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [med, setMed] = useState({ name: "", dosage: "", schedule: "", stock: "0" });
  const [vital, setVital] = useState({ heartRate: "", systolic: "", diastolic: "", glucose: "" });
  const [appointment, setAppointment] = useState({ title: "", doctor: "", date: "", time: "" });

  async function load() {
    try {
      const [m, v, a] = await Promise.all([
        patientDataApi.getMedications(),
        patientDataApi.getVitals(),
        patientDataApi.getAppointments(),
      ]);
      setMedications(m.medications);
      setVitals(v.vitals);
      setAppointments(a.appointments);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load your data.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent, action: () => Promise<unknown>, reset: () => void) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await action();
      reset();
      await load();
      setMessage("Saved to PostgreSQL successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="patient-workspace-page patient-add-data screen-page flex min-h-0 flex-col gap-4 overflow-auto pr-1">
      <div className="shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">Patient data</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-charcoal-900">Add & manage your health data</h1>
        <p className="mt-1 text-xs leading-5 text-charcoal-500">Everything you enter here is saved to your HealthSync PostgreSQL database and belongs to your account.</p>
      </div>

      {message && <div className="rounded-xl border border-ink-700/30 bg-ink-100 px-4 py-3 text-xs text-ink-500">{message}</div>}

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-2xl border border-paper-200 bg-paper-0 p-4 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600"><Pill className="h-5 w-5" /></span>
            <div><h2 className="font-semibold text-charcoal-900">Add medication</h2><p className="text-[11px] text-charcoal-500">Your medicine and stock</p></div>
          </div>
          <form className="mt-4 space-y-3" onSubmit={(e) => submit(e, () => patientDataApi.addMedication({ ...med, stock: Number(med.stock) }), () => setMed({ name: "", dosage: "", schedule: "", stock: "0" }))}>
            <input className={inputClass} placeholder="Medicine name" value={med.name} onChange={e => setMed({ ...med, name: e.target.value })} required />
            <input className={inputClass} placeholder="Dosage (e.g. 500 mg)" value={med.dosage} onChange={e => setMed({ ...med, dosage: e.target.value })} required />
            <input className={inputClass} placeholder="Schedule (e.g. Morning)" value={med.schedule} onChange={e => setMed({ ...med, schedule: e.target.value })} required />
            <input className={inputClass} type="number" min="0" placeholder="Stock" value={med.stock} onChange={e => setMed({ ...med, stock: e.target.value })} />
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-800 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save medication</button>
          </form>
          <div className="mt-4 space-y-2">
            {medications.map(item => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-paper-200 bg-paper-50 p-3">
              <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-charcoal-900">{item.name} · {item.dosage}</p><p className="text-[10px] text-charcoal-500">{item.schedule} · Stock {item.stock}</p></div>
              <button onClick={async () => { await patientDataApi.deleteMedication(item.id); await load(); }} className="rounded-lg p-2 text-charcoal-500 hover:bg-brick-100 hover:text-brick-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>)}
            {!medications.length && <p className="text-[11px] text-charcoal-500">No medications added yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-paper-200 bg-paper-0 p-4 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600"><Activity className="h-5 w-5" /></span>
            <div><h2 className="font-semibold text-charcoal-900">Log vitals</h2><p className="text-[11px] text-charcoal-500">Record a health reading</p></div>
          </div>
          <form className="mt-4 space-y-3" onSubmit={(e) => submit(e, () => patientDataApi.addVital(vital), () => setVital({ heartRate: "", systolic: "", diastolic: "", glucose: "" }))}>
            <input className={inputClass} type="number" placeholder="Heart rate (bpm)" value={vital.heartRate} onChange={e => setVital({ ...vital, heartRate: e.target.value })} />
            <div className="grid grid-cols-2 gap-2"><input className={inputClass} type="number" placeholder="Systolic" value={vital.systolic} onChange={e => setVital({ ...vital, systolic: e.target.value })} /><input className={inputClass} type="number" placeholder="Diastolic" value={vital.diastolic} onChange={e => setVital({ ...vital, diastolic: e.target.value })} /></div>
            <input className={inputClass} type="number" step="0.1" placeholder="Glucose" value={vital.glucose} onChange={e => setVital({ ...vital, glucose: e.target.value })} />
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-800 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save vitals</button>
          </form>
          <div className="mt-4 space-y-2">
            {vitals.slice(0, 5).map(item => <div key={item.id} className="rounded-xl border border-paper-200 bg-paper-50 p-3 text-[11px] text-charcoal-700">
              <p className="font-semibold text-charcoal-900">{new Date(item.recordedAt).toLocaleString()}</p>
              <p className="mt-1">HR {item.heartRate ?? "—"} · BP {item.systolic ?? "—"}/{item.diastolic ?? "—"} · Glucose {item.glucose ?? "—"}</p>
            </div>)}
            {!vitals.length && <p className="text-[11px] text-charcoal-500">No vital readings added yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-paper-200 bg-paper-0 p-4 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600"><CalendarDays className="h-5 w-5" /></span>
            <div><h2 className="font-semibold text-charcoal-900">Book appointment</h2><p className="text-[11px] text-charcoal-500">Add your next visit</p></div>
          </div>
          <form className="mt-4 space-y-3" onSubmit={(e) => submit(e, () => patientDataApi.addAppointment(appointment), () => setAppointment({ title: "", doctor: "", date: "", time: "" }))}>
            <input className={inputClass} placeholder="Appointment title" value={appointment.title} onChange={e => setAppointment({ ...appointment, title: e.target.value })} required />
            <input className={inputClass} placeholder="Doctor name" value={appointment.doctor} onChange={e => setAppointment({ ...appointment, doctor: e.target.value })} required />
            <input className={inputClass} type="date" value={appointment.date} onChange={e => setAppointment({ ...appointment, date: e.target.value })} required />
            <input className={inputClass} type="time" value={appointment.time} onChange={e => setAppointment({ ...appointment, time: e.target.value })} required />
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-800 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save appointment</button>
          </form>
          <div className="mt-4 space-y-2">
            {appointments.map(item => <div key={item.id} className="rounded-xl border border-paper-200 bg-paper-50 p-3">
              <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-charcoal-900">{item.title}</p><p className="text-[10px] text-charcoal-500">{item.doctor} · {item.date} at {item.time}</p></div><span className="text-[9px] font-bold uppercase text-ink-500">{item.status}</span></div>
            </div>)}
            {!appointments.length && <p className="text-[11px] text-charcoal-500">No appointments added yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
