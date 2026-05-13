"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { addLoanPayment } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

type Account = { id: string; name: string };

export function LoanPaymentForm({
  loanId,
  accounts,
  remaining,
  kind,
}: {
  loanId: string;
  accounts: Account[];
  remaining: number;
  kind: "receivable" | "debt";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set("loan_id", loanId);
    start(async () => {
      const r = await addLoanPayment(formData);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <form action={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <AmountInput name="amount" required placeholder={`${kind === "debt" ? "Pago" : "Cobro"} (max ${remaining})`} />
        <select
          name="account_id"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200"
        >
          <option value="" className="bg-zinc-900">
            Sin imputar a cuenta
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-zinc-900">
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-violet-500/90 px-3 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {pending ? "..." : kind === "debt" ? "Pagar" : "Registrar cobro"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
