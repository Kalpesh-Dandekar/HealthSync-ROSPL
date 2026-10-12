import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Bot, Brain, CheckCircle2, ChevronDown, CircleAlert, Pill, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { ApiRequestError, roleDataApi, type AiContextResponse, type AiMetadata, type AiPatientChoice, type AiRole, type AiSource } from "../../api/roleData";

type Message = { id:number; role:"user"|"assistant"; text:string; ai?:AiMetadata; sources?:AiSource[] };
type ToolKind = "insights"|"medication"|"vitals"|"symptoms";

const prompts:Record<AiRole,string[]> = {
  patient: ["Summarize my HealthSync records", "How is my medication adherence?", "Explain my recent vitals", "What is my next appointment?", "Explain my latest clinical record"],
  doctor: ["Give me a concise clinical summary", "Summarize recent vital trends", "Review medication adherence", "Summarize recent clinical records", "What should I review before the next appointment?"],
  caregiver: ["Summarize recent care activity", "How is medication adherence?", "Are there any recent alerts?", "What appointments are coming up?", "What should I pay attention to?"],
};

const roleCopy:Record<AiRole,{subtitle:string;empty:string;safety:string}> = {
  patient: { subtitle:"Understand your medications, vitals, appointments and recent care records.", empty:"Ask about your medications, recent vitals, appointments or HealthSync records.", safety:"HealthSync AI can summarize your records and provide general information. It does not replace professional medical advice." },
  doctor: { subtitle:"Review authorized patient records with concise clinical summaries.", empty:"Select a patient, then ask for a clinical summary, recent trends or record review.", safety:"HealthSync AI is decision support. It does not replace professional medical judgment." },
  caregiver: { subtitle:"Stay informed about medications, appointments and recent care activity.", empty:"Select a patient, then ask about adherence, appointments or recent care activity.", safety:"HealthSync AI supports care coordination and general information. It does not provide a diagnosis." },
};

const toolCards:{kind:Exclude<ToolKind,"symptoms">;title:string;description:string;button:string;icon:typeof Sparkles}[] = [
  {kind:"insights",title:"AI Health Insights",description:"A concise, record-grounded care summary.",button:"Generate insights",icon:Sparkles},
  {kind:"medication",title:"Medication AI Coach",description:"Adherence, missed doses, reminders and stock.",button:"Review medications",icon:Pill},
  {kind:"vitals",title:"Vital Trend AI",description:"Recorded ranges and recent vital patterns.",button:"Review vital trends",icon:Activity},
];

function modeLabel(ai?:AiMetadata) {
  if (!ai) return "";
  return ({record:"Record grounded",general:"General information",safety:"Safety guidance",urgent:"Urgent guidance",fallback:"Local fallback"} as const)[ai.mode] || "HealthSync AI";
}

function accessLabel(accessType:AiPatientChoice["accessType"]) {
  return accessType === "EMERGENCY" ? "Emergency access" : accessType === "CARE_NETWORK" ? "Care Network" : "Your HealthSync records";
}

function SourceChips({sources=[]}:{sources?:AiSource[]}) {
  if (!sources.length) return null;
  return <div className="mt-3 flex flex-wrap gap-1.5" aria-label="HealthSync record sources">{sources.map(source=><span key={source.type} className="rounded-full border border-[#c7dfd3] bg-[#e8f4ee] px-2.5 py-1 text-[10px] font-semibold text-[#236747]">{source.label} · {source.count}{source.includedCount<source.count?` (${source.includedCount} recent)`:""}</span>)}</div>;
}

function initialRole():AiRole {
  try {
    const role=JSON.parse(localStorage.getItem("healthsync_user")||"{}").role;
    return role==="doctor"||role==="caregiver"?role:"patient";
  } catch { return "patient"; }
}

