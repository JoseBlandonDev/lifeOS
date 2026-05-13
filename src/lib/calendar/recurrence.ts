// Expansión de recurrencia mínima (RRULE simplificado).
// Soporta FREQ daily | weekly | monthly | yearly + interval + byweekday + count + until.

export type Recurrence = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byweekday?: string[]; // ['MO','TU','WE','TH','FR','SA','SU']
  count?: number | null;
  until?: string | null; // 'YYYY-MM-DD'
};

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function addYears(d: Date, n: number) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
}

export function expandRecurrence(
  startsAt: Date,
  endsAt: Date | null,
  rec: Recurrence | null,
  windowStart: Date,
  windowEnd: Date,
  hardCap = 366,
): { start: Date; end: Date | null }[] {
  const duration =
    endsAt != null ? endsAt.getTime() - startsAt.getTime() : null;

  if (!rec) {
    if (startsAt >= windowStart && startsAt <= windowEnd) {
      return [{ start: startsAt, end: endsAt }];
    }
    return [];
  }

  const out: { start: Date; end: Date | null }[] = [];
  const interval = Math.max(1, rec.interval || 1);
  const untilDate = rec.until ? new Date(`${rec.until}T23:59:59`) : null;
  const cap = rec.count && rec.count > 0 ? Math.min(hardCap, rec.count) : hardCap;

  let occurrenceCount = 0;
  let cursor = new Date(startsAt);

  function pushIfInWindow(dt: Date) {
    if (dt > windowEnd) return false;
    if (untilDate && dt > untilDate) return false;
    if (dt >= windowStart) {
      const end = duration != null ? new Date(dt.getTime() + duration) : null;
      out.push({ start: dt, end });
    }
    occurrenceCount++;
    return true;
  }

  if (rec.freq === "daily") {
    while (occurrenceCount < cap) {
      if (!pushIfInWindow(cursor)) break;
      cursor = addDays(cursor, interval);
      if (cursor > windowEnd) break;
    }
    return out;
  }

  if (rec.freq === "weekly") {
    const days =
      rec.byweekday && rec.byweekday.length > 0
        ? rec.byweekday
        : [WEEKDAYS[startsAt.getDay()]];
    // Posición del lunes de la semana en la que arranca (compatible con la noción de "semana base")
    const weekStart = addDays(startsAt, -startsAt.getDay()); // domingo = 0
    let weekIndex = 0;
    while (occurrenceCount < cap) {
      const baseSunday = addDays(weekStart, weekIndex * 7 * interval);
      if (baseSunday > windowEnd) break;
      const sortedDays = days
        .map((d) => WEEKDAYS.indexOf(d))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      let added = false;
      for (const di of sortedDays) {
        const occ = new Date(baseSunday);
        occ.setDate(baseSunday.getDate() + di);
        // Mantener la hora del evento original
        occ.setHours(
          startsAt.getHours(),
          startsAt.getMinutes(),
          startsAt.getSeconds(),
          0,
        );
        if (occ < startsAt) continue;
        if (!pushIfInWindow(occ)) {
          return out;
        }
        added = true;
        if (occurrenceCount >= cap) break;
      }
      if (!added && weekIndex > 1000) break;
      weekIndex++;
    }
    return out;
  }

  if (rec.freq === "monthly") {
    while (occurrenceCount < cap) {
      if (!pushIfInWindow(cursor)) break;
      cursor = addMonths(cursor, interval);
      if (cursor > windowEnd) break;
    }
    return out;
  }

  if (rec.freq === "yearly") {
    while (occurrenceCount < cap) {
      if (!pushIfInWindow(cursor)) break;
      cursor = addYears(cursor, interval);
      if (cursor > windowEnd) break;
    }
    return out;
  }

  return out;
}

// Para enviar a Google Calendar (RRULE string)
export function toRRULE(rec: Recurrence): string {
  const parts: string[] = [`FREQ=${rec.freq.toUpperCase()}`];
  if (rec.interval && rec.interval > 1) parts.push(`INTERVAL=${rec.interval}`);
  if (rec.byweekday && rec.byweekday.length > 0)
    parts.push(`BYDAY=${rec.byweekday.join(",")}`);
  if (rec.count) parts.push(`COUNT=${rec.count}`);
  if (rec.until) {
    const d = rec.until.replace(/-/g, "");
    parts.push(`UNTIL=${d}T235959Z`);
  }
  return `RRULE:${parts.join(";")}`;
}

// Para enviar a Microsoft Graph (recurrence object)
export function toGraphRecurrence(rec: Recurrence, startISODate: string) {
  const pattern: Record<string, unknown> = {
    interval: rec.interval || 1,
  };
  if (rec.freq === "daily") pattern.type = "daily";
  if (rec.freq === "weekly") {
    pattern.type = "weekly";
    pattern.daysOfWeek = (rec.byweekday ?? []).map(weekdayLong);
    pattern.firstDayOfWeek = "monday";
  }
  if (rec.freq === "monthly") {
    pattern.type = "absoluteMonthly";
    pattern.dayOfMonth = parseInt(startISODate.slice(8, 10), 10);
  }
  if (rec.freq === "yearly") {
    pattern.type = "absoluteYearly";
    pattern.dayOfMonth = parseInt(startISODate.slice(8, 10), 10);
    pattern.month = parseInt(startISODate.slice(5, 7), 10);
  }

  const range: Record<string, unknown> = {
    type: rec.until ? "endDate" : rec.count ? "numbered" : "noEnd",
    startDate: startISODate.slice(0, 10),
  };
  if (rec.until) range.endDate = rec.until;
  if (rec.count && !rec.until) range.numberOfOccurrences = rec.count;

  return { pattern, range };
}

function weekdayLong(short: string): string {
  switch (short) {
    case "MO":
      return "monday";
    case "TU":
      return "tuesday";
    case "WE":
      return "wednesday";
    case "TH":
      return "thursday";
    case "FR":
      return "friday";
    case "SA":
      return "saturday";
    case "SU":
    default:
      return "sunday";
  }
}
