const MEDICATION_TERMS = /\b(medication|medications|medicine|medicines|drug|drugs|tablet|tablets|pill|pills)\b/;
const DOSE_TERMS = /\b(dose|doses)\b/;

export function classifyMedicationRecordIntent(message) {
  const lower = String(message || "").toLowerCase();
  const adherenceLanguage = /\b(adherence|non-adherence|nonadherence|dose history|pending doses?)\b/.test(lower);
  const missedDoseLanguage = /\b(?:miss|missed|missing)\b.{0,45}\b(?:doses?|medications?|medicines?|tablets?|pills?)\b/.test(lower)
    || /\b(?:doses?|medications?|medicines?|tablets?|pills?)\b.{0,45}\b(?:miss|missed|missing)\b/.test(lower);
  if (adherenceLanguage || missedDoseLanguage) return "adherence";
  if (MEDICATION_TERMS.test(lower)) return "medications";
  if (DOSE_TERMS.test(lower) && /\b(taken|taking|scheduled)\b/.test(lower)) return "adherence";
  return null;
}

export function buildGroundedAdherenceAnswer(context) {
  const { patient, adherence } = context;
  const missedLogs = context.medications
    .flatMap(medication => medication.logs
      .filter(log => log.status === "MISSED")
      .map(log => ({ medication, log })))
    .sort((a, b) => new Date(b.log.scheduledAt) - new Date(a.log.scheduledAt));

  const parts = [
    `${patient.name}'s current recorded medication adherence is ${adherence.rate}%.`,
    `HealthSync records ${adherence.missed} missed dose${adherence.missed === 1 ? "" : "s"} and ${adherence.pending} pending dose${adherence.pending === 1 ? "" : "s"}.`,
  ];

  if (missedLogs.length) {
    const latest = missedLogs[0];
    const names = [...new Set(missedLogs.map(({ medication }) => `${medication.name} ${medication.dosage}`))].slice(0, 3);
    parts.push(`Missed medication${names.length === 1 ? "" : "s"} in the available records: ${names.join(", ")}.`);
    parts.push(`Latest recorded missed dose: ${latest.medication.name} ${latest.medication.dosage}, scheduled ${new Date(latest.log.scheduledAt).toLocaleString()} (MISSED).`);
  } else if (adherence.missed > 0) {
    parts.push("Missed doses exist in the complete record, but their medication details are outside the recent records included here.");
  } else {
    parts.push("No missed doses are recorded.");
  }

  parts.push(adherence.missed > 0 ? "This adherence record requires attention." : "No missed-dose attention signal is currently recorded.");
  parts.push("Continue following the prescribed schedule. If you are unsure what to do after a missed dose, contact your healthcare professional.");
  return parts.join(" ");
}
