"use client";

import { useTransition } from "react";
import { updateInvestmentValue } from "@/app/actions/finance";
import { AmountInput } from "./amount-input";

export function InvestmentValueUpdater({
  investmentId,
  currentValue,
}: {
  investmentId: string;
  currentValue: number;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(fd) => {
        start(async () => {
          await updateInvestmentValue(fd);
        });
      }}
    >
      <input type="hidden" name="id" value={investmentId} />
      <div className="w-36">
        <AmountInput
          name="current_value"
          placeholder="Valor hoy"
          defaultValue={currentValue}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "…" : "Actualizar valor"}
      </button>
    </form>
  );
}
