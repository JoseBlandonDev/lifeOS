import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Banknote,
  Coins,
  HandCoins,
  PiggyBank,
  Receipt,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getFinanceSnapshot } from "@/lib/data/finance";
import { formatCOP, formatDateShort } from "@/lib/format";

function delta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

export default async function FinanzasOverview() {
  const snap = await getFinanceSnapshot();
  if (!snap) return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const t = snap.totals;
  const incomeDelta = delta(t.monthIncome, t.prevMonthIncome);
  const expenseDelta = delta(t.monthExpense, t.prevMonthExpense);
  const savingsRate =
    t.monthIncome > 0
      ? Math.round(((t.monthIncome - t.monthExpense) / t.monthIncome) * 100)
      : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
          <Wallet className="h-3.5 w-3.5" /> Finanzas
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          Tu salud financiera
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Patrimonio neto, ingresos y gastos del mes, y atajos a cada sección.
          Todo en pesos colombianos.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <Scale className="h-3.5 w-3.5" /> Patrimonio neto
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${t.netWorth >= 0 ? "text-emerald-300" : "text-rose-300"}`}
          >
            {formatCOP(t.netWorth)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Cuentas + por cobrar − deudas
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Ingresos · mes
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
            {formatCOP(t.monthIncome)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {incomeDelta == null ? "Sin histórico" : `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}% vs mes pasado`}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" /> Gastos · mes
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-300">
            {formatCOP(t.monthExpense)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {expenseDelta == null ? "Sin histórico" : `${expenseDelta >= 0 ? "+" : ""}${expenseDelta}% vs mes pasado`}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Tasa de ahorro
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${(savingsRate ?? 0) >= 0 ? "text-violet-200" : "text-rose-300"}`}
          >
            {savingsRate == null ? "—" : `${savingsRate}%`}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            (Ingresos − Gastos) / Ingresos
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <Banknote className="h-3.5 w-3.5" /> Banco
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
            {formatCOP(t.bank)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <Coins className="h-3.5 w-3.5" /> Efectivo
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
            {formatCOP(t.cash)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <PiggyBank className="h-3.5 w-3.5" /> Ahorros
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
            {formatCOP(t.savings)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <HandCoins className="h-3.5 w-3.5 text-emerald-400" /> Por cobrar
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
            {formatCOP(t.receivablesOpen)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" /> Por pagar
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-300">
            {formatCOP(t.debtsOpen)}
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Receipt className="h-4 w-4 text-violet-400" />
              Movimientos recientes
            </h2>
            <Link
              href="/finanzas/movimientos"
              className="flex items-center gap-1 text-xs text-violet-300 hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {snap.transactions.length === 0 ? (
            <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">
              Aún no hay movimientos. Crea uno desde Movimientos.
            </p>
          ) : (
            <ul className="space-y-2">
              {snap.transactions.slice(0, 6).map((m) => {
                const isAdj =
                  m.type === "adjust_in" || m.type === "adjust_out";
                const isIn = m.type === "income" || m.type === "adjust_in";
                const Icon =
                  m.type === "income"
                    ? ArrowUpCircle
                    : m.type === "expense"
                      ? ArrowDownCircle
                      : Scale;
                const bg =
                  m.type === "income"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : m.type === "expense"
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-cyan-500/15 text-cyan-300";
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <p className="truncate text-zinc-100">
                          {m.note ||
                            (isAdj
                              ? "Ajuste de saldo"
                              : m.type === "income"
                                ? "Ingreso"
                                : "Gasto")}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatDateShort(m.occurred_on)}
                          {m.account_name && (
                            <span className="ml-1.5 inline-flex items-center gap-1">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor: m.account_color ?? "#8b5cf6",
                                }}
                              />
                              {m.account_name}
                            </span>
                          )}
                        </p>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        m.type === "expense"
                          ? "text-rose-300"
                          : m.type === "adjust_out"
                            ? "text-amber-300"
                            : "text-emerald-300"
                      }`}
                    >
                      {isIn ? "+" : "−"}
                      {formatCOP(m.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Target className="h-4 w-4 text-violet-400" />
              Metas activas
            </h2>
            <Link
              href="/finanzas/metas"
              className="flex items-center gap-1 text-xs text-violet-300 hover:underline"
            >
              Gestionar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {snap.goals.length === 0 ? (
            <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">
              Crea tu primera meta económica.
            </p>
          ) : (
            <ul className="space-y-2">
              {snap.goals.slice(0, 4).map((g) => {
                const pct = Math.min(
                  100,
                  Math.round((g.current_amount / g.target_amount) * 100),
                );
                return (
                  <li key={g.id} className="rounded-lg bg-black/30 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-100">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: g.color }}
                        />
                        {g.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatCOP(g.current_amount)} /{" "}
                        <span className="text-zinc-600">
                          {formatCOP(g.target_amount)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${g.color}, ${g.color}aa)`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </section>
    </div>
  );
}
