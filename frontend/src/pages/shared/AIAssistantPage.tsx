import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, BellRing, Bot, Brain, CalendarDays, ChevronDown, ChevronUp, CircleAlert, HeartPulse, Pill, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { roleDataApi, type PatientBundle } from "../../api/roleData";

type Message = { role: "user" | "assistant"; text: string };
type AiMeta = { provider?: string; model?: string | null; live?: boolean; grounded?: boolean };

function latestVital(patient?: PatientBundle) {
  return patient?.vitals?.[0];
}

function vitalLabel(value: unknown, suffix = "") {
  return value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`;
}

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi. I’m the HealthSync AI Assistant. Ask me about your authorized HealthSync records, medications, vitals, appointments, alerts, or general health information." }]);
  const [draft, setDraft] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [busy, setBusy] = useState("");
  const [insights, setInsights] = useState<string[]>([]);
  const [toolAnswer, setToolAnswer] = useState("");
  const [toolTitle, setToolTitle] = useState("AI analysis");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [aiMeta, setAiMeta] = useState<AiMeta>({});
  const [status, setStatus] = useState<{ollama:boolean;model:string|null;message:string} | null>(null);
  const [patients, setPatients] = useState<PatientBundle[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const activePatient = patients[selectedPatient];
  const vital = latestVital(activePatient);
  const openAlerts = useMemo(() => activePatient?.alerts?.filter(a => !a.read).slice(0, 4) || [], [activePatient]);

  useEffect(() => {
    Promise.all([roleDataApi.aiStatus(), roleDataApi.aiContext()])
      .then(([ai, context]) => { setStatus(ai); setPatients(context.patients || []); })
      .catch(() => setStatus(null));
  }, []);

  const showError = (err: unknown) => err instanceof Error ? err.message : "AI service is temporarily unavailable.";

  const ask = async (question:string) => {
    setMessages(m => [...m, {role:"user", text:question}]);
    setBusy("chat");
    try {
      const data = await roleDataApi.chat(question);
      setMessages(m => [...m, {role:"assistant", text:data.answer}]);
      setAiMeta(data.ai || {});
    } catch(err) {
      setMessages(m => [...m, {role:"assistant", text:`I couldn't reach the HealthSync AI service. ${showError(err)}\n\nMake sure the HealthSync backend is running on port 5000.`}]);
    } finally { setBusy(""); }
  };

  const submit = async (e:FormEvent) => { e.preventDefault(); const text=draft.trim(); if(!text || busy) return; setDraft(""); await ask(text); };

  const run = async (kind:string) => {
    if (busy) return;
    if (kind === "symptoms" && !symptoms.trim()) return;
    setBusy(kind);
    setToolAnswer("");
    setInsights([]);
    setShowAnalysis(true);
    try {
      if(kind === "insights") {
        const d=await roleDataApi.aiInsights();
        const list=d.insights || [];
        setInsights(list);
        setToolAnswer(list.length ? list.map((x,i)=>`${i + 1}. ${x}`).join("\n\n") : (d.message || "No health insights are available yet. Add medications, vitals, appointments or other records first."));
        setAiMeta(d.ai || {});
        setToolTitle("AI health insights");
      } else if(kind === "medication") {
        const d=await roleDataApi.aiMedicationCoach();
        setToolAnswer(d.answer || "No medication analysis was returned.");
        setAiMeta(d.ai || {});
        setToolTitle("Medication AI analysis");
      } else if(kind === "vitals") {
        const d=await roleDataApi.aiVitalsAnalysis();
        setToolAnswer(d.answer || "No vital trend analysis was returned.");
        setAiMeta(d.ai || {});
        setToolTitle("Vital trend AI analysis");
      } else if(kind === "symptoms") {
        const d=await roleDataApi.aiSymptomAnalysis(symptoms.trim());
        setToolAnswer(d.answer || "No symptom analysis was returned.");
        setAiMeta(d.ai || {});
        setToolTitle("Symptom support analysis");
      }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch(err) {
      setToolTitle("AI connection error");
      setToolAnswer(`${showError(err)}\n\nCheck that the HealthSync backend is running on http://localhost:5000. Your request was not completed.`);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } finally {
      setBusy("");
    }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">AI Health Assistant</h1><p className="mt-1 text-sm text-charcoal-500">AI-powered record analysis, medication support, vital trends and symptom guidance.</p></div>
      <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status?.ollama ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
        {status?.ollama ? `● Ollama connected · ${status.model}` : "● Local fallback / Ollama unavailable"}
      </div>
    </div>

    {!status?.ollama && status && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0"/><div><b>AI model not connected.</b><div className="mt-1">{status.message} Start Ollama and install a local model to get live generated answers.</div></div></div>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
      <div className="min-w-0 space-y-5">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-paper-200 bg-paper-50 p-4">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-800"><Bot className="h-5 w-5"/></span><div><p className="font-semibold">HealthSync Assistant</p><p className="text-xs text-charcoal-500">Local Ollama AI · role-authorized health data</p></div></div>
            <span className="hidden rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-bold text-ink-500 sm:inline-flex">RECORD-GROUNDED</span>
          </div>
          <div className="min-h-[230px] max-h-[300px] space-y-4 overflow-y-auto p-4">
            {messages.map((m,i)=><div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role==="user"?"bg-ink-800 text-white":"bg-paper-100 text-charcoal-800"}`}>{m.text}</div></div>)}
            {busy==="chat"&&<div className="text-xs text-charcoal-500">AI is checking authorized health data…</div>}
          </div>
          <form onSubmit={submit} className="border-t border-paper-200 p-4"><div className="flex gap-2"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="e.g. Give me my medication details or summarize my vitals" className="min-w-0 flex-1 rounded-xl border border-paper-300 bg-paper-0 px-4 py-3 text-sm outline-none focus:border-ink-700"/><button disabled={!!busy||!draft.trim()} className="flex items-center gap-2 rounded-xl bg-ink-800 px-4 py-3 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/>Ask AI</button></div></form>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-ink-700"/><div><p className="font-semibold">AI Health Insights</p><p className="text-xs text-charcoal-500">Summarizes authorized records.</p></div></div><button type="button" onClick={()=>void run("insights")} disabled={!!busy} className="mt-4 w-full rounded-xl bg-ink-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy==="insights"?"Analyzing…":"Generate insights"}</button></Card>
          <Card className="p-4"><div className="flex items-center gap-3"><Pill className="h-5 w-5 text-ink-700"/><div><p className="font-semibold">Medication AI Coach</p><p className="text-xs text-charcoal-500">Adherence, missed doses and stock.</p></div></div><button type="button" onClick={()=>void run("medication")} disabled={!!busy} className="mt-4 w-full rounded-xl bg-ink-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy==="medication"?"Analyzing…":"Analyze medications"}</button></Card>
          <Card className="p-4"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-ink-700"/><div><p className="font-semibold">Vital Trend AI</p><p className="text-xs text-charcoal-500">Finds patterns in recorded vitals.</p></div></div><button type="button" onClick={()=>void run("vitals")} disabled={!!busy} className="mt-4 w-full rounded-xl bg-ink-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy==="vitals"?"Analyzing…":"Analyze vitals"}</button></Card>
        </div>

        {insights.length>0 && <Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><Brain className="h-5 w-5"/> AI-generated health insights</h2><ul className="mt-3 space-y-2 text-sm text-charcoal-700">{insights.map((x,i)=><li key={i} className="rounded-xl bg-paper-50 p-3">{x}</li>)}</ul></Card>}

        {toolAnswer && <div ref={resultRef}><Card className="overflow-hidden p-0"><button type="button" onClick={()=>setShowAnalysis(v=>!v)} className="flex w-full items-center justify-between p-5 text-left hover:bg-paper-50"><div><h2 className="font-semibold">{toolTitle}</h2><p className="mt-1 text-xs text-charcoal-500">{aiMeta.live ? `Generated by local Ollama · ${aiMeta.model}` : aiMeta.grounded ? "Grounded in authorized HealthSync records" : "Generated using HealthSync's local safe fallback"}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-100 text-charcoal-700">{showAnalysis?<ChevronUp className="h-5 w-5"/>:<ChevronDown className="h-5 w-5"/>}</span></button>{showAnalysis && <div className="border-t border-paper-200 p-5"><p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal-700">{toolAnswer}</p></div>}</Card></div>}

        <Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5"/> Symptom support</h2><p className="mt-1 text-xs text-charcoal-500">Informational only — not a diagnosis or prescription.</p><div className="mt-3 flex gap-2"><input value={symptoms} onChange={e=>setSymptoms(e.target.value)} placeholder="e.g. headache since yesterday with mild nausea" className="min-w-0 flex-1 rounded-xl border border-paper-300 bg-paper-0 px-4 py-3 text-sm outline-none focus:border-ink-700"/><button type="button" onClick={()=>void run("symptoms")} disabled={!!busy||!symptoms.trim()} className="rounded-xl bg-ink-800 px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{busy==="symptoms"?"Analyzing…":"Analyze"}</button></div></Card>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-paper-200 bg-paper-50 p-4"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-ink-700"/><h2 className="font-semibold">Patient overview</h2></div><p className="mt-1 text-[11px] text-charcoal-500">Authorized data available to this workspace</p></div>
          <div className="p-4">
            {patients.length>1 && <select value={selectedPatient} onChange={e=>setSelectedPatient(Number(e.target.value))} className="mb-3 w-full rounded-xl border border-paper-300 bg-paper-0 px-3 py-2 text-xs font-semibold outline-none">{patients.map((p,i)=><option key={p.patient.id} value={i}>{p.patient.name}</option>)}</select>}
            {activePatient ? <>
              <div className="rounded-xl border border-paper-200 bg-paper-50 p-3"><p className="font-semibold">{activePatient.patient.name}</p><p className="mt-0.5 text-[11px] text-charcoal-500">Patient {activePatient.patient.patientCode}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-paper-0 p-2.5"><p className="text-[10px] text-charcoal-500">Adherence</p><p className="mt-0.5 text-lg font-bold">{activePatient.adherenceRate}%</p></div><div className="rounded-lg bg-paper-0 p-2.5"><p className="text-[10px] text-charcoal-500">Open alerts</p><p className="mt-0.5 text-lg font-bold">{openAlerts.length}</p></div></div></div>

              <div className="mt-4"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal-500"><HeartPulse className="h-3.5 w-3.5"/> Latest vitals</p>{vital ? <div className="grid grid-cols-3 gap-2"><div className="rounded-lg border border-paper-200 p-2"><p className="text-[9px] text-charcoal-500">HR</p><p className="font-semibold">{vitalLabel(vital.heartRate," bpm")}</p></div><div className="rounded-lg border border-paper-200 p-2"><p className="text-[9px] text-charcoal-500">BP</p><p className="font-semibold">{vitalLabel(vital.systolic)}/{vitalLabel(vital.diastolic)}</p></div><div className="rounded-lg border border-paper-200 p-2"><p className="text-[9px] text-charcoal-500">Glucose</p><p className="font-semibold">{vitalLabel(vital.glucose)}</p></div></div> : <p className="text-xs text-charcoal-500">No vital readings recorded.</p>}</div>

              <div className="mt-4"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal-500"><Pill className="h-3.5 w-3.5"/> Medications</p>{activePatient.medications?.length ? <div className="space-y-2">{activePatient.medications.slice(0,4).map(m=><div key={m.id} className="rounded-lg border border-paper-200 p-2.5"><p className="text-xs font-semibold">{m.name}</p><p className="mt-0.5 text-[10px] text-charcoal-500">{m.dosage} · {m.schedule}</p><p className="mt-1 text-[10px] text-charcoal-500">Stock: {m.stock}</p></div>)}</div> : <p className="text-xs text-charcoal-500">No medications recorded.</p>}</div>
            </> : <div className="py-6 text-center text-xs text-charcoal-500">No authorized patient record is available.</div>}
          </div>
        </Card>

        <Card className="p-4"><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-ink-700"/><h2 className="font-semibold">Care escalation</h2></div><p className="mt-1 text-[11px] text-charcoal-500">The buzzer is used for abnormal care events.</p><div className="mt-3 rounded-xl border border-ink-700/20 bg-ink-100 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-ink-500"><span className="h-2 w-2 rounded-full bg-ink-600"/> Monitoring active</div><p className="mt-2 text-[10px] leading-relaxed text-ink-500">Patient abnormal vitals → caregiver + physician. Caregiver observation → physician.</p></div></Card>

        <Card className="p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-ink-700"/><h2 className="font-semibold">Upcoming appointments</h2></div><div className="mt-3 space-y-2">{activePatient?.appointments?.slice(0,3).map(a=><div key={a.id} className="rounded-lg border border-paper-200 p-2.5"><p className="text-xs font-semibold">{a.title}</p><p className="mt-0.5 text-[10px] text-charcoal-500">{a.date} · {a.time} · {a.status}</p></div>)}{!activePatient?.appointments?.length && <p className="text-xs text-charcoal-500">No appointments recorded.</p>}</div></Card>

        {openAlerts.length>0 && <Card className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/><h2 className="font-semibold">Recent alerts</h2></div><div className="mt-3 space-y-2">{openAlerts.map(a=><div key={a.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5"><p className="text-[10px] font-bold text-amber-900">{a.severity}</p><p className="mt-0.5 text-xs text-amber-900">{a.message}</p></div>)}</div></Card>}
      </aside>
    </div>
  </div>;
}
