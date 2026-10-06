import { useEffect, useState } from "react";
import { Card, CardHeader } from "../../components/ui/Card";
import { VitalHistory, VitalSummary, VitalTrends } from "../../components/vitals/VitalMonitoring";
import { vitalApi, type VitalRecord } from "../../api/vitalApi";

export function PatientVitals() {
  const [vitals,setVitals]=useState<VitalRecord[]>([]); const [message,setMessage]=useState("");
  useEffect(()=>{vitalApi.listOwn().then(data=>setVitals(data.vitals)).catch(error=>setMessage(error instanceof Error?error.message:"Unable to load vital readings."));},[]);
  return <div className="patient-workspace-page patient-vitals screen-page space-y-4">
    <div><h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">Vitals &amp; health monitoring</h1><p className="mt-1 text-sm text-charcoal-500">Review the readings saved by you and your authorized care team. These entries are not live device telemetry.</p></div>
    {message&&<div className="rounded-xl border border-brick-600/30 bg-brick-100 px-4 py-3 text-xs text-brick-700">{message}</div>}
    <VitalSummary vitals={vitals}/>
    <VitalTrends vitals={vitals}/>
    <Card><CardHeader title="Reading history" subtitle="Newest first, with recorder provenance"/><VitalHistory vitals={vitals}/></Card>
  </div>;
}
