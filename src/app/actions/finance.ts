"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FINANZAS_PATHS = [
  "/finanzas",
  "/finanzas/cuentas",
  "/finanzas/movimientos",
  "/finanzas/estadisticas",
  "/finanzas/prestamos",
  "/finanzas/metas",
  "/finanzas/presupuesto",
  "/finanzas/inversiones",
  "/dashboard",
];

function revalAll() {
  for (const p of FINANZAS_PATHS) revalidatePath(p);
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

function num(v: FormDataEntryValue | null): number {
  if (v == null) return NaN;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".");
  return Number(cleaned);
}

// =========================
//   ACCOUNTS
// =========================
export async function addAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "bank");
  const color = String(formData.get("color") ?? "#8b5cf6");
  const initial = num(formData.get("initial_balance"));

  if (!name) return { ok: false as const, message: "Falta el nombre." };
  if (!["bank", "cash", "savings"].includes(type))
    return { ok: false as const, message: "Tipo inválido." };
  const initialOk = Number.isFinite(initial) ? initial : 0;

  const { supabase, user } = await authed();
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    color,
    initial_balance: initialOk,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function deleteAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  revalAll();
}

// =========================
//   TRANSACTIONS
// =========================
export async function addTransaction(formData: FormData) {
  const type = String(formData.get("type") ?? "expense");
  const amount = num(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const account_id = String(formData.get("account_id") ?? "") || null;
  const budget_item_id = String(formData.get("budget_item_id") ?? "").trim() || null;
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!["income", "expense"].includes(type))
    return { ok: false as const, message: "Tipo inválido." };
  if (!account_id)
    return { ok: false as const, message: "Selecciona una cuenta." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Importe inválido." };

  const { supabase, user } = await authed();
  if (type === "expense" && budget_item_id) {
    const { data: budgetItem } = await supabase
      .from("budget_items")
      .select("id")
      .eq("id", budget_item_id)
      .eq("user_id", user.id)
      .eq("kind", "expense")
      .single();
    if (!budgetItem) {
      return {
        ok: false as const,
        message: "El ítem de presupuesto no es válido para este gasto.",
      };
    }
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id,
      type,
      amount,
      note,
      category,
      occurred_on,
      budget_item_id:
        type === "expense" && budget_item_id ? budget_item_id : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, message: error.message };

  if (
    type === "income" &&
    account_id &&
    inserted?.id &&
    amount > 0
  ) {
    const { data: pctItems } = await supabase
      .from("budget_items")
      .select("id, percentage")
      .eq("user_id", user.id)
      .eq("kind", "expense")
      .eq("computation", "percentage");
    const allocRows: Array<{
      user_id: string;
      budget_item_id: string;
      account_id: string;
      amount: number;
      note: string;
      occurred_on: string;
      source_transaction_id: string;
    }> = [];
    for (const row of pctItems ?? []) {
      const pct = Number(row.percentage);
      if (!Number.isFinite(pct) || pct <= 0) continue;
      const slice = Math.round(amount * (pct / 100) * 100) / 100;
      if (slice <= 0) continue;
      allocRows.push({
        user_id: user.id,
        budget_item_id: row.id as string,
        account_id,
        amount: slice,
        note: `Auto: ${pct}% de este ingreso`,
        occurred_on,
        source_transaction_id: inserted.id as string,
      });
    }
    if (allocRows.length > 0) {
      const { error: allocErr } = await supabase
        .from("budget_allocations")
        .insert(allocRows);
      // Compatibilidad temporal si la columna nueva aún no existe.
      if (
        allocErr &&
        String(allocErr.message).toLowerCase().includes("source_transaction_id")
      ) {
        const fallbackRows = allocRows.map(
          ({ source_transaction_id: _sourceTxId, ...rest }) => rest,
        );
        await supabase.from("budget_allocations").insert(fallbackRows);
      }
    }
  }

  revalAll();
  return { ok: true as const };
}

// =========================
//   ACCOUNT ADJUSTMENT (no es ingreso ni gasto)
// =========================
export async function adjustAccountBalance(formData: FormData) {
  const account_id = String(formData.get("account_id") ?? "");
  const direction = String(formData.get("direction") ?? "in");
  const amount = num(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || "Ajuste de saldo";
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!account_id)
    return { ok: false as const, message: "Cuenta inválida." };
  if (!["in", "out"].includes(direction))
    return { ok: false as const, message: "Dirección inválida." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Importe inválido." };

  const { supabase, user } = await authed();
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    type: direction === "in" ? "adjust_in" : "adjust_out",
    amount,
    note,
    category: "Ajuste",
    occurred_on,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function setAccountTotal(formData: FormData) {
  const account_id = String(formData.get("account_id") ?? "");
  const desiredTotal = num(formData.get("total"));
  const note = String(formData.get("note") ?? "").trim() || "Ajuste a saldo total";
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!account_id) return { ok: false as const, message: "Cuenta inválida." };
  if (!Number.isFinite(desiredTotal))
    return { ok: false as const, message: "Saldo objetivo inválido." };

  const { supabase, user } = await authed();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, initial_balance")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .single();
  if (!account) return { ok: false as const, message: "Cuenta no encontrada." };

  const { data: txRows } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .eq("account_id", account_id);

  let current = Number(account.initial_balance ?? 0);
  for (const tx of txRows ?? []) {
    const type = String(tx.type);
    const amount = Number(tx.amount ?? 0);
    const sign = type === "income" || type === "adjust_in" ? 1 : -1;
    current += sign * amount;
  }

  const delta = Math.round((desiredTotal - current) * 100) / 100;
  if (Math.abs(delta) < 0.005) return { ok: true as const };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    type: delta > 0 ? "adjust_in" : "adjust_out",
    amount: Math.abs(delta),
    note,
    category: "Ajuste total",
    occurred_on,
  });
  if (error) return { ok: false as const, message: error.message };

  revalAll();
  return { ok: true as const };
}

