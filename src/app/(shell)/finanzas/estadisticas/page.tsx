import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getMonthlyFinanceRollup } from "@/lib/data/finance";
import { formatCOP } from "@/lib/format";

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, 1));
}

export default async function EstadisticasPage() {
  const roll = await getMonthlyFinanceRollup(18);
  if (!roll)
    return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const rows = [...roll].reverse();

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
          <BarChart3 className="h-3.5 w-3.5" /> Estadísticas
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
          Historial por mes
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Ingresos y gastos reales registrados, más ajustes de saldo (no cuentan
          como ingreso/gasto en tu reporte operativo pero sí en efectivo).
        </p>
      </header>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="pb-3 pr-4 font-medium">Mes</th>
                <th className="pb-3 pr-4 font-medium text-emerald-300/90">
                  Ingresos
                </th>
                <th className="pb-3 pr-4 font-medium text-rose-300/90">
                  Gastos
                </th>
                <th className="pb-3 pr-4 font-medium text-cyan-300/90">
                  Ajustes +
                </th>
                <th className="pb-3 pr-4 font-medium text-amber-300/90">
                  Ajustes −
                </th>
                <th className="pb-3 font-medium">Resultado*</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const op = r.income - r.expense;
                const cashflow = op + r.adjustIn - r.adjustOut;
                return (
                  <tr
                    key={r.ym}
                    className="border-b border-white/5 text-zinc-200 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium capitalize text-zinc-100">
                      {monthLabel(r.ym)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-emerald-300">
                      {formatCOP(r.income)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-rose-300">
                      {formatCOP(r.expense)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-cyan-300">
                      {formatCOP(r.adjustIn)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-amber-300">
                      {formatCOP(r.adjustOut)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={
                          op >= 0
                            ? "tabular-nums text-violet-200"
                            : "tabular-nums text-rose-300"
                        }
                      >
                        {formatCOP(op)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-zinc-500">
                        Flujo con ajustes:{" "}
                        <span
                          className={
                            cashflow >= 0 ? "text-zinc-400" : "text-rose-400"
                          }
                        >
                          {formatCOP(cashflow)}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          *Resultado = ingresos − gastos (sin ajustes). Usa Movimientos para el
          detalle y enlazar gastos a líneas del presupuesto.
        </p>
      </GlassCard>
    </div>
  );
}
