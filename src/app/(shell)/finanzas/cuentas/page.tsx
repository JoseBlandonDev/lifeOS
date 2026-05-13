import { Banknote, Coins, CreditCard, PiggyBank } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddAccountForm } from "@/components/finance/add-account-form";
import { AccountAdjustForm } from "@/components/finance/account-adjust-form";
import { AccountTotalSetForm } from "@/components/finance/account-total-set-form";
import { AccountTransferForm } from "@/components/finance/account-transfer-form";
import { DeleteForm } from "@/components/dashboard/delete-button";
import { deleteAccount } from "@/app/actions/finance";
import { getFinanceSnapshot, AccountType } from "@/lib/data/finance";
import { formatCOP } from "@/lib/format";

const TYPE_META: Record<
  AccountType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  bank: { label: "Cuentas bancarias", icon: Banknote },
  cash: { label: "Efectivo", icon: Coins },
  savings: { label: "Ahorros / bolsillos", icon: PiggyBank },
};

export default async function CuentasPage() {
  const snap = await getFinanceSnapshot();
  if (!snap) return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const grouped: Record<AccountType, typeof snap.accounts> = {
    bank: [],
    cash: [],
    savings: [],
  };
  for (const a of snap.accounts) {
    if (!a.archived) grouped[a.type].push(a);
  }
  const allAccounts = snap.accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <CreditCard className="h-3.5 w-3.5" /> Cuentas
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Tus saldos por tipo
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cada movimiento o ajuste actualiza su saldo. Puedes depositar o
            retirar dinero sin que cuente como ingreso ni gasto.
          </p>
        </div>
        <AddAccountForm />
      </header>

      {(Object.keys(TYPE_META) as AccountType[]).map((type) => {
        const meta = TYPE_META[type];
        const list = grouped[type];
        const total = list.reduce((acc, a) => acc + a.balance, 0);
        return (
          <GlassCard key={type}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <meta.icon className="h-4 w-4 text-violet-400" />
                {meta.label}
              </h2>
              <span className="tabular-nums text-sm text-zinc-300">
                {formatCOP(total)}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="rounded-lg bg-black/30 p-4 text-xs text-zinc-500">
                Sin cuentas {type === "bank" ? "bancarias" : type === "cash" ? "de efectivo" : "de ahorro"} aún.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {a.name}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {a.reserved > 0 ? (
                            <>
                              reservado{" "}
                              <span className="text-amber-300">
                                {formatCOP(a.reserved)}
                              </span>
                              {" · "}
                              libre{" "}
                              <span
                                className={
                                  a.available >= 0
                                    ? "text-emerald-300"
                                    : "text-rose-300"
                                }
                              >
                                {formatCOP(a.available)}
                              </span>
                            </>
                          ) : (
                            <>inicial {formatCOP(a.initial_balance)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`tabular-nums text-sm ${a.balance >= 0 ? "text-zinc-100" : "text-rose-300"}`}
                      >
                        {formatCOP(a.balance)}
                      </span>
                      <AccountAdjustForm
                        accountId={a.id}
                        accountName={a.name}
                      />
                      <AccountTotalSetForm
                        accountId={a.id}
                        accountName={a.name}
                        currentBalance={a.balance}
                      />
                      <AccountTransferForm
                        fromAccountId={a.id}
                        fromAccountName={a.name}
                        accounts={allAccounts}
                      />
                      <DeleteForm action={deleteAccount}>
                        <input type="hidden" name="id" value={a.id} />
                      </DeleteForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
