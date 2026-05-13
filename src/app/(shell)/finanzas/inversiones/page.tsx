import { Landmark, LineChart } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddInvestmentForm } from "@/components/finance/add-investment-form";
import { InvestmentValueUpdater } from "@/components/finance/investment-value-updater";
import { DeleteForm } from "@/components/dashboard/delete-button";
import { deleteInvestment } from "@/app/actions/finance";
import { getFinanceSnapshot } from "@/lib/data/finance";
import { formatCOP } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  stock: "Acciones",
  crypto: "Cripto",
  fund: "Fondo",
  cdt: "CDT / plazo",
  real_estate: "Inmueble",
  business: "Negocio",
  other: "Otro",
};

export default async function InversionesPage() {
  const snap = await getFinanceSnapshot();
  if (!snap)
    return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const list = snap.investments.filter((i) => !i.archived);
  const accounts = snap.accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, name: a.name }));
  const t = snap.totals;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-cyan-400/90">
            <Landmark className="h-3.5 w-3.5" /> Inversiones
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Patrimonio en instrumentos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Registra cuánto invertiste y actualiza el valor de mercado cuando
            quieras ver ganancia o pérdida no realizada. Es un módulo simple;
            más adelante se puede enlazar con cotizaciones o dividendos.
          </p>
        </div>
        <AddInvestmentForm accounts={accounts} />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Valor actual
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-cyan-300">
            {formatCOP(t.investments)}
          </p>
          <p className="text-[11px] text-zinc-500">Suma de posiciones activas</p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <LineChart className="h-3.5 w-3.5" /> Resultado no realizado
          </p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${t.investmentGain >= 0 ? "text-emerald-300" : "text-rose-300"}`}
          >
            {formatCOP(t.investmentGain)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Valor actual − dinero invertido
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Posiciones
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
            {list.length}
          </p>
        </GlassCard>
      </section>

      <GlassCard>
        <h2 className="mb-3 text-base font-semibold tracking-tight">
          Tus posiciones
        </h2>
        {list.length === 0 ? (
          <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">
            Añade una inversión (CDT, fondo, cripto, etc.) con el botón de
            arriba.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((i) => {
              const diff = i.current_value - i.invested_amount;
              return (
                <li
                  key={i.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: i.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100">{i.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {KIND_LABEL[i.kind] ?? i.kind}
                        {i.account_name && (
                          <span className="text-zinc-400">
                            {" · "}
                            {i.account_name}
                          </span>
                        )}
                      </p>
                      {i.note && (
                        <p className="mt-1 text-xs text-zinc-600">{i.note}</p>
                      )}
                      <p className="mt-2 text-xs text-zinc-500">
                        Invertido{" "}
                        <span className="tabular-nums text-zinc-300">
                          {formatCOP(i.invested_amount)}
                        </span>
                        {" · "}
                        Hoy{" "}
                        <span className="tabular-nums text-zinc-200">
                          {formatCOP(i.current_value)}
                        </span>
                        <span
                          className={
                            diff >= 0
                              ? "ml-2 tabular-nums text-emerald-400"
                              : "ml-2 tabular-nums text-rose-400"
                          }
                        >
                          ({diff >= 0 ? "+" : ""}
                          {formatCOP(diff)})
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <InvestmentValueUpdater
                      investmentId={i.id}
                      currentValue={i.current_value}
                    />
                    <DeleteForm action={deleteInvestment}>
                      <input type="hidden" name="id" value={i.id} />
                    </DeleteForm>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
