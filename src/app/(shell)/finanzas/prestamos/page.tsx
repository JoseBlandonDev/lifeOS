import { ListChecks, ArrowDown, ArrowUp, Calendar, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddLoanForm } from "@/components/finance/add-loan-form";
import { LoanPaymentForm } from "@/components/finance/loan-payment-form";
import { DeleteForm } from "@/components/dashboard/delete-button";
import { deleteLoan, deleteLoanPayment } from "@/app/actions/finance";
import { getFinanceSnapshot, type Loan } from "@/lib/data/finance";
import { formatCOP, formatDateLong } from "@/lib/format";

export default async function PrestamosPage() {
  const snap = await getFinanceSnapshot();
  if (!snap) return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const accounts = snap.accounts
    .filter((a) => !a.archived && a.type !== "savings")
    .map((a) => ({ id: a.id, name: a.name }));

  const open = snap.loans.filter((l) => l.status === "open");
  const closed = snap.loans.filter((l) => l.status === "closed");

  const receivablesOpen = open.filter((l) => l.kind === "receivable");
  const debtsOpen = open.filter((l) => l.kind === "debt");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <ListChecks className="h-3.5 w-3.5" /> Préstamos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Por cobrar y por pagar
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lleva el control de quién te debe y a quién le debes. Al registrar
            un cobro/pago con cuenta, se crea automáticamente el movimiento.
          </p>
        </div>
        <AddLoanForm />
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <ArrowUp className="h-3.5 w-3.5 text-emerald-400" /> Por cobrar
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
            {formatCOP(snap.totals.receivablesOpen)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {receivablesOpen.length} préstamo(s) abierto(s)
          </p>
        </GlassCard>
        <GlassCard>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <ArrowDown className="h-3.5 w-3.5 text-rose-400" /> Por pagar
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-300">
            {formatCOP(snap.totals.debtsOpen)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {debtsOpen.length} deuda(s) abierta(s)
          </p>
        </GlassCard>
      </section>

      <LoanGroup
        title="Me deben"
        empty="Nadie te debe ahora mismo."
        loans={receivablesOpen}
        accounts={accounts}
      />
      <LoanGroup
        title="Yo debo"
        empty="No tienes deudas abiertas."
        loans={debtsOpen}
        accounts={accounts}
      />

      {closed.length > 0 && (
        <GlassCard>
          <h2 className="mb-3 text-base font-semibold tracking-tight">Cerrados</h2>
          <ul className="space-y-2">
            {closed.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm text-zinc-400"
              >
                <span>
                  {l.kind === "receivable" ? "Cobrado a " : "Pagado a "}
                  <span className="text-zinc-200">{l.counterparty}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatCOP(l.original_amount)}</span>
                  <DeleteForm action={deleteLoan}>
                    <input type="hidden" name="id" value={l.id} />
                  </DeleteForm>
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function LoanGroup({
  title,
  empty,
  loans,
  accounts,
}: {
  title: string;
  empty: string;
  loans: Loan[];
  accounts: { id: string; name: string }[];
}) {
  return (
    <GlassCard>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      {loans.length === 0 ? (
        <p className="rounded-lg bg-black/30 p-4 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {loans.map((l) => {
            const pct = Math.round((l.paid_amount / l.original_amount) * 100);
            return (
              <li
                key={l.id}
                className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100">
                      {l.counterparty}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span className="tabular-nums">
                        {formatCOP(l.paid_amount)} / {formatCOP(l.original_amount)}
                      </span>
                      {l.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> vence{" "}
                          {formatDateLong(l.due_date)}
                        </span>
                      )}
                    </p>
                    {l.note && (
                      <p className="mt-1 text-xs text-zinc-500">{l.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-200 tabular-nums">
                      {formatCOP(l.remaining)}
                    </span>
                    <DeleteForm action={deleteLoan}>
                      <input type="hidden" name="id" value={l.id} />
                    </DeleteForm>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${l.kind === "receivable" ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <LoanPaymentForm
                  loanId={l.id}
                  accounts={accounts}
                  remaining={l.remaining}
                  kind={l.kind}
                />

                {l.payments.length > 0 && (
                  <details className="rounded-lg bg-black/30 p-2 text-xs">
                    <summary className="cursor-pointer text-zinc-500">
                      {l.payments.length}{" "}
                      {l.kind === "receivable" ? "cobro(s)" : "pago(s)"}
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {l.payments.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between rounded-md px-2 py-1 text-zinc-400"
                        >
                          <span>{formatDateLong(p.occurred_on)}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-zinc-200">
                              {formatCOP(p.amount)}
                            </span>
                            <form action={deleteLoanPayment}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="loan_id" value={l.id} />
                              <button
                                type="submit"
                                className="rounded p-0.5 text-zinc-500 hover:text-rose-300"
                                aria-label="Eliminar pago"
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
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
