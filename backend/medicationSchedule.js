const CLOCK_TIME = /\b(\d{1,2}):([0-5]\d)\s*(am|pm)?\b/gi;

export function parseScheduleTimes(schedule) {
  const times = [];
  const seen = new Set();
  for (const match of String(schedule || "").matchAll(CLOCK_TIME)) {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem) {
      if (hour < 1 || hour > 12) continue;
      hour = hour % 12 + (meridiem === "pm" ? 12 : 0);
    } else if (hour > 23) continue;
    const key = `${hour}:${minute}`;
    if (!seen.has(key)) {
      seen.add(key);
      times.push({ hour, minute });
    }
  }
  return times.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
}

export function localDayBounds(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1);
  return { start, end };
}

export function scheduleOccurrencesForDay(schedule, reference = new Date()) {
  return parseScheduleTimes(schedule).map(({ hour, minute }) =>
    new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), hour, minute, 0, 0)
  );
}
