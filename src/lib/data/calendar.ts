import { createClient } from "@/lib/supabase/server";
import {
  expandRecurrence,
  type Recurrence,
} from "@/lib/calendar/recurrence";
import { listGoogleEvents } from "@/lib/calendar/providers";

export type CalendarFeed = {
  id: string;
  label: string;
  url: string;
  color: string;
  enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  event_count: number;
};

export type CalendarEvent = {
  id: string;
  source: "feed" | "local" | "google";
  feed_id: string | null;
  feed_label: string;
  feed_color: string;
  title: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_recurring?: boolean;
  remote_provider?: "google" | "microsoft" | null;
  remote_calendar_id?: string | null;
};

export type DayNote = {
  id: string;
  date: string; // YYYY-MM-DD
  body: string;
  updated_at: string;
};

export type OAuthConnection = {
  provider: "google" | "microsoft";
  account_email: string | null;
  expires_at: string | null;
};

export type CalendarSnapshot = {
  feeds: CalendarFeed[];
  events: CalendarEvent[];
  notes: DayNote[];
  connections: OAuthConnection[];
  rangeStart: string;
  rangeEnd: string;
};

export async function getCalendarSnapshot(opts?: {
  rangeStart?: Date;
  rangeEnd?: Date;
}): Promise<CalendarSnapshot | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const start = opts?.rangeStart ?? new Date(Date.now() - 7 * 86400000);
  const end = opts?.rangeEnd ?? new Date(Date.now() + 60 * 86400000);

  const [localRes, notesRes, tokensRes] =
    await Promise.all([
      supabase
        .from("local_events")
        .select(
          "id, title, description, location, starts_at, ends_at, all_day, color, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_count, recurrence_until, remote_provider, remote_event_id",
        )
        .eq("user_id", user.id)
        .order("starts_at"),
      supabase
        .from("calendar_day_notes")
        .select("id, date, body, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("calendar_oauth_tokens")
        .select("provider, account_email, expires_at")
        .eq("user_id", user.id),
    ]);

  const feeds: CalendarFeed[] = [];
  const events: CalendarEvent[] = [];

  // ---- Eventos locales con expansión de recurrencia
  const localRemoteGoogleIds = new Set<string>();
  for (const le of localRes.data ?? []) {
    if (le.remote_provider === "google" && le.remote_event_id) {
      localRemoteGoogleIds.add(String(le.remote_event_id));
    }
    const recurrence: Recurrence | null = le.recurrence_freq
      ? {
          freq: le.recurrence_freq as Recurrence["freq"],
          interval: Number(le.recurrence_interval ?? 1),
          byweekday: (le.recurrence_byweekday as string[] | null) ?? undefined,
          count: le.recurrence_count != null ? Number(le.recurrence_count) : null,
          until: (le.recurrence_until as string | null) ?? null,
        }
      : null;

    const startDate = new Date(le.starts_at as string);
    const endDate = le.ends_at ? new Date(le.ends_at as string) : null;
    const occ = expandRecurrence(startDate, endDate, recurrence, start, end);

    for (const o of occ) {
      events.push({
        id: `${le.id}::${o.start.toISOString()}`,
        source: "local",
        feed_id: null,
        feed_label: "Local",
        feed_color: (le.color as string) || "#a78bfa",
        title: (le.title as string | null) ?? null,
        description: (le.description as string | null) ?? null,
        location: (le.location as string | null) ?? null,
        starts_at: o.start.toISOString(),
        ends_at: o.end ? o.end.toISOString() : null,
        all_day: Boolean(le.all_day),
        is_recurring: Boolean(recurrence),
        remote_provider:
          (le.remote_provider as "google" | "microsoft" | null) ?? null,
      });
    }
  }

  // ---- Eventos de Google (lectura/escritura directa con token OAuth)
  const hasGoogle = (tokensRes.data ?? []).some((t) => t.provider === "google");
  if (hasGoogle) {
    const remoteGoogle = await listGoogleEvents(
      start.toISOString(),
      end.toISOString(),
    );
    for (const ev of remoteGoogle) {
      // Evita duplicar eventos que ya existen como local + remoto vinculado
      if (localRemoteGoogleIds.has(ev.id)) continue;
      events.push({
        id: `google::${ev.id}`,
        source: "google",
        feed_id: null,
        feed_label: "Google",
        feed_color: "#60a5fa",
        title: ev.title,
        description: ev.description,
        location: ev.location,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        all_day: ev.all_day,
        is_recurring: ev.recurring,
        remote_provider: "google",
        remote_calendar_id: ev.calendar_id,
      });
    }
  }

  events.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const notes: DayNote[] = (notesRes.data ?? []).map((n) => ({
    id: n.id as string,
    date: String(n.date),
    body: n.body as string,
    updated_at: n.updated_at as string,
  }));

  const connections: OAuthConnection[] = (tokensRes.data ?? []).map((t) => ({
    provider: t.provider as "google" | "microsoft",
    account_email: (t.account_email as string | null) ?? null,
    expires_at: (t.expires_at as string | null) ?? null,
  }));

  return {
    feeds,
    events,
    notes,
    connections,
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
  };
}

export async function getLocalEvents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("local_events")
    .select("*")
    .eq("user_id", user.id)
    .order("starts_at", { ascending: false });
  return data ?? [];
}
