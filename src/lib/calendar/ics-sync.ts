import ical from "node-ical";
import { createClient } from "@/lib/supabase/server";

type ParsedEvent = {
  external_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};

function isAllDay(start: Date, end?: Date) {
  if (!end) return false;
  const isMidnight =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    start.getUTCSeconds() === 0;
  const diff = end.getTime() - start.getTime();
  return isMidnight && diff % 86400000 === 0;
}

function sameMinute(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) < 60000;
}

export async function syncFeed(feedId: string): Promise<{
  ok: true;
  count: number;
} | {
  ok: false;
  error: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: feed, error: feedErr } = await supabase
    .from("calendar_feeds")
    .select("id, url")
    .eq("id", feedId)
    .eq("user_id", user.id)
    .single();

  if (feedErr || !feed) return { ok: false, error: "Calendario no encontrado" };

  let raw: Record<string, unknown>;
  try {
    // node-ical async fetcher
    raw = (await ical.async.fromURL(feed.url as string)) as Record<
      string,
      unknown
    >;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("calendar_feeds")
      .update({ last_error: msg.slice(0, 500), last_synced_at: new Date().toISOString() })
      .eq("id", feed.id);
    return { ok: false, error: `No se pudo descargar: ${msg.slice(0, 120)}` };
  }

  const now = new Date();
  const horizonPast = new Date(now.getTime() - 60 * 86400000);
  const horizonFuture = new Date(now.getTime() + 365 * 86400000);

  const events: ParsedEvent[] = [];

  for (const key in raw) {
    const ev = raw[key] as Record<string, unknown> | undefined;
    if (!ev || ev.type !== "VEVENT") continue;

    const start = ev.start as Date | undefined;
    const end = ev.end as Date | undefined;
    if (!start) continue;
    const uid = String(ev.uid ?? key);
    const durationMs = end ? Math.max(0, end.getTime() - start.getTime()) : 0;
    const title = typeof ev.summary === "string" ? ev.summary : null;
    const description =
      typeof ev.description === "string" ? ev.description.slice(0, 1000) : null;
    const location = typeof ev.location === "string" ? ev.location : null;
    const allDay = isAllDay(start, end);

    const rrule = (ev as { rrule?: { between: (a: Date, b: Date, c: boolean) => Date[] } })
      .rrule;
    const exdates = Object.values(
      ((ev as { exdate?: Record<string, Date> }).exdate ?? {}),
    ).filter((v): v is Date => v instanceof Date);

    if (rrule) {
      // Expande ocurrencias dentro de ventana, incluyendo series iniciadas en el pasado.
      const occurrences = rrule.between(horizonPast, horizonFuture, true);
      for (const occ of occurrences) {
        if (exdates.some((ex) => sameMinute(ex, occ))) continue;
        const occEnd = durationMs > 0 ? new Date(occ.getTime() + durationMs) : null;
        events.push({
          external_id: `${uid}__${occ.toISOString()}`,
          title,
          description,
          location,
          starts_at: occ.toISOString(),
          ends_at: occEnd ? occEnd.toISOString() : null,
          all_day: allDay,
        });
      }
      continue;
    }

    if (start < horizonPast || start > horizonFuture) continue;
    events.push({
      external_id: uid,
      title,
      description,
      location,
      starts_at: new Date(start).toISOString(),
      ends_at: end ? new Date(end).toISOString() : null,
      all_day: allDay,
    });
  }

  // Borrar eventos previos del feed y reinsertar (sync simple y robusto)
  const { error: delErr } = await supabase
    .from("calendar_events")
    .delete()
    .eq("feed_id", feed.id)
    .eq("user_id", user.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (events.length > 0) {
    const rows = events.map((e) => ({
      ...e,
      feed_id: feed.id,
      user_id: user.id,
    }));
    const { error: insErr } = await supabase
      .from("calendar_events")
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  await supabase
    .from("calendar_feeds")
    .update({
      last_synced_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", feed.id);

  return { ok: true, count: events.length };
}
