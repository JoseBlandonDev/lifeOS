import {
  Eye,
  EyeOff,
  Minus,
  Percent,
  PiggyBank,
  Plus,
  Repeat,
  Wand2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddBudgetItemForm } from "@/components/finance/add-budget-item-form";
import { BudgetAllocationEditor } from "@/components/finance/budget-allocation-editor";
import { BudgetFundForm } from "@/components/finance/budget-fund-form";
import { DeleteForm } from "@/components/dashboard/delete-button";
import {
  deleteBudgetAllocation,
  deleteBudgetItem,
  toggleBudgetItem,
} from "@/app/actions/finance";
import { getFinanceSnapshot, type BudgetItem } from "@/lib/data/finance";
import { formatCOP } from "@/lib/format";

function projected(item: BudgetItem, baseIncome: number): number {
  if (!item.active) return 0;
  if (item.computation === "percentage") {
    return ((item.percentage ?? 0) * baseIncome) / 100;
  }
  return item.amount ?? 0;
}

export default async function PresupuestoPage() {
  const snap = await getFinanceSnapshot();
  if (!snap)
    return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const incomes = snap.budgetItems.filter((b) => b.kind === "income");
  const expenses = snap.budgetItems.filter((b) => b.kind === "expense");
  const accounts = snap.accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, name: a.name }));

  const projectedFixedVarIncome = incomes
    .filter((i) => i.active && i.computation !== "percentage")
    .reduce((acc, i) => acc + (i.amount ?? 0), 0);

  const baseIncome = projectedFixedVarIncome;

  const totalBudgetIncome = incomes.reduce(
    (acc, i) => acc + projected(i, baseIncome),
    0,
  );
  const totalBudgetExpense = expenses.reduce(
    (acc, e) => acc + projected(e, baseIncome),
    0,
  );
  const projectedSavings = totalBudgetIncome - totalBudgetExpense;

  const realIncome = snap.totals.monthIncome;
  const realExpense = snap.totals.monthExpense;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <PiggyBank className="h-3.5 w-3.5" /> Presupuesto
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Tu plan mensual
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Combina ingresos fijos y variables, gastos fijos y categorías
            porcentuales (10% diezmo, ahorro %, etc.). Los ítems porcentuales se
            abonan solos al registrar un ingreso (desde la cuenta donde
            entró el dinero). Puedes añadir saldo ya apartado y un tope con barra
            de progreso.
          </p>
        </div>
        <AddBudgetItemForm accounts={accounts} />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Ingresos plan vs real
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
            {formatCOP(totalBudgetIncome)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Real este mes: {formatCOP(realIncome)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Gastos plan vs real
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-300">
            {formatCOP(totalBudgetExpense)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Real este mes: {formatCOP(realExpense)}{" "}
            {totalBudgetExpense > 0 && (
              <span
                className={
                  realExpense > totalBudgetExpense
                    ? "text-rose-300"
                    : "text-emerald-300"
                }
              >
                ({Math.round((realExpense / totalBudgetExpense) * 100)}%)
              </span>
            )}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Ahorro proyectado
          </p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${projectedSavings >= 0 ? "text-violet-200" : "text-rose-300"}`}
          >
            {formatCOP(projectedSavings)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Lo que sobra si todo se cumple
          </p>
        </GlassCard>
      </section>

      <BudgetSection
        title="Ingresos presupuestados"
        kind="income"
        items={incomes}
        baseIncome={baseIncome}
        accounts={accounts}
        empty="Añade tu salario, freelance o comisiones."
      />
      <BudgetSection
        title="Gastos presupuestados"
        kind="expense"
        items={expenses}
        baseIncome={baseIncome}
        accounts={accounts}
        empty="Añade arriendo, comida, transporte, diezmo, ahorro porcentual..."
      />
    </div>
  );
}

function compIcon(c: BudgetItem["computation"]) {
  if (c === "fixed") return <Repeat className="h-3.5 w-3.5" />;
  if (c === "variable") return <Wand2 className="h-3.5 w-3.5" />;
  return <Percent className="h-3.5 w-3.5" />;
}

function compLabel(c: BudgetItem["computation"]) {
  if (c === "fixed") return "Fijo";
  if (c === "variable") return "Variable";
  return "Porcentaje";
}

function BudgetSection({
  title,
  kind,
  items,
  baseIncome,
  accounts,
  empty,
}: {
  title: string;
  kind: "income" | "expense";
  items: BudgetItem[];
  baseIncome: number;
  accounts: { id: string; name: string }[];
  empty: string;
}) {
  const total = items.reduce((acc, i) => acc + projected(i, baseIncome), 0);
  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span
          className={`tabular-nums text-sm ${kind === "income" ? "text-emerald-300" : "text-rose-300"}`}
        >
          {formatCOP(total)}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-black/30 p-4 text-xs text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const value = projected(i, baseIncome);
            const showProgress =
              (i.target_amount ?? 0) > 0 ||
              i.saved_amount !== 0 ||
              i.spent_amount > 0;
            const target = i.target_amount ?? value;
            const saved = i.saved_amount;
            const pct =
              target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            const labelAccum =
              kind === "expense" ? "En sobre" : "Acumulado / meta";
            return (
              <li
                key={i.id}
                className={`rounded-lg bg-black/30 px-3 py-2 text-sm ${i.active ? "" : "opacity-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                      {compIcon(i.computation)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-zinc-100">{i.label}</p>
                      <p className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                        <span>{compLabel(i.computation)}</span>
                        {i.computation === "percentage" && (
                          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-300">
                            {i.percentage}% de ingresos
                          </span>
                        )}
                        {i.category && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 uppercase">
                            {i.category}
                          </span>
                        )}
                      </p>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span
                      className={`tabular-nums ${kind === "income" ? "text-emerald-300" : "text-rose-300"}`}
                    >
                      {formatCOP(value)}
                    </span>
                    <>
                      <BudgetFundForm
                        budgetItemId={i.id}
                        budgetItemLabel={i.label}
                        accounts={accounts}
                        initialDirection="in"
                        trigger={
                          <Plus className="h-3.5 w-3.5 text-emerald-300" />
                        }
                      />
                      <BudgetFundForm
                        budgetItemId={i.id}
                        budgetItemLabel={i.label}
                        accounts={accounts}
                        initialDirection="out"
                        trigger={
                          <Minus className="h-3.5 w-3.5 text-rose-300" />
                        }
                      />
                    </>
                    <form action={toggleBudgetItem}>
                      <input type="hidden" name="id" value={i.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(i.active)}
                      />
                      <button
                        type="submit"
                        className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                        aria-label={i.active ? "Pausar" : "Activar"}
                      >
                        {i.active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                    <DeleteForm action={deleteBudgetItem}>
                      <input type="hidden" name="id" value={i.id} />
                    </DeleteForm>
                  </span>
                </div>

                {showProgress && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {labelAccum}{" "}
                        <span className="text-zinc-200 tabular-nums">
                          {formatCOP(saved)}
                        </span>
                        {target > 0 && (
                          <>
                            {" / "}
                            <span className="tabular-nums">
                              {formatCOP(target)}
                            </span>
                          </>
                        )}
                      </span>
                      {target > 0 && saved < target && (
                        <span>Falta {formatCOP(target - saved)}</span>
                      )}
                      {target > 0 && saved >= target && (
                        <span className="text-emerald-300">Listo ✓</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full transition-all ${saved >= target && target > 0 ? "bg-emerald-400" : "bg-violet-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {kind === "expense" && i.spent_amount > 0 && (
                      <p className="text-[11px] text-zinc-600">
                        Gastado contra este ítem:{" "}
                        <span className="text-rose-300 tabular-nums">
                          {formatCOP(i.spent_amount)}
                        </span>
                      </p>
                    )}
                    {i.allocations.length > 0 && (
                      <div className="mt-1 rounded-md bg-black/30 p-2">
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">
                          Reservas (editable / movible)
                        </p>
                        <ul className="space-y-1">
                          {i.allocations.slice(0, 6).map((al) => (
                            <li
                              key={al.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-black/20 px-2 py-1"
                            >
                              <span className="min-w-0 text-[11px] text-zinc-500">
                                <span className="tabular-nums text-zinc-200">
                                  {formatCOP(al.amount)}
                                </span>{" "}
                                en{" "}
                                <span className="text-zinc-300">
                                  {al.account_id
                                    ? (accountNameById.get(al.account_id) ?? "Cuenta")
                                    : "Sin cuenta"}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                <BudgetAllocationEditor
                                  allocationId={al.id}
                                  accountId={al.account_id}
                                  amount={al.amount}
                                  occurredOn={al.occurred_on}
                                  note={al.note}
                                  accounts={accounts}
                                />
                                <form action={deleteBudgetAllocation}>
                                  <input type="hidden" name="id" value={al.id} />
                                  <button
                                    type="submit"
                                    className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-rose-300"
                                    aria-label="Eliminar reserva"
                                  >
                                    ×
                                  </button>
                                </form>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