export async function transferBetweenAccounts(formData: FormData) {
  const from_account_id = String(formData.get("from_account_id") ?? "");
  const to_account_id = String(formData.get("to_account_id") ?? "");
  const amount = num(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!from_account_id || !to_account_id)
    return { ok: false as const, message: "Selecciona ambas cuentas." };
  if (from_account_id === to_account_id)
    return { ok: false as const, message: "Las cuentas deben ser distintas." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Importe inválido." };

  const { supabase, user } = await authed();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", user.id)
    .in("id", [from_account_id, to_account_id]);
  if (!accounts || accounts.length !== 2)
    return { ok: false as const, message: "Cuenta origen/destino inválida." };

  const fromName =
    accounts.find((a) => String(a.id) === from_account_id)?.name ?? "Cuenta origen";
  const toName =
    accounts.find((a) => String(a.id) === to_account_id)?.name ?? "Cuenta destino";

  const baseNote =
    note ?? `Transferencia de ${fromName} a ${toName}`;
  const outNote = `Transferencia a ${toName} · ${baseNote}`.trim();
  const inNote = `Transferencia desde ${fromName} · ${baseNote}`.trim();

  const { error } = await supabase.from("transactions").insert([
    {
      user_id: user.id,
      account_id: from_account_id,
      type: "adjust_out",
      amount,
      note: outNote,
      category: "Transferencia",
      occurred_on,
    },
    {
      user_id: user.id,
      account_id: to_account_id,
      type: "adjust_in",
      amount,
      note: inNote,
      category: "Transferencia",
      occurred_on,
    },
  ]);
  if (error) return { ok: false as const, message: error.message };

  revalAll();
  return { ok: true as const };
}

export async function deleteTransactionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  // Compatibilidad temporal si la columna aún no existe en algún entorno.
  try {
    await supabase
      .from("budget_allocations")
      .delete()
      .eq("user_id", user.id)
      .eq("source_transaction_id", id);
  } catch {
    // noop
  }
  await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}

