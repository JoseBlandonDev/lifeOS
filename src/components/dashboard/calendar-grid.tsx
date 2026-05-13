"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Repeat } from "lucide-react";
import type { CalendarEvent, DayNote } from "@/lib/data/calendar";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AddEventForm } from "./add-event-form";
import { DayNoteForm } from "./day-note-form";
import { LocalEventActions } from "./local-event-actions";

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

type Connection = { provider: "google" | "microsoft"; account_email: string | null };

export function CalendarGrid({
  events,
  notes,
  connections,
}: {
  events: CalendarEvent[];
  notes: DayNote[];
  connections: Connection[];
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  const grid = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(new Date(ev.starts_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const notesByDay = useMemo(() => {
    const map = new Map<string, DayNote>();
    for (const n of notes) map.set(n.date, n);
    return map;
  }, [notes]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayEvents = eventsByDay.get(selectedKey) ?? [];
  const dayNote = notesByDay.get(selectedKey);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, -1))}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-base font-semibold capitalize text-zinc-100">
            {format(cursor, "MMMM yyyy")}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCursor(new Date());
                setSelected(new Date());
              }}
              className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setCursor((d) => addMonths(d, 1))}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-zinc-500">
          {WEEK_DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvs = eventsByDay.get(key) ?? [];
            const hasNote = notesByDay.has(key);
            const inMonth = isSameMonth(day, cursor);
            const isSelected = isSameDay(day, selected);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "relative flex h-20 flex-col items-start gap-1 rounded-lg p-1.5 text-left text-xs transition",
                  inMonth ? "text-zinc-300" : "text-zinc-600",
                  isToday(day) && "ring-1 ring-violet-400/40",
                  isSelected
                    ? "bg-violet-500/20 text-violet-100"
                    : "hover:bg-white/5",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="tabular-nums">{format(day, "d")}</span>
                  {hasNote && (
                    <span
                      title="Tiene nota"
                      className="h-1 w-1 rounded-full bg-amber-400"
                    />
                  )}
                </span>
                <span className="flex flex-wrap gap-0.5">
                  {dayEvs.slice(0, 6).map((ev) => (
                    <span
                      key={ev.id}
                      className="block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: ev.feed_color }}
                    />
                  ))}
                  {dayEvs.length > 6 && (
                    <span className="text-[8px] text-zinc-500">
                      +{dayEvs.length - 6}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {format(selected, "EEEE d 'de' MMMM")}
            </p>
            <span className="text-[10px] text-zinc-600">
              {dayEvents.length} evento(s)
            </span>
          </div>
          <p className="mb-3 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-500">
            Puedes editar/borrar eventos creados en la app y eventos cargados
            directamente desde Google conectado.
          </p>

          {dayEvents.length === 0 ? (
            <p className="rounded-lg bg-black/30 p-3 text-sm text-zinc-500">
              Sin eventos este día.
            </p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((ev) => {
                const isLocalRow = ev.source === "local";
                // ID compuesto: en local viene como `<uuid>::<timestamp>`
                const baseId = isLocalRow
                  ? String(ev.id).split("::")[0]
                  : ev.source === "google"
                    ? String(ev.id).replace(/^google::/, "")
                    : ev.id;
                return (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-white/10 bg-black/40 p-3 text-sm"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ev.feed_color }}
                      />
                      <span className="text-[10px] uppercase text-zinc-500">
                        {ev.feed_label}
                        {ev.is_recurring && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-violet-400">
                            <Repeat className="h-2.5 w-2.5" /> recurrente
                          </span>
                        )}
                        {ev.remote_provider && (
                          <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase text-emerald-300">
                            {ev.remote_provider === "google"
                              ? "→ Google"
                              : "→ Outlook"}
                          </span>
                        )}
                      </span>
                      {(isLocalRow || ev.source === "google") && (
                        <LocalEventActions
                          id={baseId}
                          source={ev.source === "google" ? "google" : "local"}
                          remoteCalendarId={ev.remote_calendar_id ?? null}
                          title={ev.title ?? ""}
                          description={ev.description}
                          location={ev.location}
                          startsAt={ev.starts_at}
                          endsAt={ev.ends_at}
                          allDay={ev.all_day}
                        />
                      )}
                    </div>
                    <p className="font-medium text-zinc-100">
                      {ev.title || "(Sin título)"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {ev.all_day
                        ? "Todo el día"
                        : `${formatTime(ev.starts_at)}${ev.ends_at ? ` – ${formatTime(ev.ends_at)}` : ""}`}
                    </p>
                    {ev.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-zinc-500">
                        {ev.description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DayNoteForm date={selectedKey} initialBody={dayNote?.body ?? ""} />

        <AddEventForm
          defaultDate={selectedKey}
          connections={connections}
        />
      </div>
    </div>
  );
}
