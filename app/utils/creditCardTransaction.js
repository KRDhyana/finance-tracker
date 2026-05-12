/**
 * Credit card lines: DB uses type `expense` and optional subtype
 * (null = card spend; `subtype` keys: reserve, payment). Legacy: type Reserve/Settle/Expense; old subtype casing still matches.
 */

function typeLower(t) {
  return String(t?.type ?? "").toLowerCase();
}

export function isCcSpend(t) {
  if (!t) return false;
  const sub = t.subtype;
  const subLower = String(sub ?? "").trim().toLowerCase();
  const subEmpty = sub == null || String(sub).trim() === "";
  if (typeLower(t) === "expense" && (subEmpty || subLower === "split")) {
    return true;
  }
  return t.type === "Expense" && (sub == null || String(sub).trim() === "" || subLower === "split");
}

export function isCcSplitSpend(t) {
  if (!t) return false;
  if (typeLower(t) !== "expense") return false;
  const sub = String(t.subtype ?? "").trim().toLowerCase();
  if (sub === "split") return true;
  const desc = String(t.description ?? "").trim().toLowerCase();
  return desc === "[split]" || desc.startsWith("[split] ");
}

export function isCcReserve(t) {
  if (!t) return false;
  if (t.type === "Reserve") return true;
  if (
    typeLower(t) === "expense" &&
    t.subtype != null &&
    t.subtype !== "" &&
    String(t.subtype).toLowerCase() === "reserve"
  ) {
    return true;
  }
  return false;
}

export function isCcPaymentToOwner(t) {
  if (!t) return false;
  if (t.type === "Settle") return true;
  if (
    typeLower(t) === "expense" &&
    t.subtype != null &&
    t.subtype !== "" &&
    String(t.subtype).toLowerCase() === "payment"
  ) {
    return true;
  }
  return false;
}

/** Card spend or member repayment to owner — can be bulk-selected to create one reserve line. */
export function isCcSpendOrMemberPayment(t) {
  return Boolean(t && (isCcSpend(t) || isCcPaymentToOwner(t)));
}

/** For form initial state: spend | reserve | payment */
export function creditLineKindFromRow(t) {
  if (isCcReserve(t)) return "reserve";
  if (isCcPaymentToOwner(t)) return "payment";
  return "spend";
}

/** @param {string} [kind] spend | reserve | payment */
export function buildCreditLinePayload(partial) {
  const { creditLineKind, amount, created_at, description, category, id, group_id } = partial;
  const kind = creditLineKind === "reserve" || creditLineKind === "payment" ? creditLineKind : "spend";
  const sub =
    kind === "spend" ? null : kind === "reserve" ? "reserve" : "payment";
  return {
    id: id ?? undefined,
    group_id: group_id ?? null,
    amount,
    type: "expense",
    subtype: sub,
    description: description ?? null,
    created_at,
    category: kind === "spend" ? (category ?? null) : null,
  };
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Sum of reserve (savings) lines for one user in a credit card scope, before applying payment.
 * @param {object} supabase
 * @param {{ groupId: string, creditCardId: string, billingCycleKey: string, userId: string }} scope
 * @returns {Promise<number>}
 */
export async function fetchGrossSavingsInCreditCardScope(supabase, scope) {
  const { groupId, creditCardId, billingCycleKey, userId } = scope;
  if (!groupId || !creditCardId || !billingCycleKey || !userId) return 0;
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, subtype, user_id")
    .eq("group_id", groupId)
    .eq("credit_card_id", creditCardId)
    .eq("billing_cycle_key", billingCycleKey)
    .eq("user_id", userId);
  if (error) throw error;
  const sum = (data ?? []).reduce(
    (a, t) => a + (isCcReserve(t) ? (Number(t.amount) || 0) : 0),
    0,
  );
  return r2(sum);
}

export async function mirrorReserveToMonthlyExpense(supabase, amount, created_at, description) {
  console.log("Mirroring reserve to monthly expense:", amount, created_at, description);
  if (!amount) return;
  const { data: groups, error } = await supabase.rpc("get_user_groups");
  console.log("Groups:", groups);
  if (error || !groups) return;
  const monthlyGroup = groups.find(g => (g.type === "monthly"));
  if (!monthlyGroup) return;

  const payload = {
    group_id: monthlyGroup.id,
    amount: amount,
    type: "Expense",
    category: "Credit card",
    description: description ? `[Auto] ${description}` : "[Auto] Reserve debit",
    created_at: created_at,
  };
  
  await supabase.from("transactions").insert(payload);
}

