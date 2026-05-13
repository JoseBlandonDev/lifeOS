import { getValidAccessToken } from "./tokens";
import {
  toGraphRecurrence,
  toRRULE,
  type Recurrence,
} from "./recurrence";

export type CreateEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string; // ISO
  ends_at?: string | null;
  all_day?: boolean;
  reminder_minutes?: number | null;
  recurrence?: Recurrence | null;
};

export type CreateEventResult = {
  id: string;
  htmlLink?: string;
};

export type RemoteProvider = "google" | "microsoft";

const TZ = "America/Bogota";

function isoDate(iso: string) {
  return iso.slice(0, 10);
}

function stripOffset(iso: string) {
  return iso.replace(/([+-]\d{2}:\d{2}|Z)$/, "");
}

function toBogotaLocalDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function ensureRange(
  startIso: string,
  endIso?: string | null,
  defaultMinutes = 60,
) {
  const start = new Date(startIso);
  let end = new Date(endIso ?? startIso);
  if (!Number.isFinite(start.getTime())) {
    throw new Error("Fecha/hora de inicio inválida.");
  }
  if (!Number.isFinite(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + defaultMinutes * 60_000);
  }
  return { start, end };
}

export async function createGoogleEvent(
  input: CreateEventInput,
): Promise<CreateEventResult> {
  const token = await getValidAccessToken("google");
  if (!token)
    throw new Error("Conecta tu cuenta de Google para crear eventos allí.");

  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
  };

  if (input.all_day) {
    body.start = { date: isoDate(input.starts_at) };
    body.end = {
      date: isoDate(input.ends_at ?? input.starts_at),
    };
  } else {
    const { start, end } = ensureRange(input.starts_at, input.ends_at);
    const startLocal = toBogotaLocalDateTime(start);
    const endLocal = toBogotaLocalDateTime(end);
    body.end = {
      // Evitamos enviar offset + timeZone al mismo tiempo para prevenir
      // interpretaciones ambiguas en Google.
      dateTime: endLocal,
      timeZone: TZ,
    };
    body.start = {
      dateTime: startLocal,
      timeZone: TZ,
    };
  }

  if (input.recurrence) {
    body.recurrence = [toRRULE(input.recurrence)];
  }

  if (input.reminder_minutes != null && input.reminder_minutes >= 0) {
    body.reminders = {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: input.reminder_minutes },
        { method: "email", minutes: input.reminder_minutes },
      ],
    };
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id: string;
    htmlLink?: string;
  };
  return { id: data.id, htmlLink: data.htmlLink };
}

export type GoogleListedEvent = {
  id: string;
  calendar_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurring: boolean;
};

async function listGoogleCalendars(token: string): Promise<string[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return ["primary"];
  const data = (await res.json()) as {
    items?: Array<{ id?: string; selected?: boolean }>;
  };
  const ids = (data.items ?? [])
    .filter((c) => c.id)
    .map((c) => c.id as string);
  return ids.length > 0 ? ids : ["primary"];
}

export async function listGoogleEvents(
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GoogleListedEvent[]> {
  const token = await getValidAccessToken("google");
  if (!token) return [];

  const out: GoogleListedEvent[] = [];
  const calendarIds = await listGoogleCalendars(token);

  for (const calendarId of calendarIds) {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", timeMinIso);
    url.searchParams.set("timeMax", timeMaxIso);
    url.searchParams.set("maxResults", "2500");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;

    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        status?: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { date?: string; dateTime?: string };
        end?: { date?: string; dateTime?: string };
        recurrence?: string[];
        recurringEventId?: string;
      }>;
    };

    for (const it of data.items ?? []) {
      if (!it.id || it.status === "cancelled") continue;
      const isAllDay = Boolean(it.start?.date && !it.start?.dateTime);
      const startRaw = it.start?.dateTime ?? it.start?.date;
      const endRaw = it.end?.dateTime ?? it.end?.date ?? null;
      if (!startRaw) continue;
      out.push({
        id: it.id,
        calendar_id: calendarId,
        title: it.summary ?? null,
        description: it.description ?? null,
        location: it.location ?? null,
        starts_at: isAllDay ? `${startRaw}T00:00:00-05:00` : startRaw,
        ends_at:
          endRaw != null
            ? isAllDay
              ? `${endRaw}T00:00:00-05:00`
              : endRaw
            : null,
        all_day: isAllDay,
        recurring: Boolean(it.recurrence?.length || it.recurringEventId),
      });
    }
  }
  return out;
}

