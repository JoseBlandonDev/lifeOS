"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Equal,
  Search,
  Trash2,
} from "lucide-react";
import type { Transaction } from "@/lib/data/finance";
import { deleteTransactionAction } from "@/app/actions/finance";
import { formatCOP, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string };
type Filter = "all" | "income" | "expense" | "adjust";

function txLabel(t: Transaction) {
  if (t.type === "adjust_in") return t.note || "Ajuste + saldo";
  if (t.type === "adjust_out") return t.note || "Ajuste − saldo";
  return t.note || (t.type === "income" ? "Ingreso" : "Gasto");
}

export function TransactionsList({
  transactions,
  accounts,
}: {
  transactions: Transaction[];
  accounts: Account[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [accountId, setAccountId] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "income" && t.type !== "income") return false;
      if (filter === "expense" && t.type !== "expense") return false;
      if (filter === "adjust" && t.type !== "adjust_in" && t.type !== "adjust_out")
        return false;
      if (accountId && t.account_id !== accountId) return false;
      if (query) {
        const q = query.toLowerCase();
        const blob = `${t.note ?? ""} ${t.account_name ?? ""} ${t.category ?? ""} ${t.budget_item_label ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filter, accountId, query]);

  const totalIn = filtered
    .filter((t) => t.type === "income")
    .reduce((a, b) => a + b.amount, 0);
  const totalOut = filtered
    .filter((t) => t.type === "expense")
    .reduce((a, b) => a + b.amount, 0);
  const totalAdjIn = filtered
    .filter((t) => t.type === "adjust_in")
    .reduce((a, b) => a + b.amount, 0);
  const totalAdjOut = filtered
    .filter((t) => t.type === "adjust_out")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/10 bg-black/40 p-0.5">
          {(
            [
              ["all", "Todos"],
              ["income", "Ingresos"],
              ["expense", "Gastos"],
              ["adjust", "Ajustes"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filter === f
                  ? f === "income"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : f === "expense"
                      ? "bg-rose-500/20 text-rose-200"
                      : f === "adjust"
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "bg-white/10 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {accounts.length > 0 && (
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200"
          >
            <option value="" className="bg-zinc-900">
              Todas las cuentas
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-zinc-900">
                {a.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="bg-transparent py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <p className="text-zinc-500">Ingresos</p>
          <p className="tabular-nums text-emerald-300">{formatCOP(totalIn)}</p>
        </div>
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <p className="text-zinc-500">Gastos</p>
          <p className="tabular-nums text-rose-300">{formatCOP(totalOut)}</p>
        </div>
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <p className="text-zinc-500">Ajustes + / −</p>
          <p className="tabular-nums text-cyan-300">
            +{formatCOP(totalAdjIn)} / −{formatCOP(totalAdjOut)}
          </p>
        </div>
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <p className="text-zinc-500">Ingresos − gastos</p>
          <p
            className={`tabular-nums ${totalIn - totalOut >= 0 ? "text-zinc-100" : "text-rose-300"}`}
          >
            {formatCOP(totalIn - totalOut)}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <li className="rounded-lg bg-black/30 p-6 text-center text-sm text-zinc-500">
            Sin movimientos para los filtros seleccionados.
          </li>
        ) : (
          filtered.map((t) => {
            const isAdj = t.type === "adjust_in" || t.type === "adjust_out";
            const isIn = t.type === "income" || t.type === "adjust_in";
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      t.type === "income"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : t.type === "expense"
                          ? "bg-rose-500/15 text-rose-300"
                          : "bg-cyan-500/15 text-cyan-300",
                    )}
                  >
                    {t.type === "income" ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : t.type === "expense" ? (
                      <ArrowDownCircle className="h-4 w-4" />
                    ) : (
                      <Equal className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-zinc-100">{txLabel(t)}</p>
                    <p className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatDateLong(t.occurred_on)}</span>
                      {t.account_name && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: t.account_color ?? "#8b5cf6",
                            }}
                          />
                          {t.account_name}
                        </span>
                      )}
                      {t.budget_item_label && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
                          Presup.: {t.budget_item_label}
                        </span>
                      )}
                      {t.category && (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                          {t.category}
                        </span>
                      )}
                      {isAdj && (
                        <span className="text-[10px] text-cyan-400/90">
                          Ajuste de saldo
                        </span>
                      )}
                    </p>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "tabular-nums",
                      t.type === "income"
                        ? "text-emerald-300"
                        : t.type === "expense"
                          ? "text-rose-300"
                          : t.type === "adjust_in"
                            ? "text-cyan-300"
                            : "text-amber-300",
                    )}
                  >
                    {isIn ? "+" : "−"}
                    {formatCOP(t.amount)}
                  </span>
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-rose-300"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
