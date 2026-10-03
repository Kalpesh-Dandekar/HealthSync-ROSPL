import { useEffect, useState } from "react";
import { MessageSquareText, Send, UserPlus, Users } from "lucide-react";
import { roleDataApi } from "../../api/roleData";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../data/AppDataContext";
import type { UserRole } from "../../types";

export function CareNetworkPage({ authorName: _authorName, authorRole }: { authorName: string; authorRole: UserRole; }) {
  const { patient } = useAppData();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | "">("");
  const [notes, setNotes] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await roleDataApi.getCareNetwork();
      setConnections(data.connections);
      const first = data.connections[0]?.patient?.id;
      const id = selectedPatientId || first;
      if (id) {
        setSelectedPatientId(id);
        const noteData = await roleDataApi.getNotes(id);
        setNotes(noteData.notes);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load care network.");
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (selectedPatientId) roleDataApi.getNotes(selectedPatientId).then((data) => setNotes(data.notes)).catch(() => setNotes([]));
  }, [selectedPatientId]);

  const connect = async () => {
    if (!email.trim()) return;
    try {
      const response = await roleDataApi.connect(email.trim());
      setMessage(response.message || "Connection created.");
      setEmail("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect account.");
    }
  };

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      await roleDataApi.addNote(draft.trim(), selectedPatientId || undefined);
      setDraft("");
      setMessage("Note shared with the care team.");
      if (selectedPatientId) {
        const data = await roleDataApi.getNotes(selectedPatientId);
        setNotes(data.notes);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to post note.");
    }
  };

  const selected = connections.find((connection) => connection.patient?.id === selectedPatientId)?.patient;
  const displayName = selected?.name || patient.name || "Patient";
  const patientClass = authorRole === "patient" ? "patient-workspace-page patient-care-network" : "";

  return (
    <div className={`${patientClass} space-y-6`}>
      <div>
        <h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Care network</h1>
        <p className="mt-1 text-sm text-charcoal-500">Role-based connections and shared care updates stored in PostgreSQL.</p>
      </div>

      {authorRole !== "patient" && connections.length > 0 && (
        <Card>
          <CardHeader title="Connected patients" />
          <div className="flex flex-wrap gap-2">
            {connections.filter((connection) => connection.patient).map((connection) => (
              <button key={connection.patient.id} onClick={() => setSelectedPatientId(connection.patient.id)} className={`rounded-xl border px-3 py-2 text-left ${selectedPatientId === connection.patient.id ? "border-ink-700 bg-ink-100" : "border-paper-300 bg-paper-0"}`}>
                <p className="text-sm font-semibold text-charcoal-900">{connection.patient.name}</p>
                <p className="text-[11px] text-charcoal-500">{connection.patient.email}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="care-network__connections">
        <CardHeader title="Current connections" action={<span className="care-network__icon"><Users /></span>} />
        <div className="space-y-3">
          {connections.length === 0 && <div className="care-network__empty"><Users /><div><p>No connections yet</p><span>Connect a trusted care team member when you are ready.</span></div></div>}
          {connections.map((connection, index) => (
            <div key={connection.patient?.id || index} className="rounded-xl border border-paper-200 p-3">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-ink-800" /><p className="text-sm font-semibold text-charcoal-900">{connection.patient?.name || "Patient"}</p></div>
              <div className="mt-2 flex flex-wrap gap-2">{connection.caregiver && <Badge tone="neutral">Caregiver: {connection.caregiver.name}</Badge>}{connection.physician && <Badge tone="ink">Physician: {connection.physician.name}</Badge>}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="care-network__connect">
        <CardHeader title="Connect a care team member" subtitle="Use a HealthSync account email to create a role-based connection" action={<span className="care-network__icon"><UserPlus /></span>} />
        <div className="flex flex-col gap-2 sm:flex-row"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Account email" className="min-w-0 flex-1 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2.5 text-sm outline-none focus:border-ink-700" /><button onClick={connect} className="rounded-xl bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white">Connect</button></div>
        {message && <p className="mt-2 text-xs text-charcoal-500">{message}</p>}
      </Card>

      <Card className="care-network__notes">
        <CardHeader title={`Shared notes · ${displayName}`} action={<span className="care-network__icon"><MessageSquareText /></span>} />
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder="Share an observation, question, or update..." className="w-full resize-none rounded-xl border border-paper-200 bg-paper-50 p-3 text-sm text-charcoal-900 focus:border-ink-700 focus:outline-none" />
        <div className="mt-3 flex justify-end"><button onClick={submit} disabled={authorRole !== "patient" && !selectedPatientId} className="flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />Post note</button></div>
        <div className="mt-5 space-y-3">
          {notes.length === 0 && <p className="text-sm text-charcoal-500">No notes for this patient yet.</p>}
          {notes.map((note) => <div key={note.id} className="rounded-xl border border-paper-200 bg-paper-50 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-charcoal-900">{note.author}</p><span className="text-xs text-charcoal-500">{new Date(note.timestamp).toLocaleString()}</span></div><Badge tone={note.authorRole === "doctor" ? "ink" : "neutral"}>{note.authorRole}</Badge><p className="mt-2 text-sm leading-relaxed text-charcoal-700">{note.note}</p></div>)}
        </div>
      </Card>
    </div>
  );
}
