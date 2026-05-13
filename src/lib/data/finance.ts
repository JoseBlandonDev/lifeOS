import { createClient } from "@/lib/supabase/server";

export type AccountType = "bank" | "cash" | "savings";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  initial_balance: number;
  archived: boolean;
};

export type AccountWithBalance = Account & {
  balance: number;
  reserved: number;
  available: number;
};

export type TransactionType = "income" | "expense" | "adjust_in" | "adjust_out";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string | null;
  note: string | null;
  occurred_on: string;
  account_id: string | null;
  account_name: string | null;
  account_color: string | null;
  budget_item_id: string | null;
  budget_item_label: string | null;
};

export type Loan = {
  id: string;
  kind: "receivable" | "debt";
  counterparty: string;
  original_amount: number;
  paid_amount: number;
  due_date: string | null;
  note: string | null;
  status: "open" | "closed";
  remaining: number;
  payments: LoanPayment[];
};

export type LoanPayment = {
  id: string;
  loan_id: string;
  account_id: string | null;
  amount: number;
  occurred_on: string;
  note: string | null;
};

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  color: string;
  deadline: string | null;
  archived: boolean;
  current_amount: number;
  contributions: GoalContribution[];
};

export type GoalContribution = {
  id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  occurred_on: string;
  note: string | null;
};

export type BudgetItem = {
  id: string;
  kind: "income" | "expense";
  computation: "fixed" | "variable" | "percentage";
  label: string;
  amount: number | null;
  percentage: number | null;
  category: string | null;
  active: boolean;
  target_amount: number | null;
  saved_amount: number;
  spent_amount: number;
  allocations: BudgetAllocation[];
};

export type BudgetAllocation = {
  id: string;
  budget_item_id: string;
  account_id: string | null;
  amount: number;
  occurred_on: string;
  note: string | null;
};

export type Investment = {
  id: string;
  name: string;
  kind:
    | "stock"
    | "crypto"
    | "fund"
    | "cdt"
    | "real_estate"
    | "business"
    | "other";
  color: string;
  invested_amount: number;
  current_value: number;
  account_id: string | null;
  account_name: string | null;
  note: string | null;
  archived: boolean;
};

export type FinanceSnapshot = {
  accounts: AccountWithBalance[];
  transactions: Transaction[];
  loans: Loan[];
  goals: Goal[];
  budgetItems: BudgetItem[];
  investments: Investment[];
  totals: {
    bank: number;
    cash: number;
    savings: number;
    receivablesOpen: number;
    debtsOpen: number;
    investments: number;
    investmentGain: number;
    netWorth: number;
    monthIncome: number;
    monthExpense: number;
    prevMonthIncome: number;
    prevMonthExpense: number;
  };
};

export type MonthFinanceRollup = {
  ym: string;
  income: number;
  expense: number;
  adjustIn: number;
  adjustOut: number;
};

export async function getMonthlyFinanceRollup(
  monthsBack = 18,
): Promise<MonthFinanceRollup[] | null> {
  if (!envOk()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("transactions")
    .select("type, amount, occurred_on")
    .eq("user_id", user.id);

  const rolls = new Map<string, MonthFinanceRollup>();
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    rolls.set(ym, {
      ym,
      income: 0,
      expense: 0,
      adjustIn: 0,
      adjustOut: 0,
    });
  }

  for (const t of rows ?? []) {
    const ym = String(t.occurred_on).slice(0, 7);
    if (!rolls.has(ym)) {
      rolls.set(ym, {
        ym,
        income: 0,
        expense: 0,
        adjustIn: 0,
        adjustOut: 0,
      });
    }
    const bucket = rolls.get(ym)!;
    const amt = Number(t.amount);
    const ty = t.type as string;
    if (ty === "income") bucket.income += amt;
    else if (ty === "expense") bucket.expense += amt;
    else if (ty === "adjust_in") bucket.adjustIn += amt;
    else if (ty === "adjust_out") bucket.adjustOut += amt;
  }

  return Array.from(rolls.values()).sort((a, b) =>
    a.ym.localeCompare(b.ym),
  );
}

