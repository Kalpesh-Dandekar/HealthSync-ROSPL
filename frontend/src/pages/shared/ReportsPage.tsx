import { useEffect, useState } from "react";
import { Download, FileText, HeartPulse, Stethoscope, Activity } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { roleDataApi, type ReportRecord } from "../../api/roleData";
import type { UserRole } from "../../types";

const icons = { adherence: Activity, vitals: HeartPulse, consultation: Stethoscope, lab: FileText, clinical: FileText } as const;
const tones = { adherence: "ink", vitals: "sage", consultation: "gold", lab: "neutral", clinical: "ink" } as const;

function downloadReport(report: ReportRecord) {
  const content = `${report.title}\nPatient: ${report.patientName}\nGenerated: ${report.generatedOn}\nAuthored by: ${report.authoredBy}\n\n${report.summary}\n`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ role }: { role: UserRole }) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    roleDataApi.getReports().then(data => { if (active) setReports(data.reports); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Unable to load reports."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role]);

  const exportAll = () => {
    const content = reports.map(r => `${r.title}\nPatient: ${r.patientName}\nGenerated: ${r.generatedOn}\n\n${r.summary}`).join("\n\n--------------------\n\n");
    const blob = new Blob([content || "No reports available."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "healthsync-care-summary.txt"; link.click(); URL.revokeObjectURL(url);
  };

  return <div className={`${role === "patient" ? "patient-workspace-page patient-reports" : role === "doctor" ? "doctor-shared-page doctor-reports" : "caregiver-shared-page caregiver-reports"} space-y-6`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Reports</h1><p className="mt-1 text-sm text-charcoal-500">Database-generated adherence, vitals, clinical-record and care summaries for the patients your account is authorized to see.</p></div>
      <button onClick={exportAll} disabled={!reports.length} className="flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-0 px-3.5 py-2 text-xs font-semibold text-charcoal-700 disabled:opacity-50"><Download className="h-3.5 w-3.5"/>Export all</button>
    </div>
    {error && <Card><p className="text-sm text-brick-700">{error}</p></Card>}
    {loading && <Card><p className="text-sm text-charcoal-500">Generating reports from PostgreSQL…</p></Card>}
    {!loading && !error && reports.length === 0 && (role === "doctor" ? <Card className="reports-empty"><span><FileText /></span><div><p className="font-semibold text-charcoal-900">No clinical reports yet</p><p className="mt-1 text-sm text-charcoal-500">Reports will appear when connected patient records contain reportable adherence, vitals or care activity.</p></div></Card> : role === "caregiver" ? <Card className="caregiver-reports-empty"><span><FileText /></span><div><p className="font-semibold text-charcoal-900">No care reports yet</p><p className="mt-1 text-sm text-charcoal-500">Reports will appear when connected patient records contain reportable medication, vitals or care activity.</p></div></Card> : <Card><p className="text-sm text-charcoal-500">No reportable health data is available yet.</p></Card>)}
    <div className="space-y-4">{reports.map(r => { const Icon=icons[r.category]; return <Card key={r.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-800"><Icon className="h-4 w-4"/></span><div><p className="font-display text-base font-semibold text-charcoal-900">{r.title}</p><p className="text-xs text-charcoal-500">{r.patientName} · Generated {r.generatedOn} · {r.authoredBy}</p></div></div><Badge tone={tones[r.category]}>{r.category}</Badge></div><p className="mt-3 text-sm leading-relaxed text-charcoal-700">{r.summary}</p><button onClick={()=>downloadReport(r)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-800 hover:underline"><Download className="h-3.5 w-3.5"/>Download report</button></Card>; })}</div>
  </div>;
}
