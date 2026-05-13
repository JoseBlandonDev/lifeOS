"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addBudgetItem } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";
import { cn } from "@/lib/utils";

type Kind = "income" | "expense";
type Computation = "fixed" | "variable" | "percentage";

const COMP: { value: Computation; label: string; help: string }[] = [
  { value: "fixed", label: "Fijo", help: "Mismo monto cada mes (arriendo, salario)" },
  { value: "variable", label: "Variable", help: "Estimación; se ajusta según el mes" },
  { value: "percentage", label: "Porcentaje", help: "% de ingresos del mes (diezmo, ahorro)" },
];

export function AddBudgetItemForm({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("expense");
  const [computation, setComputation] = useState<Computation>("fixed");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("kind", kind);
    formData.set("computation", computation);
    start(async () => {
      const r = await addBudgetItem(formData);
      if (!r.ok) setError(r.message);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
      >
        <Plus className="h-4 w-4" /> Nuevo ítem
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="flex gap-1 rounded-xl bg-black/40 p-1">
        {(["income", "expense"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              kind === k
                ? k === "income"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-rose-500/20 text-rose-200"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {k === "income" ? "Ingreso" : "Gasto"}
          </button>
        ))}
      </div>

      <div className="grid gap-1 rounded-xl bg-black/40 p-1 sm:grid-cols-3">
        {COMP.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setComputation(c.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              computation === c.value
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">
        {COMP.find((c) => c.value === computation)?.help}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="label"
          required
          placeholder={
            kind === "income"
              ? computation === "percentage"
                ? "Bono % comisiones..."
                : "Salario, freelance..."
              : computation === "percentage"
                ? "Diezmo, ahorro %..."
                : "Arriendo, comida..."
          }
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <input
          name="category"
          placeholder="Categoría (opcional)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {computation === "percentage" ? (
        <div className="relative">
          <input
            name="percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            placeholder="10"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 pr-8 text-sm text-zinc-100 tabular-nums placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            %
          </span>
        </div>
      ) : (
        <AmountInput name="amount" required placeholder="Monto mensual" />
      )}

      {kind === "expense" && computation === "percentage" && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] font-medium text-zinc-400">
            Ya tenías dinero apartado (opcional)
          </p>
          <p className="text-[11px] text-zinc-500">
            Ej.: diezmo acumulado de meses anteriores. Sigue sumando el % cada
            vez que registres un ingreso en una cuenta.
          </p>
          <AmountInput
            name="opening_amount"
            placeholder="Cuánto llevas en el sobre"
          />
          <select
            name="opening_account_id"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
            defaultValue=""
          >
            <option value="" className="bg-zinc-900">
              Cuenta donde está ese dinero…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-zinc-900">
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {kind === "expense" && (
        <div>
          <AmountInput
            name="target_amount"
            placeholder="Tope total a acumular (opcional)"
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Si lo defines, podrás ver una barra de progreso (cuánto llevas
            ahorrado vs el tope). Útil para metas tipo &quot;corte de pelo
            $50.000&quot; o &quot;diezmo $200.000&quot;.
          </p>
        </div>
      )}

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
          {pending ? "Guardando..." : "Añadir"}
        </button>
      </div>
    </form>
  );
}
