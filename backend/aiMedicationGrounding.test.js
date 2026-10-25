import test from "node:test";
import assert from "node:assert/strict";
import { buildGroundedAdherenceAnswer, classifyMedicationRecordIntent } from "./aiMedicationGrounding.js";

test("adherence language takes precedence over generic medication matching", () => {
  for (const question of [
    "How is my medication adherence?",
    "How is my adherence?",
    "Did I miss any medication?",
    "Did I miss any doses?",
    "Have I missed any medicines today?",
    "Is there anything wrong with my medication adherence?",
  ]) assert.equal(classifyMedicationRecordIntent(question), "adherence", question);
});

test("medication-list questions remain medication intent", () => {
  for (const question of ["What medications am I taking?", "List my medicines", "What are my current medications?"]) {
    assert.equal(classifyMedicationRecordIntent(question), "medications", question);
  }
});

test("grounded adherence answer identifies an actual missed medication", () => {
  const scheduledAt = "2026-10-25T14:54:00.000Z";
  const answer = buildGroundedAdherenceAnswer({
    patient: { name: "Aarav" },
    adherence: { rate: 80, missed: 1, pending: 0 },
    medications: [{ name: "DemoMed", dosage: "250 mg", logs: [{ status: "MISSED", scheduledAt }] }],
  });
  assert.match(answer, /80%/);
  assert.match(answer, /1 missed dose/);
  assert.match(answer, /DemoMed 250 mg/);
  assert.match(answer, /MISSED/);
});

test("grounded adherence answer does not invent a missed dose", () => {
  const answer = buildGroundedAdherenceAnswer({
    patient: { name: "Aarav" },
    adherence: { rate: 100, missed: 0, pending: 0 },
    medications: [{ name: "DemoMed", dosage: "250 mg", logs: [{ status: "TAKEN", scheduledAt: "2026-10-25T14:54:00.000Z" }] }],
  });
  assert.match(answer, /No missed doses are recorded/);
  assert.doesNotMatch(answer, /Latest recorded missed dose/);
});