export function AIAssistantPage() {
  const [role,setRole]=useState<AiRole>(initialRole);
  const [patients,setPatients]=useState<AiPatientChoice[]>([]);
  const [selectedPatientId,setSelectedPatientId]=useState<number|null>(null);
  const [status,setStatus]=useState<{ollama:boolean;model:string|null;message:string}|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [draft,setDraft]=useState("");
  const [symptoms,setSymptoms]=useState("");
  const [busy,setBusy]=useState<"chat"|ToolKind|"">("");
  const [error,setError]=useState("");
  const [contextLoading,setContextLoading]=useState(true);
  const messageId=useRef(0);
  const endRef=useRef<HTMLDivElement>(null);

  const professional=role!=="patient";
  const activePatient=professional?patients.find(patient=>patient.id===selectedPatientId)||null:patients[0]||null;
  const ready=!professional||Boolean(activePatient);
  const selectedScope=professional?activePatient?.id:undefined;

  const clearConversation=useCallback(()=>{setMessages([]);setError("");setDraft("");setSymptoms("");},[]);

  const applyContext=useCallback((context:AiContextResponse,allowAutoSelect=true)=>{
    setRole(context.role);
    setPatients(context.patients||[]);
    setSelectedPatientId(current=>{
      if(context.role==="patient") return null;
      if(current&&context.patients.some(patient=>patient.id===current)) return current;
      if(allowAutoSelect&&context.patients.length===1) return context.patients[0].id;
      return null;
    });
  },[]);

  const refreshContext=useCallback(async(allowAutoSelect=true)=>{
    try { applyContext(await roleDataApi.aiContext(),allowAutoSelect); }
    catch { setError("Authorized patient context could not be refreshed. Please try again."); }
    finally { setContextLoading(false); }
  },[applyContext]);

  useEffect(()=>{
    void Promise.all([roleDataApi.aiStatus().then(setStatus).catch(()=>setStatus(null)),refreshContext()]);
    const onFocus=()=>void refreshContext(false);
    window.addEventListener("focus",onFocus);
    return()=>window.removeEventListener("focus",onFocus);
  },[refreshContext]);

  useEffect(()=>{
    if(!professional||!selectedPatientId)return;
    roleDataApi.aiContext(selectedPatientId).then(context=>{
      setPatients(context.patients);
      if(!context.selectedPatient){setSelectedPatientId(null);clearConversation();}
    }).catch(error=>{
      if(error instanceof ApiRequestError&&error.status===403){setSelectedPatientId(null);clearConversation();void refreshContext(false);}
      else setError("The selected patient context could not be verified.");
    });
  },[professional,selectedPatientId,clearConversation,refreshContext]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,busy]);

  const appendAssistant=(text:string,ai?:AiMetadata,sources?:AiSource[])=>setMessages(current=>[...current,{id:++messageId.current,role:"assistant",text,ai,sources}]);
  const friendlyError=(value:unknown)=>value instanceof ApiRequestError&&value.status===401?"Your session has expired. Please sign in again.":value instanceof Error?value.message:"The HealthSync AI service is temporarily unavailable.";

  const handleFailure=async(value:unknown)=>{
    if(value instanceof ApiRequestError&&value.status===403&&professional){setSelectedPatientId(null);clearConversation();await refreshContext(false);setError("Patient access changed. Select a currently authorized patient to continue.");return;}
    setError(`${friendlyError(value)} Please retry when ready.`);
  };

  const ask=async(question:string)=>{
    if(!question.trim()||busy||!ready)return;
    setMessages(current=>[...current,{id:++messageId.current,role:"user",text:question.trim()}]);
    setError("");setBusy("chat");
    try { const data=await roleDataApi.chat(question.trim(),selectedScope);appendAssistant(data.answer,data.ai,data.sources); }
    catch(value){await handleFailure(value);}finally{setBusy("");}
  };

  const submit=(event:FormEvent)=>{event.preventDefault();const question=draft.trim();if(!question)return;setDraft("");void ask(question);};

  const selectPatient=(value:string)=>{
    const next=value?Number(value):null;
    if(next===selectedPatientId)return;
    setSelectedPatientId(next);clearConversation();
  };

  const runTool=async(kind:ToolKind)=>{
    if(busy||!ready||kind==="symptoms"&&!symptoms.trim())return;
    const labels:Record<ToolKind,string>={insights:"Generate AI Health Insights",medication:"Review medications with AI Coach",vitals:"Review vital trends",symptoms:`Symptom support: ${symptoms.trim()}`};
    setMessages(current=>[...current,{id:++messageId.current,role:"user",text:labels[kind]}]);
    setError("");setBusy(kind);
    try {
      const data=kind==="insights"?await roleDataApi.aiInsights(selectedScope):kind==="medication"?await roleDataApi.aiMedicationCoach(selectedScope):kind==="vitals"?await roleDataApi.aiVitalsAnalysis(selectedScope):await roleDataApi.aiSymptomAnalysis(symptoms.trim(),selectedScope);
      appendAssistant(data.answer,data.ai,data.sources);
      if(kind==="symptoms")setSymptoms("");
    } catch(value){await handleFailure(value);}finally{setBusy("");}
  };

  const suggested=useMemo(()=>prompts[role], [role]);
  const copy=roleCopy[role];

  return <div className="space-y-4">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-700"><Brain className="h-4 w-4"/>Clinical intelligence</div><h1 className="mt-2 font-display text-2xl font-semibold text-charcoal-900 sm:text-3xl">HealthSync AI</h1><p className="mt-1 text-sm text-charcoal-500">Record-grounded assistance based on authorized HealthSync data.</p><p className="mt-1 text-xs text-charcoal-500">{copy.subtitle}</p></div>
      <div className={`inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${status?.ollama?"border-sage-200 bg-sage-50 text-sage-800":"border-paper-300 bg-paper-50 text-charcoal-700"}`}><span className={`h-2 w-2 rounded-full ${status?.ollama?"bg-sage-600":status?"bg-amber-500":"bg-charcoal-400"}`}/><span>{status?.ollama?"Local AI connected":status?"Local fallback":"Checking Local AI"}</span>{status?.ollama&&status.model&&<span className="font-normal opacity-75">· {status.model}</span>}</div>
    </header>

    <Card className="p-3.5 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-ink-700"/><h2 className="text-sm font-semibold text-charcoal-900">AI patient context</h2></div>
          {role==="patient"?<p className="mt-1 text-xs text-charcoal-500">Using your authorized HealthSync records</p>:<div className="mt-2 max-w-md"><label htmlFor="ai-patient" className="mb-1.5 block text-xs font-medium text-charcoal-600">Select an authorized patient</label><div className="relative"><select id="ai-patient" value={selectedPatientId||""} onChange={event=>selectPatient(event.target.value)} disabled={contextLoading||busy!==""} className="w-full appearance-none rounded-xl border border-paper-300 bg-paper-0 px-3 py-2.5 pr-9 text-sm font-semibold text-charcoal-900 outline-none transition focus:border-ink-700 focus:ring-2 focus:ring-ink-700/10 disabled:opacity-60"><option value="">Select patient</option>{patients.map(patient=><option key={patient.id} value={patient.id}>{patient.name} — {accessLabel(patient.accessType)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-charcoal-500"/></div></div>}
          {professional&&!contextLoading&&!patients.length&&<p className="mt-2 text-xs text-charcoal-500">{role==="doctor"?"No patients are currently available for AI review.":"No connected patients are currently available."}</p>}
        </div>
        {professional&&activePatient&&<div className="flex flex-wrap items-center gap-2 lg:justify-end"><span className="text-xs text-charcoal-500">Reviewing</span><strong className="text-sm text-charcoal-900">{activePatient.name}</strong><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${activePatient.accessType==="EMERGENCY"?"bg-amber-100 text-amber-900":"bg-paper-100 text-charcoal-600"}`}>{accessLabel(activePatient.accessType)}</span></div>}
      </div>
      {!status?.ollama&&status&&<div className="mt-3 flex items-start gap-2 rounded-lg bg-paper-50 px-3 py-2 text-xs text-charcoal-600"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"/><span>Live local generation is unavailable. Supported record lookups and safe fallback responses remain available.</span></div>}
    </Card>

    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-paper-200 bg-paper-50 px-4 py-3.5 sm:px-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800 text-white"><Bot className="h-4 w-4"/></span><div><p className="text-sm font-semibold text-charcoal-900">Authorized record assistant</p><p className="text-[11px] text-charcoal-500">Session-only · conversation is not saved</p></div></div>{ready&&<span className="hidden items-center gap-1.5 text-[10px] font-semibold text-sage-700 sm:flex"><CheckCircle2 className="h-3.5 w-3.5"/>Context ready</span>}</div>
      <div className="min-h-[190px] max-h-[430px] overflow-y-auto bg-paper-100 p-4 shadow-inner sm:p-5" aria-live="polite">
        {!messages.length&&!busy&&<div className="mx-auto flex min-h-[160px] max-w-lg flex-col items-center justify-center text-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700/15 bg-ink-100 text-ink-700"><Brain className="h-5 w-5"/></span><h2 className="mt-3 font-display text-base font-semibold text-charcoal-900">How can HealthSync AI help?</h2><p className="mt-1.5 text-sm leading-relaxed text-charcoal-500">{copy.empty}</p>{!ready&&<p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">Select a patient to begin an authorized review.</p>}</div>}
        <div className="space-y-3">{messages.map(message=><div key={message.id} className={`flex ${message.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[90%] sm:max-w-[80%] ${message.role==="user"?"rounded-2xl rounded-br-md bg-ink-800 px-4 py-2.5 text-white":"rounded-2xl rounded-bl-md border border-[#d8e4df] bg-[#f7faf9] px-4 py-2.5 text-[#17252d] shadow-sm"}`}><p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>{message.role==="assistant"&&<><SourceChips sources={message.sources}/>{message.ai&&<div className={`mt-2 flex items-center gap-1.5 text-[10px] font-semibold ${message.ai.mode==="urgent"?"text-[#9f3027]":message.ai.mode==="safety"?"text-[#7a4c0b]":"text-[#53646d]"}`}>{message.ai.mode==="urgent"&&<AlertTriangle className="h-3.5 w-3.5"/>}{modeLabel(message.ai)}{message.ai.live&&message.ai.model&&<span className="font-normal">· Local AI</span>}</div>}</>}</div></div>)}
          {busy&&<div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-[#d8e4df] bg-[#f7faf9] px-4 py-2.5 text-sm text-[#53646d] shadow-sm"><span className="inline-flex items-center gap-2"><span className="flex gap-1" aria-hidden="true"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500"/><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500 [animation-delay:150ms]"/><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500 [animation-delay:300ms]"/></span>Reviewing authorized context…</span></div></div>}
          <div ref={endRef}/></div>
      </div>
      <div className="border-t border-paper-200 bg-paper-0 p-3.5 sm:p-4">
        {error&&<div className="mb-3 flex items-start gap-2 rounded-xl border border-brick-600/20 bg-brick-50 px-3 py-2.5 text-xs text-brick-800" role="alert"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0"/><span>{error}</span></div>}
        <div className="mb-2.5 flex flex-wrap gap-1.5">{suggested.map(prompt=><button key={prompt} type="button" onClick={()=>void ask(prompt)} disabled={!ready||busy!==""} className="rounded-full border border-paper-300 bg-paper-50 px-2.5 py-1.5 text-[10px] font-medium text-charcoal-700 transition hover:border-ink-500 hover:bg-ink-100 focus:outline-none focus:ring-2 focus:ring-ink-700/20 disabled:cursor-not-allowed disabled:opacity-50">{prompt}</button>)}</div>
        <form onSubmit={submit}><label htmlFor="ai-question" className="sr-only">Ask HealthSync AI</label><div className="flex flex-col gap-2 sm:flex-row"><textarea id="ai-question" rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} disabled={!ready||busy!==""} placeholder={ready?"Ask about authorized HealthSync records or general health information…":"Select a patient to enable HealthSync AI"} className="min-h-[46px] max-h-24 min-w-0 flex-1 resize-y rounded-xl border border-paper-300 bg-paper-0 px-4 py-3 text-sm outline-none transition focus:border-ink-700 focus:ring-2 focus:ring-ink-700/10 disabled:bg-paper-50 disabled:opacity-70"/><button disabled={!ready||busy!==""||!draft.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-ink-700 focus:outline-none focus:ring-2 focus:ring-ink-700/30 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4"/>Ask AI</button></div></form>
        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-charcoal-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>{copy.safety}</p>
      </div>
    </Card>

    <section aria-labelledby="ai-tools-title"><div className="mb-3"><h2 id="ai-tools-title" className="font-display text-lg font-semibold text-charcoal-900">AI record tools</h2><p className="mt-0.5 text-xs text-charcoal-500">Focused analysis uses the same authorized patient context and appears in the conversation above.</p></div><div className="grid gap-3 md:grid-cols-3">{toolCards.map(tool=>{const Icon=tool.icon;return <Card key={tool.kind} className="flex h-full flex-col p-4 transition hover:border-ink-700/30 hover:shadow-md"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-700"><Icon className="h-4 w-4"/></span><h3 className="mt-3 text-sm font-semibold text-charcoal-900">{tool.title}</h3><p className="mt-1 flex-1 text-xs leading-relaxed text-charcoal-500">{tool.description}</p><button type="button" onClick={()=>void runTool(tool.kind)} disabled={!ready||busy!==""} className="mt-4 rounded-xl border border-ink-700/20 bg-ink-100 px-3 py-2.5 text-xs font-semibold text-ink-800 transition hover:bg-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-700/20 disabled:cursor-not-allowed disabled:opacity-50">{busy===tool.kind?"Reviewing…":tool.button}</button></Card>})}</div></section>

    <Card className="p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-ink-700"/><h2 className="text-sm font-semibold text-charcoal-900">Symptom support</h2></div><p className="mt-1 text-xs text-charcoal-500">Organize symptoms and receive general guidance. This does not provide a diagnosis or trigger Emergency SOS.</p><label htmlFor="ai-symptoms" className="sr-only">Describe symptoms</label><input id="ai-symptoms" value={symptoms} onChange={event=>setSymptoms(event.target.value)} disabled={!ready||busy!==""} placeholder="Describe symptoms, timing and severity" className="mt-3 w-full rounded-xl border border-paper-300 bg-paper-0 px-4 py-2.5 text-sm outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-700/10 disabled:bg-paper-50 disabled:opacity-70"/></div><button type="button" onClick={()=>void runTool("symptoms")} disabled={!ready||busy!==""||!symptoms.trim()} className="rounded-xl bg-ink-800 px-5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-ink-700/30 disabled:cursor-not-allowed disabled:opacity-50">{busy==="symptoms"?"Reviewing…":"Get symptom support"}</button></div></Card>
  </div>;
}