function envOk() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getFinanceSnapshot(): Promise<FinanceSnapshot | null> {
  if (!envOk()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 10);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .slice(0, 10);

  const [
    accountsRes,
    transactionsRes,
    loansRes,
    loanPaymentsRes,
    goalsRes,
    goalContributionsRes,
    budgetRes,
    allocationsRes,
    investmentsRes,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, color, initial_balance, archived")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("transactions")
      .select(
        "id, type, amount, category, note, occurred_on, account_id, budget_item_id, accounts(name, color), budget_items(label)",
      )
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .limit(1000),
    supabase
      .from("loans")
      .select(
        "id, kind, counterparty, original_amount, paid_amount, due_date, note, status",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("loan_payments")
      .select("id, loan_id, account_id, amount, occurred_on, note")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("goals")
      .select("id, name, target_amount, color, deadline, archived")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("goal_contributions")
      .select("id, goal_id, account_id, amount, occurred_on, note")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("budget_items")
      .select(
        "id, kind, computation, label, amount, percentage, category, active, target_amount",
      )
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("budget_allocations")
      .select("id, budget_item_id, account_id, amount, occurred_on, note")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("investments")
      .select(
        "id, name, kind, color, invested_amount, current_value, account_id, note, archived, accounts(name)",
      )
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const accounts: Account[] = (accountsRes.data ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    type: a.type as AccountType,
    color: (a.color as string) || "#8b5cf6",
    initial_balance: Number(a.initial_balance ?? 0),
    archived: Boolean(a.archived),
  }));

  const accountBalanceDelta = new Map<string, number>();
  for (const a of accounts) {
    accountBalanceDelta.set(a.id, a.initial_balance);
  }

  let monthIncome = 0;
  let monthExpense = 0;
  let prevMonthIncome = 0;
  let prevMonthExpense = 0;

  const spentByBudget = new Map<string, number>();

  const transactions: Transaction[] = (transactionsRes.data ?? []).map((t) => {
    const amt = Number(t.amount);
    const type = t.type as TransactionType;
    const occurred = String(t.occurred_on);
    const isThisMonth = occurred >= monthStart;
    const isPrevMonth = occurred >= prevMonthStart && occurred <= prevMonthEnd;

    if (type === "income") {
      if (isThisMonth) monthIncome += amt;
      if (isPrevMonth) prevMonthIncome += amt;
    } else if (type === "expense") {
      if (isThisMonth) monthExpense += amt;
      if (isPrevMonth) prevMonthExpense += amt;
    }

    if (t.account_id) {
      const sign =
        type === "income" || type === "adjust_in" ? 1 : -1;
      accountBalanceDelta.set(
        t.account_id as string,
        (accountBalanceDelta.get(t.account_id as string) ?? 0) + sign * amt,
      );
    }

    if (type === "expense" && t.budget_item_id) {
      const bid = t.budget_item_id as string;
      spentByBudget.set(bid, (spentByBudget.get(bid) ?? 0) + amt);
    }

    const accountField = t.accounts as
      | { name: string; color: string }
      | { name: string; color: string }[]
      | null;
    const accInfo = Array.isArray(accountField) ? accountField[0] : accountField;
    const budgetField = t.budget_items as
      | { label: string }
      | { label: string }[]
      | null;
    const bInfo = Array.isArray(budgetField) ? budgetField[0] : budgetField;

    return {
      id: t.id as string,
      type,
      amount: amt,
      category: (t.category as string | null) ?? null,
      note: (t.note as string | null) ?? null,
      occurred_on: occurred,
      account_id: (t.account_id as string | null) ?? null,
      account_name: accInfo?.name ?? null,
      account_color: accInfo?.color ?? null,
      budget_item_id: (t.budget_item_id as string | null) ?? null,
      budget_item_label: bInfo?.label ?? null,
    };
  });

  // Asignaciones reservadas por cuenta (earmark): no afectan saldo, sólo "reservado"
  const reservedByAccount = new Map<string, number>();
  const allocByBudget = new Map<string, BudgetAllocation[]>();
  const allocSum = new Map<string, number>();
  for (const al of allocationsRes.data ?? []) {
    const a: BudgetAllocation = {
      id: al.id as string,
      budget_item_id: al.budget_item_id as string,
      account_id: (al.account_id as string | null) ?? null,
      amount: Number(al.amount),
      occurred_on: String(al.occurred_on),
      note: (al.note as string | null) ?? null,
    };
    if (!allocByBudget.has(a.budget_item_id))
      allocByBudget.set(a.budget_item_id, []);
    allocByBudget.get(a.budget_item_id)!.push(a);
    allocSum.set(
      a.budget_item_id,
      (allocSum.get(a.budget_item_id) ?? 0) + a.amount,
    );
    if (a.account_id) {
      reservedByAccount.set(
        a.account_id,
        (reservedByAccount.get(a.account_id) ?? 0) + a.amount,
      );
    }
  }

  const accountsWithBalance: AccountWithBalance[] = accounts.map((a) => {
    const balance = accountBalanceDelta.get(a.id) ?? 0;
    const reserved = Math.max(0, reservedByAccount.get(a.id) ?? 0);
    return {
      ...a,
      balance,
      reserved,
      available: balance - reserved,
    };
  });

  const paymentsByLoan = new Map<string, LoanPayment[]>();
  for (const p of loanPaymentsRes.data ?? []) {
    const lp: LoanPayment = {
      id: p.id as string,
      loan_id: p.loan_id as string,
      account_id: (p.account_id as string | null) ?? null,
      amount: Number(p.amount),
      occurred_on: String(p.occurred_on),
      note: (p.note as string | null) ?? null,
    };
    if (!paymentsByLoan.has(lp.loan_id)) paymentsByLoan.set(lp.loan_id, []);
    paymentsByLoan.get(lp.loan_id)!.push(lp);
  }

  const loans: Loan[] = (loansRes.data ?? []).map((l) => {
    const original = Number(l.original_amount);
    const paid = Number(l.paid_amount);
    return {
      id: l.id as string,
      kind: l.kind as "receivable" | "debt",
      counterparty: l.counterparty as string,
      original_amount: original,
      paid_amount: paid,
      due_date: (l.due_date as string | null) ?? null,
      note: (l.note as string | null) ?? null,
      status: l.status as "open" | "closed",
      remaining: Math.max(0, original - paid),
      payments: paymentsByLoan.get(l.id as string) ?? [],
    };
  });

  const contributionsByGoal = new Map<string, GoalContribution[]>();
  const goalSums = new Map<string, number>();
  for (const c of goalContributionsRes.data ?? []) {
    const gc: GoalContribution = {
      id: c.id as string,
      goal_id: c.goal_id as string,
      account_id: (c.account_id as string | null) ?? null,
      amount: Number(c.amount),
      occurred_on: String(c.occurred_on),
      note: (c.note as string | null) ?? null,
    };
    if (!contributionsByGoal.has(gc.goal_id))
      contributionsByGoal.set(gc.goal_id, []);
    contributionsByGoal.get(gc.goal_id)!.push(gc);
    goalSums.set(gc.goal_id, (goalSums.get(gc.goal_id) ?? 0) + gc.amount);
  }

  const goals: Goal[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    target_amount: Number(g.target_amount),
    color: (g.color as string) || "#8b5cf6",
    deadline: (g.deadline as string | null) ?? null,
    archived: Boolean(g.archived),
    current_amount: goalSums.get(g.id as string) ?? 0,
    contributions: contributionsByGoal.get(g.id as string) ?? [],
  }));

  const budgetItems: BudgetItem[] = (budgetRes.data ?? []).map((b) => {
    const id = b.id as string;
    const allocated = allocSum.get(id) ?? 0;
    const spent = spentByBudget.get(id) ?? 0;
    return {
      id,
      kind: b.kind as "income" | "expense",
      computation: b.computation as "fixed" | "variable" | "percentage",
      label: b.label as string,
      amount: b.amount != null ? Number(b.amount) : null,
      percentage: b.percentage != null ? Number(b.percentage) : null,
      category: (b.category as string | null) ?? null,
      active: Boolean(b.active),
      target_amount:
        b.target_amount != null ? Number(b.target_amount) : null,
      saved_amount: Math.max(0, allocated - spent),
      spent_amount: spent,
      allocations: allocByBudget.get(id) ?? [],
    };
  });

  const investments: Investment[] = (investmentsRes.data ?? []).map((i) => {
    const accField = i.accounts as
      | { name: string }
      | { name: string }[]
      | null;
    const accInfo = Array.isArray(accField) ? accField[0] : accField;
    return {
      id: i.id as string,
      name: i.name as string,
      kind: i.kind as Investment["kind"],
      color: (i.color as string) || "#22d3ee",
      invested_amount: Number(i.invested_amount ?? 0),
      current_value: Number(i.current_value ?? 0),
      account_id: (i.account_id as string | null) ?? null,
      account_name: accInfo?.name ?? null,
      note: (i.note as string | null) ?? null,
      archived: Boolean(i.archived),
    };
  });

  let bank = 0,
    cash = 0,
    savings = 0;
  for (const a of accountsWithBalance) {
    if (a.archived) continue;
    if (a.type === "bank") bank += a.balance;
    else if (a.type === "cash") cash += a.balance;
    else savings += a.balance;
  }

  let receivablesOpen = 0;
  let debtsOpen = 0;
  for (const l of loans) {
    if (l.status !== "open") continue;
    if (l.kind === "receivable") receivablesOpen += l.remaining;
    else debtsOpen += l.remaining;
  }

  let investedTotal = 0;
  let investedCurrent = 0;
  for (const i of investments) {
    if (i.archived) continue;
    investedTotal += i.invested_amount;
    investedCurrent += i.current_value;
  }
  const investmentGain = investedCurrent - investedTotal;

  const netWorth =
    bank + cash + savings + receivablesOpen + investedCurrent - debtsOpen;

  return {
    accounts: accountsWithBalance,
    transactions,
    loans,
    goals,
    budgetItems,
    investments,
    totals: {
      bank,
      cash,
      savings,
      receivablesOpen,
      debtsOpen,
      investments: investedCurrent,
      investmentGain,
      netWorth,
      monthIncome,
      monthExpense,
      prevMonthIncome,
      prevMonthExpense,
    },
  };
}
