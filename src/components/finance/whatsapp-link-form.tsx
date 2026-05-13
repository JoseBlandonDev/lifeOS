"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { upsertWhatsappFinanceLink } from "@/app/actions/finance";

type Account = { id: string; name: string; type: string };
type InitialLink = {
  phone_number: string;
  default_account_id: string | null;
  active: boolean;
} | null;

export function WhatsappLinkForm({
  accounts,
  initialLink,
}: {
  accounts: Account[];
  initialLink: InitialLink;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await upsertWhatsappFinanceLink(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form
      action={submit}
      className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Bot de WhatsApp para gastos e ingresos
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Vincula tu numero y una cuenta por defecto. Luego podras mandar texto,
            audio o fotos de recibos.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="phone_number"
          required
          defaultValue={initialLink?.phone_number ?? ""}
          placeholder="573001112233"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <select
          name="default_account_id"
          required
          defaultValue={initialLink?.default_account_id ?? ""}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="" className="bg-zinc-900">
            Cuenta por defecto
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id} className="bg-zinc-900">
              {account.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || accounts.length === 0}
          className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          name="active"
          type="checkbox"
          defaultChecked={initialLink?.active ?? true}
          className="h-4 w-4 rounded border-white/10 bg-black/40"
        />
        Bot activo para este numero
      </label>

      <p className="text-[11px] text-zinc-500">
        Usa formato internacional sin +. Para Colombia: 57 + tu numero.
      </p>
      {saved && <p className="text-xs text-emerald-300">Configuracion guardada.</p>}
      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
