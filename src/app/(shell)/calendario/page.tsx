import { CalendarDays, Link2 } from "lucide-react";
import { getCalendarSnapshot } from "@/lib/data/calendar";
import { GlassCard } from "@/components/ui/glass-card";
import { CalendarGrid } from "@/components/dashboard/calendar-grid";
import { CalendarConnections } from "@/components/dashboard/calendar-connections";
import { SyncNowButton } from "@/components/dashboard/sync-now-button";
import { formatDateLong, formatTime } from "@/lib/format";

export default async function CalendarioPage() {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const rangeEnd = new Date(now.getFullYear() + 2, now.getMonth() + 1, 0);
  const snap = await getCalendarSnapshot({ rangeStart, rangeEnd });

  if (!snap) {
    return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;
  }

  const upcoming = snap.events
    .filter((e) => new Date(e.starts_at) >= new Date())
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
            Google Calendar + agenda local
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Conecta Google para cargar eventos existentes y gestionarlos desde
            aquí (crear, editar y borrar), además de tus notas privadas por fecha.
          </p>
        </div>
        {snap.connections.length > 0 && (
          <SyncNowButton />
        )}
      </header>

      <GlassCard>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <Link2 className="h-4 w-4 text-violet-400" />
          Crear eventos en tu calendario real
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Conecta Google o Outlook para que los eventos que crees desde la app
          se suban a tu calendario y recibas las notificaciones nativas (correo
          y móvil) que ese servicio ya te envía.
        </p>
        <CalendarConnections connections={snap.connections} />
      </GlassCard>

      <GlassCard>
        <h2 className="mb-4 text-base font-semibold tracking-tight">
          Vista mensual
        </h2>
        <CalendarGrid
          events={snap.events}
          notes={snap.notes}
          connections={snap.connections}
        />
      </GlassCard>

      {upcoming.length > 0 && (
        <GlassCard>
          <h2 className="mb-4 text-base font-semibold tracking-tight">
            Próximos eventos
          </h2>
          <ul className="space-y-2">
            {upcoming.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ev.feed_color }}
                  />
                  <span className="min-w-0">
                    <p className="truncate text-zinc-100">
                      {ev.title || "(Sin título)"}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {ev.feed_label}
                      {ev.remote_provider && (
                        <span className="ml-1 text-emerald-400">
                          · subido a {ev.remote_provider === "google" ? "Google" : "Outlook"}
                        </span>
                      )}
                    </p>
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-zinc-400">
                  <p>{formatDateLong(ev.starts_at)}</p>
                  <p className="text-[10px] text-zinc-500">
                    {ev.all_day ? "Todo el día" : formatTime(ev.starts_at)}
                  </p>
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
