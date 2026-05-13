import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedFinanceMessage } from "./gemini";

type SaveInput = {
  supabase: SupabaseClient;
  userId: string;
  accountId: string;
  parsed: ParsedFinanceMessage;
  sourceNote?: string;
};

type BudgetAllocationInsert = {
  user_id: string;
  budget_item_id: string;
  account_id: string;
  amount: number;
  note: string;
  occurred_on: string;
  source_transaction_id: string;
};

function cleanDate(value: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function canAutoSave(parsed: ParsedFinanceMessage) {
  return (
    parsed.intent === "transaction" &&
    (parsed.type === "income" || parsed.type === "expense") &&
    typeof parsed.amount === "number" &&
    parsed.amount > 0 &&
    parsed.confidence >= 0.92 &&
    !parsed.needs_confirmation
  );
}

export function canSaveAfterConfirmation(parsed: ParsedFinanceMessage) {
  return (
    parsed.intent === "transaction" &&
    (parsed.type === "income" || parsed.type === "expense") &&
    typeof parsed.amount === "number" &&
    parsed.amount > 0
  );
}

export async function saveFinanceTransactionFromWhatsapp({
  supabase,
  userId,
  accountId,
  parsed,
  sourceNote,
}: SaveInput) {
  if (!canSaveAfterConfirmation(parsed)) {
    return { ok: false as const, message: "Faltan datos para guardar." };
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("archived", false)
    .single();

  if (!account) {
    return { ok: false as const, message: "La cuenta predeterminada no existe." };
  }

  let budgetItemId: string | null = null;
  if (parsed.type === "expense" && parsed.category) {
    const category = parsed.category.replace(/[%_,]/g, "").trim();
    const { data: budgetItem } = await supabase
      .from("budget_items")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "expense")
      .or(`label.ilike.%${category}%,category.ilike.%${category}%`)
      .limit(1)
      .maybeSingle();
    budgetItemId = (budgetItem?.id as string | undefined) ?? null;
  }

  const noteParts = [
    parsed.note,
    sourceNote ? `WhatsApp: ${sourceNote}` : "WhatsApp",
  ].filter(Boolean);

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: accountId,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      note: noteParts.join(" · "),
      occurred_on: cleanDate(parsed.occurred_on),
      budget_item_id: parsed.type === "expense" ? budgetItemId : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, message: error.message };

  if (parsed.type === "income" && inserted?.id) {
    const { data: pctItems } = await supabase
      .from("budget_items")
      .select("id, percentage")
      .eq("user_id", userId)
      .eq("kind", "expense")
      .eq("computation", "percentage");

    const allocRows: BudgetAllocationInsert[] = [];
    for (const row of pctItems ?? []) {
      const pct = Number(row.percentage);
      const amount = Math.round((parsed.amount ?? 0) * (pct / 100) * 100) / 100;
      if (!Number.isFinite(pct) || pct <= 0 || amount <= 0) continue;
      allocRows.push({
          user_id: userId,
          budget_item_id: row.id as string,
          account_id: accountId,
          amount,
          note: `Auto WhatsApp: ${pct}% de este ingreso`,
          occurred_on: cleanDate(parsed.occurred_on),
          source_transaction_id: inserted.id as string,
      });
    }

    if (allocRows.length > 0) {
      await supabase.from("budget_allocations").insert(allocRows);
    }
  }

  return { ok: true as const, transactionId: inserted?.id as string };
}
