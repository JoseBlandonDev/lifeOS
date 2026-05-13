import { Calendar, Target, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddGoalForm } from "@/components/finance/add-goal-form";
import { GoalContributionForm } from "@/components/finance/goal-contribution-form";
import { DeleteForm } from "@/components/dashboard/delete-button";
import { deleteGoal, deleteGoalContribution } from "@/app/actions/finance";
import { getFinanceSnapshot } from "@/lib/data/finance";
import { formatCOP, formatDateLong } from "@/lib/format";

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export default async function MetasPage() {
  const snap = await getFinanceSnapshot();
  if (!snap) return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const accounts = snap.accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, name: a.name }));

  const active = snap.goals.filter((g) => !g.archived);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <Target className="h-3.5 w-3.5" /> Metas
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Objetivos económicos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Define cuánto necesitas, fija fecha y abona poco a poco. Cada abono
            suma al progreso de la meta.
          </p>
        </div>
        <AddGoalForm />
      </header>

      {active.length === 0 ? (
        <GlassCard>
          <p className="rounded-lg bg-black/30 p-6 text-center text-sm text-zinc-500">
            Aún no tienes metas. Crea la primera y empieza a abonarle.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {active.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.current_amount / g.target_amount) * 100),
            );
            const left = daysLeft(g.deadline);
            return (
              <GlassCard key={g.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span className="tabular-nums">
                        {formatCOP(g.current_amount)} de{" "}
                        {formatCOP(g.target_amount)}
                      </span>
                      {g.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDateLong(g.deadline)}
                          {left != null && (
                            <span
                              className={
                                left < 0
                                  ? "text-rose-400"
                                  : left < 30
                                    ? "text-amber-400"
                                    : "text-zinc-500"
                              }
                            >
                              ({left < 0 ? `vencida hace ${Math.abs(left)}d` : `${left}d restantes`})
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-200">
                      {pct}%
                    </span>
                    <DeleteForm action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                    </DeleteForm>
                  </div>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${g.color}, ${g.color}aa)`,
                    }}
                  />
                </div>

                <GoalContributionForm goalId={g.id} accounts={accounts} />

                {g.contributions.length > 0 && (
                  <details className="mt-3 rounded-lg bg-black/30 p-2 text-xs">
                    <summary className="cursor-pointer text-zinc-500">
                      {g.contributions.length} abono(s)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {g.contributions.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-md px-2 py-1 text-zinc-400"
                        >
                          <span>{formatDateLong(c.occurred_on)}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-emerald-300">
                              +{formatCOP(c.amount)}
                            </span>
                            <form action={deleteGoalContribution}>
                              <input type="hidden" name="id" value={c.id} />
                              <button
                                type="submit"
                                className="rounded p-0.5 text-zinc-500 hover:text-rose-300"
                                aria-label="Eliminar abono"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
