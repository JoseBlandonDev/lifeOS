"use client";

import { useState, useTransition } from "react";
import { Calendar, Clock, MapPin, Plus, Repeat } from "lucide-react";
import { addEvent } from "@/app/actions/calendar";
import { cn } from "@/lib/utils";

type Connection = { provider: "google" | "microsoft"; account_email: string | null };
type Target = "local" | "google" | "microsoft";
type Freq = "" | "daily" | "weekly" | "monthly" | "yearly";

const WEEKDAYS = [
  { code: "MO", label: "L" },
  { code: "TU", label: "M" },
  { code: "WE", label: "X" },
  { code: "TH", label: "J" },
  { code: "FR", label: "V" },
  { code: "SA", label: "S" },
  { code: "SU", label: "D" },
];

const REMINDERS = [
  { value: "", label: "Sin recordatorio" },
  { value: "0", label: "Al inicio" },
  { value: "10", label: "10 min antes" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 día antes" },
];

export function AddEventForm({
  defaultDate,
  connections,
  onSuccess,
}: {
  defaultDate: string;
  connections: Connection[];
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("local");
  const [allDay, setAllDay] = useState(false);
  const [freq, setFreq] = useState<Freq>("");
  const [byweekday, setByweekday] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hasGoogle = connections.some((c) => c.provider === "google");
  const hasMicrosoft = connections.some((c) => c.provider === "microsoft");

  function toggleDay(code: string) {
    setByweekday((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set("target", target);
    formData.set("all_day", String(allDay));
    formData.set("recurrence_freq", freq);
    if (freq === "weekly") {
      // limpiar y volver a poner
      formData.delete("recurrence_byweekday");
      for (const d of byweekday) formData.append("recurrence_byweekday", d);
    }
    start(async () => {
      const res = await addEvent(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      setError(null);
      setFreq("");
      setByweekday([]);
      onSuccess?.();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
      >
        <Plus className="h-4 w-4" /> Añadir evento
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <input
        name="title"
        required
        autoFocus
        placeholder="Título del evento"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />

      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto_1fr_auto]">
        <span className="flex items-center gap-1 px-1 text-xs text-zinc-500">
          <Calendar className="h-3.5 w-3.5" /> Día
        </span>
        <input
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        />
        <span className="flex items-center gap-1 px-1 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" /> Hora
        </span>
        <div className="flex gap-1">
          <input
            name="start_time"
            type="time"
            disabled={allDay}
            defaultValue="09:00"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-zinc-200 disabled:opacity-40"
          />
          <input
            name="end_time"
            type="time"
            disabled={allDay}
            defaultValue="10:00"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-zinc-200 disabled:opacity-40"
          />
        </div>
        <label className="flex items-center gap-2 px-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-black/40"
          />
          Todo el día
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            name="location"
            placeholder="Ubicación"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <select
          name="reminder_minutes"
          defaultValue=""
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
        >
          {REMINDERS.map((r) => (
            <option key={r.value} value={r.value} className="bg-zinc-900">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="description"
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />

      {/* Recurrencia */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Repeat className="h-3.5 w-3.5" /> Repetición
          </span>
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value as Freq)}
            className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs"
          >
            <option value="" className="bg-zinc-900">
              No se repite
            </option>
            <option value="daily" className="bg-zinc-900">
              Cada día
            </option>
            <option value="weekly" className="bg-zinc-900">
              Cada semana
            </option>
            <option value="monthly" className="bg-zinc-900">
              Cada mes
            </option>
            <option value="yearly" className="bg-zinc-900">
              Cada año
            </option>
          </select>
        </div>

        {freq && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Cada</span>
              <input
                type="number"
                name="recurrence_interval"
                min="1"
                defaultValue={1}
                className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-zinc-200"
              />
              <span className="text-zinc-500">
                {freq === "daily"
                  ? "día(s)"
                  : freq === "weekly"
                    ? "semana(s)"
                    : freq === "monthly"
                      ? "mes(es)"
                      : "año(s)"}
              </span>
            </div>

            {freq === "weekly" && (
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => toggleDay(d.code)}
                    className={cn(
                      "h-7 w-7 rounded-full text-xs font-medium transition",
                      byweekday.includes(d.code)
                        ? "bg-violet-500/30 text-violet-100"
                        : "bg-white/5 text-zinc-500 hover:text-zinc-200",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1 text-zinc-500">
                hasta
                <input
                  type="date"
                  name="recurrence_until"
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-zinc-200"
                />
              </label>
              <label className="flex items-center gap-1 text-zinc-500">
                o
                <input
                  type="number"
                  name="recurrence_count"
                  min="1"
                  placeholder="N"
                  className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-zinc-200"
                />
                veces
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Destino */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
        <p className="mb-2 text-xs text-zinc-400">Guardar en</p>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/40 p-1 text-xs">
          {(["local", "google", "microsoft"] as const).map((t) => {
            const enabled =
              t === "local" ||
              (t === "google" && hasGoogle) ||
              (t === "microsoft" && hasMicrosoft);
            return (
              <button
                key={t}
                type="button"
                disabled={!enabled}
                onClick={() => setTarget(t)}
                className={cn(
                  "rounded px-2 py-1.5 font-medium transition",
                  target === t
                    ? "bg-violet-500/30 text-violet-100"
                    : "text-zinc-500 hover:text-zinc-300",
                  !enabled && "opacity-40 cursor-not-allowed",
                )}
              >
                {t === "local"
                  ? "Solo en la app"
                  : t === "google"
                    ? "Google Calendar"
                    : "Outlook"}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          {target === "local"
            ? "El evento se guarda solo aquí. Visible en la app, no se sincroniza con Google/Outlook."
            : `Se subirá a tu calendario principal de ${target === "google" ? "Google" : "Outlook"} y recibirás sus notificaciones nativas (correo / móvil).`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Crear evento"}
        </button>
      </div>
    </form>
  );
}