// =========================
//   LOANS
// =========================
export async function addLoan(formData: FormData) {
  const kind = String(formData.get("kind") ?? "receivable");
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const original_amount = num(formData.get("original_amount"));
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!counterparty)
    return { ok: false as const, message: "Indica a quién corresponde." };
  if (!["receivable", "debt"].includes(kind))
    return { ok: false as const, message: "Tipo inválido." };
  if (!Number.isFinite(original_amount) || original_amount <= 0)
    return { ok: false as const, message: "Monto inválido." };

  const { supabase, user } = await authed();
  const { error } = await supabase.from("loans").insert({
    user_id: user.id,
    kind,
    counterparty,
    original_amount,
    due_date,
    note,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function deleteLoan(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase.from("loans").delete().eq("id", id).eq("user_id", user.id);
  revalAll();
}

export async function addLoanPayment(formData: FormData) {
  const loan_id = String(formData.get("loan_id") ?? "");
  const amount = num(formData.get("amount"));
  const account_id = String(formData.get("account_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!loan_id) return { ok: false as const, message: "Préstamo inválido." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Monto inválido." };

  const { supabase, user } = await authed();

  const { data: loan } = await supabase
    .from("loans")
    .select("id, kind, original_amount, paid_amount")
    .eq("id", loan_id)
    .eq("user_id", user.id)
    .single();
  if (!loan)
    return { ok: false as const, message: "Préstamo no encontrado." };

  const newPaid = Number(loan.paid_amount) + amount;
  const original = Number(loan.original_amount);
  const cappedPaid = Math.min(newPaid, original);
  const status = cappedPaid >= original ? "closed" : "open";

  const { error: insErr } = await supabase.from("loan_payments").insert({
    user_id: user.id,
    loan_id,
    account_id,
    amount,
    note,
    occurred_on,
  });
  if (insErr) return { ok: false as const, message: insErr.message };

  await supabase
    .from("loans")
    .update({ paid_amount: cappedPaid, status })
    .eq("id", loan_id)
    .eq("user_id", user.id);

  // Reflejar en el saldo de la cuenta como movimiento real
  if (account_id) {
    const txType = loan.kind === "debt" ? "expense" : "income";
    const noteTx =
      loan.kind === "debt"
        ? `Pago a deuda · ${note ?? ""}`.trim()
        : `Cobro de préstamo · ${note ?? ""}`.trim();
    await supabase.from("transactions").insert({
      user_id: user.id,
      account_id,
      type: txType,
      amount,
      note: noteTx,
      category: loan.kind === "debt" ? "Pago deuda" : "Cobro préstamo",
      occurred_on,
    });
  }

  revalAll();
  return { ok: true as const };
}

export async function deleteLoanPayment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const loan_id = String(formData.get("loan_id") ?? "");
  if (!id || !loan_id) return;
  const { supabase, user } = await authed();

  const { data: pay } = await supabase
    .from("loan_payments")
    .select("amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!pay) return;

  await supabase
    .from("loan_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  const { data: loan } = await supabase
    .from("loans")
    .select("paid_amount, original_amount")
    .eq("id", loan_id)
    .eq("user_id", user.id)
    .single();
  if (loan) {
    const newPaid = Math.max(0, Number(loan.paid_amount) - Number(pay.amount));
    const status =
      newPaid >= Number(loan.original_amount) ? "closed" : "open";
    await supabase
      .from("loans")
      .update({ paid_amount: newPaid, status })
      .eq("id", loan_id)
      .eq("user_id", user.id);
  }
  revalAll();
}

// =========================
//   GOALS
// =========================
export async function addGoal(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const target_amount = num(formData.get("target_amount"));
  const color = String(formData.get("color") ?? "#8b5cf6");
  const deadline = String(formData.get("deadline") ?? "").trim() || null;

  if (!name) return { ok: false as const, message: "Falta el nombre." };
  if (!Number.isFinite(target_amount) || target_amount <= 0)
    return { ok: false as const, message: "Objetivo inválido." };

  const { supabase, user } = await authed();
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name,
    target_amount,
    color,
    deadline,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function deleteGoal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  revalAll();
}

export async function addGoalContribution(formData: FormData) {
  const goal_id = String(formData.get("goal_id") ?? "");
  const amount = num(formData.get("amount"));
  const account_id = String(formData.get("account_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!goal_id) return { ok: false as const, message: "Meta inválida." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Monto inválido." };

  const { supabase, user } = await authed();
  const { error } = await supabase.from("goal_contributions").insert({
    user_id: user.id,
    goal_id,
    account_id,
    amount,
    note,
    occurred_on,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function deleteGoalContribution(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("goal_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}

// =========================
//   BUDGET
// =========================
export async function addBudgetItem(formData: FormData) {
  const kind = String(formData.get("kind") ?? "expense");
  const computation = String(formData.get("computation") ?? "fixed");
  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const amount = num(formData.get("amount"));
  const percentage = num(formData.get("percentage"));
  const target_amount_raw = num(formData.get("target_amount"));
  const target_amount =
    Number.isFinite(target_amount_raw) && target_amount_raw > 0
      ? target_amount_raw
      : null;

  if (!label) return { ok: false as const, message: "Falta el nombre." };
  if (!["income", "expense"].includes(kind))
    return { ok: false as const, message: "Tipo inválido." };
  if (!["fixed", "variable", "percentage"].includes(computation))
    return { ok: false as const, message: "Cálculo inválido." };

  let amountFinal: number | null = null;
  let percentageFinal: number | null = null;

  if (computation === "percentage") {
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100)
      return {
        ok: false as const,
        message: "Porcentaje debe estar entre 0 y 100.",
      };
    percentageFinal = percentage;
  } else {
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false as const, message: "Importe inválido." };
    amountFinal = amount;
  }

  const openingRaw = num(formData.get("opening_amount"));
  const opening_account_id =
    String(formData.get("opening_account_id") ?? "").trim() || null;
  const openingOk =
    Number.isFinite(openingRaw) && openingRaw > 0 ? openingRaw : 0;
  if (openingOk > 0 && !opening_account_id) {
    return {
      ok: false as const,
      message:
        "Si indicas dinero ya apartado, elige la cuenta donde lo tienes.",
    };
  }

  const { supabase, user } = await authed();
  const { data: created, error } = await supabase
    .from("budget_items")
    .insert({
      user_id: user.id,
      kind,
      computation,
      label,
      category,
      amount: amountFinal,
      percentage: percentageFinal,
      target_amount,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, message: error.message };

  if (created?.id && openingOk > 0 && opening_account_id) {
    await supabase.from("budget_allocations").insert({
      user_id: user.id,
      budget_item_id: created.id,
      account_id: opening_account_id,
      amount: openingOk,
      note: "Saldo ya apartado (al crear el ítem)",
      occurred_on: new Date().toISOString().slice(0, 10),
    });
  }

  revalAll();
  return { ok: true as const };
}

export async function fundBudgetItem(formData: FormData) {
  const budget_item_id = String(formData.get("budget_item_id") ?? "");
  const account_id = String(formData.get("account_id") ?? "") || null;
  const direction = String(formData.get("direction") ?? "in");
  const amount = num(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!budget_item_id)
    return { ok: false as const, message: "Ítem inválido." };
  if (!["in", "out"].includes(direction))
    return { ok: false as const, message: "Dirección inválida." };
  if (!account_id)
    return {
      ok: false as const,
      message: "Selecciona la cuenta donde está o saldrá el dinero.",
    };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Importe inválido." };

  const signed = direction === "out" ? -amount : amount;

  const { supabase, user } = await authed();
  const { error } = await supabase.from("budget_allocations").insert({
    user_id: user.id,
    budget_item_id,
    account_id,
    amount: signed,
    note,
    occurred_on,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function deleteBudgetAllocation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("budget_allocations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}

export async function updateBudgetAllocation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const account_id = String(formData.get("account_id") ?? "") || null;
  const amount = num(formData.get("amount"));
  const occurred_on =
    String(formData.get("occurred_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id) return { ok: false as const, message: "Reserva inválida." };
  if (!account_id)
    return { ok: false as const, message: "Selecciona la cuenta." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false as const, message: "Importe inválido." };

  const { supabase, user } = await authed();
  const { data: alloc } = await supabase
    .from("budget_allocations")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!alloc) return { ok: false as const, message: "Reserva no encontrada." };

  const { error } = await supabase
    .from("budget_allocations")
    .update({
      account_id,
      amount,
      note,
      occurred_on,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function toggleBudgetItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("budget_items")
    .update({ active: !active })
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}

export async function deleteBudgetItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("budget_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}

// =========================
//   INVESTMENTS
// =========================
const INVESTMENT_KINDS = [
  "stock",
  "crypto",
  "fund",
  "cdt",
  "real_estate",
  "business",
  "other",
];

export async function addInvestment(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "other");
  const color = String(formData.get("color") ?? "#22d3ee");
  const invested = num(formData.get("invested_amount"));
  const current = num(formData.get("current_value"));
  const account_id = String(formData.get("account_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name) return { ok: false as const, message: "Falta el nombre." };
  if (!INVESTMENT_KINDS.includes(kind))
    return { ok: false as const, message: "Tipo inválido." };
  const investedOk = Number.isFinite(invested) && invested >= 0 ? invested : 0;
  const currentOk =
    Number.isFinite(current) && current >= 0 ? current : investedOk;

  const { supabase, user } = await authed();
  const { error } = await supabase.from("investments").insert({
    user_id: user.id,
    name,
    kind,
    color,
    invested_amount: investedOk,
    current_value: currentOk,
    account_id,
    note,
  });
  if (error) return { ok: false as const, message: error.message };
  revalAll();
  return { ok: true as const };
}

export async function updateInvestmentValue(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const current = num(formData.get("current_value"));
  if (!id) return { ok: false as const, message: "Inversión inválida." };
  if (!Number.isFinite(current) || current < 0)
    return { ok: false as const, message: "Valor inválido." };

  const { supabase, user } = await authed();
  const { error } = await supabase
    .from("investments")
    .update({ current_value: current, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, message: error.message };

  await supabase.from("investment_movements").insert({
    user_id: user.id,
    investment_id: id,
    kind: "valuation",
    amount: current,
  });

  revalAll();
  return { ok: true as const };
}

export async function deleteInvestment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await authed();
  await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalAll();
}
