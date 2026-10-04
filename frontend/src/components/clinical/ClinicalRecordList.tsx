import { CalendarClock, ClipboardList, Stethoscope } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { ClinicalRecord } from "../../api/clinicalRecordApi";

const statusTone = { NORMAL: "sage", NEEDS_ATTENTION: "gold", CRITICAL: "brick" } as const;
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, character => character.toUpperCase());

export function ClinicalRecordList({ records, showPatient = false, empty = "No clinical records have been created yet." }: { records: ClinicalRecord[]; showPatient?: boolean; empty?: string }) {
  if (!records.length) return <div className="record-empty"><ClipboardList/><p>{empty}</p></div>;
  return <div className="space-y-3">{records.map(record => <article key={record.id} className="rounded-xl border border-paper-200 bg-paper-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="record-section-icon"><Stethoscope/></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-charcoal-900">{record.title}</h3><Badge tone="neutral">{label(record.type)}</Badge></div><p className="mt-1 text-xs text-charcoal-500">{showPatient ? `${record.patientName} · ` : ""}{record.clinicalDate} · Recorded by {record.physicianName}</p></div></div><Badge tone={statusTone[record.status]}>{label(record.status)}</Badge></div>
    <div className="mt-3 grid gap-3 text-sm text-charcoal-700 md:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Findings</p><p className="mt-1 leading-relaxed">{record.findings}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Physician interpretation</p><p className="mt-1 leading-relaxed">{record.interpretation}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Recommendations</p><p className="mt-1 leading-relaxed">{record.recommendations}</p></div></div>
    {record.followUpRequired && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-800"><CalendarClock className="h-3.5 w-3.5"/>Follow-up {record.followUpDate ? `recorded for ${record.followUpDate}` : "required"}</p>}
  </article>)}</div>;
}
