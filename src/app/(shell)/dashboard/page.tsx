import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  ListTodo,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getFinanceSnapshot } from "@/lib/data/finance";
import { getAcademicSnapshot } from "@/lib/data/academic";
import { getCalendarSnapshot } from "@/lib/data/calendar";
import { formatCOP, formatDateLong, formatTime } from "@/lib/format";

export default async function DashboardPage() {
  const now = new Date();
  const [finance, academic, calendar] = await Promise.all([
    getFinanceSnapshot(),
    getAcademicSnapshot(),
    getCalendarSnapshot({
      rangeStart: now,
      rangeEnd: new Date(now.getTime() + 14 * 86400000),
    }),
  ]);

  const subjectsWithGrades =
    academic?.subjects.filter((s) => s.currentAverage != null) ?? [];
  const globalAvg =
    subjectsWithGrades.length > 0
      ? subjectsWithGrades.reduce(
          (acc, s) => acc + (s.currentAverage ?? 0),
          0,
        ) / subjectsWithGrades.length
      : null;

  const pendingTasks = academic?.tasks.filter((t) => !t.done) ?? [];
  const upcomingEvents = (calendar?.events ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
          <Sparkles className="h-3.5 w-3.5" />
          Panel personal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          Bienvenido de vuelta
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Un resumen de tus pesos, tu estudio y tu agenda. Todo en COP, privado
          y sincronizado.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/finanzas" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Wallet className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
            </div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Patrimonio neto
            </p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${(finance?.totals.netWorth ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
              {formatCOP(finance?.totals.netWorth ?? 0)}
            </p>
          </GlassCard>
        </Link>

        <Link href="/finanzas" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <TrendingUp className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
            </div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Ingresos · mes
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
              {formatCOP(finance?.totals.monthIncome ?? 0)}
            </p>
          </GlassCard>
        </Link>

        <Link href="/finanzas" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                <TrendingDown className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
            </div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Gastos · mes
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-rose-300">
              {formatCOP(finance?.totals.monthExpense ?? 0)}
            </p>
          </GlassCard>
        </Link>

        <Link href="/academico" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
                <GraduationCap className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
            </div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Promedio actual
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-violet-200">
              {globalAvg != null ? globalAvg.toFixed(2) : "—"}
            </p>
          </GlassCard>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link href="/calendario" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <CalendarDays className="h-4 w-4 text-violet-400" />
                Próximos eventos
              </h2>
              <span className="text-xs text-zinc-500">
                {(calendar?.events ?? []).length} en 14 días
              </span>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">
                No hay eventos próximos. Conecta tu calendario en{" "}
                <span className="text-violet-300">Calendario</span>.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.feed_color }}
                    />
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-zinc-100">
                        {ev.title || "(Sin título)"}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {formatDateLong(ev.starts_at)} ·{" "}
                        {ev.all_day ? "Todo el día" : formatTime(ev.starts_at)}
                      </p>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </Link>

        <Link href="/academico" className="group">
          <GlassCard className="h-full transition group-hover:border-violet-500/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <ListTodo className="h-4 w-4 text-violet-400" />
                Tareas pendientes
              </h2>
              <span className="text-xs text-zinc-500">
                {pendingTasks.length}
              </span>
            </div>
            {pendingTasks.length === 0 ? (
              <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">
                Sin tareas pendientes. Crea una en{" "}
                <span className="text-violet-300">Académico</span>.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingTasks.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-zinc-100">
                      {t.title}
                    </span>
                    {t.due_at && (
                      <span className="shrink-0 text-[11px] text-zinc-500">
                        {formatDateLong(t.due_at)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </Link>
      </section>

      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Atajos
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ShortcutCard
            href="/finanzas"
            icon={<Wallet className="h-5 w-5" />}
            title="Finanzas"
            description="Movimientos y bolsillos"
          />
          <ShortcutCard
            href="/academico"
            icon={<BookOpen className="h-5 w-5" />}
            title="Académico"
            description="Asignaturas y tareas"
          />
          <ShortcutCard
            href="/calendario"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Calendario"
            description="Google y Outlook"
          />
          <ShortcutCard
            href="/focus"
            icon={<Timer className="h-5 w-5" />}
            title="Focus"
            description="Pomodoro y notas"
          />
        </div>
      </section>
    </div>
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-violet-500/40 hover:bg-black/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
    </Link>
  );
}
