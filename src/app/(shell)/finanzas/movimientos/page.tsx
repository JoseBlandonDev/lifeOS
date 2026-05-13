import Link from "next/link";
import { Receipt } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AddTransactionForm } from "@/components/finance/add-transaction-form";
import { TransactionsList } from "@/components/finance/transactions-list";
import { WhatsappLinkForm } from "@/components/finance/whatsapp-link-form";
import { getFinanceSnapshot } from "@/lib/data/finance";
import { getWhatsappFinanceLink } from "@/lib/data/whatsapp";

export default async function MovimientosPage() {
  const [snap, whatsappLink] = await Promise.all([
    getFinanceSnapshot(),
    getWhatsappFinanceLink(),
  ]);
  if (!snap) return <div className="text-sm text-zinc-400">No se pudo cargar.</div>;

  const accounts = snap.accounts.filter((a) => !a.archived);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400/90">
            <Receipt className="h-3.5 w-3.5" /> Movimientos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Ingresos y gastos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cada ingreso o gasto va a una cuenta. Los ajustes (+/−) no cuentan
            como ingreso/gasto. En gastos puedes enlazar una línea del
            presupuesto.
          </p>
        </div>
        <AddTransactionForm
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))}
          expenseBudgetItems={snap.budgetItems
            .filter((b) => b.kind === "expense")
            .map((b) => ({ id: b.id, label: b.label }))}
        />
      </header>

      <WhatsappLinkForm
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        initialLink={whatsappLink}
      />

      {accounts.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-zinc-400">
            Crea primero al menos una cuenta en{" "}
            <Link href="/finanzas/cuentas" className="text-violet-300 hover:underline">
              Cuentas
            </Link>{" "}
            para registrar movimientos.
          </p>
        </GlassCard>
      ) : (
        <GlassCard>
          <TransactionsList
            transactions={snap.transactions}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        </GlassCard>
      )}
    </div>
  );
}
