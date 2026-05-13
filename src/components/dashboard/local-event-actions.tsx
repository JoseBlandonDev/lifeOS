"use client";

import { useState, useTransition } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import {
  deleteGoogleOnlyEvent,
  deleteLocalEvent,
  updateGoogleOnlyEvent,
  updateLocalEvent,
} from "@/app/actions/calendar";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  source: "local" | "google";
  remoteCalendarId?: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
};

function timeFromIso(iso: string | null, fallback: string) {
  if (!iso) return fallback;
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m?.[1] ?? fallback;
}

export function LocalEventActions({
  id,
  source,
  remoteCalendarId,
  title,
  description,
  location,
  startsAt,
  endsAt,
  allDay,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [isAllDay, setIsAllDay] = useState(allDay);

  const dateDefault = startsAt.slice(0, 10);
  const startDefault = timeFromIso(startsAt, "09:00");
  const endDefault = timeFromIso(endsAt, "10:00");

  function onSubmit(formData: FormData) {
    setErr(null);
    if (source === "local") formData.set("id", id);
    else {
      formData.set("remote_event_id", id);
      if (remoteCalendarId) formData.set("remote_calendar_id", remoteCalendarId);
    }
    formData.set("all_day", String(isAllDay));
    start(async () => {
      const res =
        source === "local"
          ? await updateLocalEvent(formData)
          : await updateGoogleOnlyEvent(formData);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      {!editing && (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-0.5 text-zinc-500 hover:text-violet-300"
            aria-label="Editar evento"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <form action={source === "local" ? deleteLocalEvent : deleteGoogleOnlyEvent}>
            <input
              type="hidden"
              name={source === "local" ? "id" : "remote_event_id"}
              value={id}
            />
            {source === "google" && remoteCalendarId && (
              <input
                type="hidden"
                name="remote_calendar_id"
                value={remoteCalendarId}
              />
            )}
            <button
              type="submit"
              className="rounded p-0.5 text-zinc-500 hover:text-rose-300"
              aria-label="Eliminar evento"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </form>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={onSubmit}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-100">Editar evento</h3>
            {source === "google" && (
              <p className="text-[11px] text-zinc-500">
                Editando evento de Google Calendar.
              </p>
            )}
            <input
              name="title"
              required
              defaultValue={title}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
            />

            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                type="date"
                name="date"
                required
                defaultValue={dateDefault}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              />
              <input
                type="time"
                name="start_time"
                defaultValue={startDefault}
                disabled={isAllDay}
                className={cn(
                  "rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200",
                  isAllDay && "opacity-40",
                )}
              />
              <input
                type="time"
                name="end_time"
                defaultValue={endDefault}
                disabled={isAllDay}
                className={cn(
                  "rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200",
                  isAllDay && "opacity-40",
                )}
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                />
                Todo el día
              </label>
            </div>

            <input
              name="location"
              defaultValue={location ?? ""}
              placeholder="Ubicación"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
            />
            <textarea
              name="description"
              rows={2}
              defaultValue={description ?? ""}
              placeholder="Descripción"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
            />
            <select
              name="reminder_minutes"
              defaultValue=""
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="" className="bg-zinc-900">
                Sin recordatorio
              </option>
              <option value="0" className="bg-zinc-900">
                Al inicio
              </option>
              <option value="10" className="bg-zinc-900">
                10 min antes
              </option>
              <option value="30" className="bg-zinc-900">
                30 min antes
              </option>
              <option value="60" className="bg-zinc-900">
                1 hora antes
              </option>
            </select>

            {err && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {err}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {pending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

