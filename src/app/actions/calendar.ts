"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncFeed } from "@/lib/calendar/ics-sync";
import {
  createGoogleEvent,
  createMicrosoftEvent,
  updateGoogleEvent,
  updateMicrosoftEvent,
  deleteGoogleEvent,
  deleteMicrosoftEvent,
  type CreateEventInput,
} from "@/lib/calendar/providers";
import { deleteToken } from "@/lib/calendar/tokens";
import type { Recurrence } from "@/lib/calendar/recurrence";

const PALETTE = [
  "#8b5cf6",
  "#22d3ee",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
];

function reval() {
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// ============= ICS Feeds (read-only) =============
export async function addCalendarFeed(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!label) return { ok: false as const, message: "Falta el nombre." };
  if (!url || !/^(https?|webcal):\/\//i.test(url))
    return { ok: false as const, message: "URL inválida." };

  const { supabase, user } = await authed();

  const { count } = await supabase
    .from("calendar_feeds")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const color = PALETTE[(count ?? 0) % PALETTE.length];
  const normalized = url.replace(/^webcal:\/\//i, "https://");

  const { data, error } = await supabase
    .from("calendar_feeds")
    .insert({ user_id: user.id, label, url: normalized, color })
    .select("id")
    .single();

  if (error || !data)
    return { ok: false as const, message: error?.message ?? "Error al guardar." };

  const sync = await syncFeed(data.id as string);
  reval();
  if (!sync.ok)
    return {
      ok: false as const,
      message: `Guardado, pero falló la sincronización: ${sync.error}`,
    };
  return { ok: true as const, count: sync.count };
}

export async function deleteCalendarFeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("calendar_feeds")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  reval();
}

export async function syncCalendarFeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await syncFeed(id);
  reval();
}

export async function syncAllCalendarFeeds() {
  const { supabase, user } = await authed();
  const { data: feeds } = await supabase
    .from("calendar_feeds")
    .select("id")
    .eq("user_id", user.id)
    .eq("enabled", true);
  for (const f of feeds ?? []) await syncFeed(f.id as string);
  reval();
}

// ============= Notas por día =============
export async function saveDayNote(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false as const, message: "Fecha inválida." };

  const { supabase, user } = await authed();

  if (!body) {
    await supabase
      .from("calendar_day_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date);
    reval();
    return { ok: true as const };
  }

  await supabase.from("calendar_day_notes").upsert(
    {
      user_id: user.id,
      date,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  reval();
  return { ok: true as const };
}

// ============= Eventos (locales y remotos) =============

const BOGOTA_OFFSET = "-05:00";

function toBogotaIso(date: string, time: string) {
  return `${date}T${time}:00${BOGOTA_OFFSET}`;
}

function nextDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function addEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = (String(formData.get("description") ?? "").trim() || null) as
    | string
    | null;
  const location = (String(formData.get("location") ?? "").trim() || null) as
    | string
    | null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const allDay = String(formData.get("all_day") ?? "false") === "true";
  const reminderRaw = String(formData.get("reminder_minutes") ?? "").trim();
  const reminderMinutes =
    reminderRaw === "" ? null : Number.isFinite(Number(reminderRaw)) ? Number(reminderRaw) : null;
  const color = String(formData.get("color") ?? "#a78bfa");
  const target = String(formData.get("target") ?? "local"); // local | google | microsoft

  // Recurrencia
  const freqRaw = String(formData.get("recurrence_freq") ?? "");
  const freq = ["daily", "weekly", "monthly", "yearly"].includes(freqRaw)
    ? (freqRaw as Recurrence["freq"])
    : null;
  const interval = Math.max(1, Number(formData.get("recurrence_interval") ?? 1));
  const byweekday = formData.getAll("recurrence_byweekday").map(String);
  const count = formData.get("recurrence_count")
    ? Number(formData.get("recurrence_count"))
    : null;
  const until = String(formData.get("recurrence_until") ?? "").trim() || null;

  const recurrence: Recurrence | null = freq
    ? {
        freq,
        interval,
        byweekday: freq === "weekly" && byweekday.length > 0 ? byweekday : undefined,
        count: count && count > 0 ? count : null,
        until,
      }
    : null;

  if (!title) return { ok: false as const, message: "Falta el título." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false as const, message: "Fecha inválida." };

  const validStartTime =
    startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : "09:00";
  const validEndTime =
    endTime && /^\d{2}:\d{2}$/.test(endTime)
      ? endTime
      : addMinutes(validStartTime, 60);

  // Guardamos siempre en zona horaria de Colombia para evitar corrimientos.
  const startsAt = allDay
    ? toBogotaIso(date, "00:00")
    : toBogotaIso(date, validStartTime);
  // Para all-day, el end debe ser exclusivo (día siguiente) para APIs de calendar.
  const endsAt = allDay
    ? toBogotaIso(nextDate(date), "00:00")
    : toBogotaIso(date, validEndTime);

  // Push a remote provider si aplica
  let remoteId: string | null = null;
  let remoteProvider: "google" | "microsoft" | null = null;

  if (target === "google" || target === "microsoft") {
    const input: CreateEventInput = {
      title,
      description,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      reminder_minutes: reminderMinutes,
      recurrence,
    };
    try {
      const res =
        target === "google"
          ? await createGoogleEvent(input)
          : await createMicrosoftEvent(input);
      remoteId = res.id;
      remoteProvider = target as "google" | "microsoft";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        message:
          target === "google" || target === "microsoft"
            ? `No se pudo crear en ${target === "google" ? "Google" : "Outlook"}: ${msg}. Si persiste, desconecta y vuelve a conectar tu cuenta.`
            : msg,
      };
    }
  }

  // Guardamos siempre en local_events para tener vista unificada
  const { supabase, user } = await authed();
  const { error } = await supabase.from("local_events").insert({
    user_id: user.id,
    title,
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: allDay,
    color,
    reminder_minutes: reminderMinutes,
    recurrence_freq: freq,
    recurrence_interval: interval,
    recurrence_byweekday:
      freq === "weekly" && byweekday.length > 0 ? byweekday : null,
    recurrence_count: count && count > 0 ? count : null,
    recurrence_until: until,
    remote_provider: remoteProvider,
    remote_event_id: remoteId,
    remote_calendar_id: remoteProvider ? "primary" : null,
  });

  if (error) return { ok: false as const, message: error.message };
  reval();
  return { ok: true as const };
}

