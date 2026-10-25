import test from "node:test";
import assert from "node:assert/strict";
import { localDayBounds, parseScheduleTimes, scheduleOccurrencesForDay } from "./medicationSchedule.js";

test("parses supported 12-hour and 24-hour schedules", () => {
  assert.deepEqual(parseScheduleTimes("8:24 pm"), [{ hour: 20, minute: 24 }]);
  assert.deepEqual(parseScheduleTimes("08:24"), [{ hour: 8, minute: 24 }]);
  assert.deepEqual(parseScheduleTimes("08:00 and 20:00"), [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }]);
});

test("ignores unparseable and invalid schedules", () => {
  assert.deepEqual(parseScheduleTimes("Morning"), []);
  assert.deepEqual(parseScheduleTimes("25:00 daily"), []);
});

test("derives occurrences and day bounds in the backend local timezone", () => {
  const reference = new Date(2026, 9, 25, 12, 30);
  const [occurrence] = scheduleOccurrencesForDay("8:24 pm", reference);
  const { start, end } = localDayBounds(reference);
  assert.equal(occurrence.getFullYear(), 2026);
  assert.equal(occurrence.getMonth(), 9);
  assert.equal(occurrence.getDate(), 25);
  assert.equal(occurrence.getHours(), 20);
  assert.equal(occurrence.getMinutes(), 24);
  assert.equal(start.getHours(), 0);
  assert.equal(end.getDate(), 26);
});