export async function updateGoogleEvent(
  eventId: string,
  input: CreateEventInput,
  calendarId = "primary",
): Promise<void> {
  const token = await getValidAccessToken("google");
  if (!token)
    throw new Error("Conecta tu cuenta de Google para editar eventos allí.");

  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
  };

  if (input.all_day) {
    body.start = { date: isoDate(input.starts_at) };
    body.end = { date: isoDate(input.ends_at ?? input.starts_at) };
  } else {
    const { start, end } = ensureRange(input.starts_at, input.ends_at);
    body.start = { dateTime: toBogotaLocalDateTime(start), timeZone: TZ };
    body.end = { dateTime: toBogotaLocalDateTime(end), timeZone: TZ };
  }

  if (input.recurrence) {
    body.recurrence = [toRRULE(input.recurrence)];
  }

  if (input.reminder_minutes != null && input.reminder_minutes >= 0) {
    body.reminders = {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: input.reminder_minutes },
        { method: "email", minutes: input.reminder_minutes },
      ],
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google: ${err.slice(0, 200)}`);
  }
}

export async function deleteGoogleEvent(
  eventId: string,
  calendarId = "primary",
): Promise<void> {
  const token = await getValidAccessToken("google");
  if (!token)
    throw new Error("Conecta tu cuenta de Google para borrar eventos allí.");

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  // 410/404: evento ya no existe, lo tomamos como borrado
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Google: ${err.slice(0, 200)}`);
  }
}

export async function createMicrosoftEvent(
  input: CreateEventInput,
): Promise<CreateEventResult> {
  const token = await getValidAccessToken("microsoft");
  if (!token)
    throw new Error("Conecta tu cuenta de Microsoft para crear eventos allí.");

  const body: Record<string, unknown> = {
    subject: input.title,
    body: {
      contentType: "text",
      content: input.description ?? "",
    },
    location: input.location
      ? { displayName: input.location }
      : undefined,
    isAllDay: !!input.all_day,
  };

  if (input.all_day) {
    body.start = {
      dateTime: `${isoDate(input.starts_at)}T00:00:00`,
      timeZone: TZ,
    };
    body.end = {
      dateTime: `${isoDate(input.ends_at ?? input.starts_at)}T00:00:00`,
      timeZone: TZ,
    };
  } else {
    const { start, end } = ensureRange(input.starts_at, input.ends_at);
    const startLocal = toBogotaLocalDateTime(start);
    const endLocal = toBogotaLocalDateTime(end);
    body.start = {
      dateTime: startLocal,
      timeZone: TZ,
    };
    body.end = {
      dateTime: endLocal,
      timeZone: TZ,
    };
  }

  if (input.recurrence) {
    body.recurrence = toGraphRecurrence(input.recurrence, input.starts_at);
  }

  if (input.reminder_minutes != null && input.reminder_minutes >= 0) {
    body.reminderMinutesBeforeStart = input.reminder_minutes;
    body.isReminderOn = true;
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id: string;
    webLink?: string;
  };
  return { id: data.id, htmlLink: data.webLink };
}

export async function updateMicrosoftEvent(
  eventId: string,
  input: CreateEventInput,
): Promise<void> {
  const token = await getValidAccessToken("microsoft");
  if (!token)
    throw new Error("Conecta tu cuenta de Microsoft para editar eventos allí.");

  const body: Record<string, unknown> = {
    subject: input.title,
    body: {
      contentType: "text",
      content: input.description ?? "",
    },
    location: input.location ? { displayName: input.location } : undefined,
    isAllDay: !!input.all_day,
  };

  if (input.all_day) {
    body.start = {
      dateTime: `${isoDate(input.starts_at)}T00:00:00`,
      timeZone: TZ,
    };
    body.end = {
      dateTime: `${isoDate(input.ends_at ?? input.starts_at)}T00:00:00`,
      timeZone: TZ,
    };
  } else {
    const { start, end } = ensureRange(input.starts_at, input.ends_at);
    body.start = { dateTime: toBogotaLocalDateTime(start), timeZone: TZ };
    body.end = { dateTime: toBogotaLocalDateTime(end), timeZone: TZ };
  }

  if (input.recurrence) {
    body.recurrence = toGraphRecurrence(input.recurrence, input.starts_at);
  }

  if (input.reminder_minutes != null && input.reminder_minutes >= 0) {
    body.reminderMinutesBeforeStart = input.reminder_minutes;
    body.isReminderOn = true;
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft: ${err.slice(0, 200)}`);
  }
}

export async function deleteMicrosoftEvent(eventId: string): Promise<void> {
  const token = await getValidAccessToken("microsoft");
  if (!token)
    throw new Error("Conecta tu cuenta de Microsoft para borrar eventos allí.");
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Microsoft: ${err.slice(0, 200)}`);
  }
}