export async function deleteLocalEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();

  const { data: ev } = await supabase
    .from("local_events")
    .select(
      "id, remote_provider, remote_event_id",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ev?.remote_provider && ev?.remote_event_id) {
    try {
      if (ev.remote_provider === "google") {
        await deleteGoogleEvent(ev.remote_event_id);
      } else {
        await deleteMicrosoftEvent(ev.remote_event_id);
      }
    } catch {
      // si falla remote delete, aún permitimos borrar local para no bloquear al usuario
    }
  }

  await supabase
    .from("local_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  reval();
}

export async function updateLocalEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const allDay = String(formData.get("all_day") ?? "false") === "true";
  const reminderMinutes = formData.get("reminder_minutes")
    ? Number(formData.get("reminder_minutes"))
    : null;

  if (!id) return { ok: false as const, message: "Evento inválido." };
  if (!title) return { ok: false as const, message: "Falta el título." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false as const, message: "Fecha inválida." };

  const { supabase, user } = await authed();
  const { data: current } = await supabase
    .from("local_events")
    .select(
      "id, remote_provider, remote_event_id, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_count, recurrence_until",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { ok: false as const, message: "Evento no encontrado." };

  const validStartTime =
    startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : "09:00";
  const validEndTime =
    endTime && /^\d{2}:\d{2}$/.test(endTime)
      ? endTime
      : addMinutes(validStartTime, 60);

  const startsAt = allDay
    ? toBogotaIso(date, "00:00")
    : toBogotaIso(date, validStartTime);
  const endsAt = allDay
    ? toBogotaIso(nextDate(date), "00:00")
    : toBogotaIso(date, validEndTime);

  const recurrence: Recurrence | null = current.recurrence_freq
    ? {
        freq: current.recurrence_freq as Recurrence["freq"],
        interval: Number(current.recurrence_interval ?? 1),
        byweekday: (current.recurrence_byweekday as string[] | null) ?? undefined,
        count: current.recurrence_count != null ? Number(current.recurrence_count) : null,
        until: (current.recurrence_until as string | null) ?? null,
      }
    : null;

  if (current.remote_provider && current.remote_event_id) {
    const input: CreateEventInput = {
      title,
      description,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      reminder_minutes: reminderMinutes,
      recurrence,
    };
    try {
      if (current.remote_provider === "google") {
        await updateGoogleEvent(current.remote_event_id, input);
      } else {
        await updateMicrosoftEvent(current.remote_event_id, input);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, message: msg };
    }
  }

  const { error } = await supabase
    .from("local_events")
    .update({
      title,
      description,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      reminder_minutes: reminderMinutes,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, message: error.message };

  reval();
  return { ok: true as const };
}

export async function updateGoogleOnlyEvent(formData: FormData) {
  const remoteId = String(formData.get("remote_event_id") ?? "");
  const remoteCalendarId =
    String(formData.get("remote_calendar_id") ?? "").trim() || "primary";
  const title = String(formData.get("title") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const allDay = String(formData.get("all_day") ?? "false") === "true";
  const reminderMinutes = formData.get("reminder_minutes")
    ? Number(formData.get("reminder_minutes"))
    : null;

  if (!remoteId) return { ok: false as const, message: "Evento inválido." };
  if (!title) return { ok: false as const, message: "Falta el título." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false as const, message: "Fecha inválida." };

  const validStartTime =
    startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : "09:00";
  const validEndTime =
    endTime && /^\d{2}:\d{2}$/.test(endTime)
      ? endTime
      : addMinutes(validStartTime, 60);

  const startsAt = allDay
    ? toBogotaIso(date, "00:00")
    : toBogotaIso(date, validStartTime);
  const endsAt = allDay
    ? toBogotaIso(nextDate(date), "00:00")
    : toBogotaIso(date, validEndTime);

  const input: CreateEventInput = {
    title,
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: allDay,
    reminder_minutes: reminderMinutes,
  };

  try {
    await updateGoogleEvent(remoteId, input, remoteCalendarId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, message: msg };
  }
  reval();
  return { ok: true as const };
}

export async function deleteGoogleOnlyEvent(formData: FormData) {
  const remoteId = String(formData.get("remote_event_id") ?? "");
  const remoteCalendarId =
    String(formData.get("remote_calendar_id") ?? "").trim() || "primary";
  if (!remoteId) return;
  try {
    await deleteGoogleEvent(remoteId, remoteCalendarId);
  } catch {
    // noop
  }
  reval();
}

// ============= OAuth conexiones =============
export async function disconnectProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as
    | "google"
    | "microsoft";
  if (provider !== "google" && provider !== "microsoft") return;
  await deleteToken(provider);
  reval();
}

export async function syncNow() {
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}
