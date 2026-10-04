const ABOUT_RATIO = 0.1;
const ABOUT_MIN = 1;

export function transactionDay(transaction) {
  return String(transaction?.created_at ?? "").split("T")[0] || "";
}

function amountMatches(amount, op, target) {
  const n = Number(amount) || 0;
  const a = Number(target);
  if (!Number.isFinite(a) || a <= 0) return true;
  if (op === "above") return n > a;
  if (op === "below") return n < a;
  const tol = Math.max(a * ABOUT_RATIO, ABOUT_MIN);
  return Math.abs(n - a) <= tol;
}

/**
 * @param {unknown[]} transactions
 * @param {{
 *   query?: string,
 *   amountOp?: 'above' | 'below' | 'about',
 *   amount?: string | number | null,
 *   whenMode?: 'any' | 'day' | 'range',
 *   date?: string,
 *   from?: string,
 *   to?: string,
 * }} filters
 * @param {Record<string, string>} [namesByUserId]
 */
export function filterGroupTransactions(transactions, filters, namesByUserId = {}) {
  const list = transactions ?? [];
  const query = String(filters?.query ?? "").trim().toLowerCase();
  const amount = filters?.amount;
  const hasAmount = amount !== "" && amount != null && Number(amount) > 0;
  const whenMode = filters?.whenMode ?? "any";
  const date = whenMode === "day" ? String(filters?.date ?? "") : "";
  const from = whenMode === "range" ? String(filters?.from ?? "") : "";
  const to = whenMode === "range" ? String(filters?.to ?? "") : "";

  if (!query && !hasAmount && !date && !from && !to) return list;

  return list.filter((t) => {
    if (query) {
      const desc = String(t.description ?? "").toLowerCase();
      const category = String(t.category ?? "").toLowerCase();
      const member = String(namesByUserId[t.user_id] ?? "").toLowerCase();
      if (!desc.includes(query) && !category.includes(query) && !member.includes(query)) {
        return false;
      }
    }
    if (hasAmount && !amountMatches(t.amount, filters.amountOp || "about", amount)) {
      return false;
    }
    const day = transactionDay(t);
    if (date && day !== date) return false;
    if (from && day && day < from) return false;
    if (to && day && day > to) return false;
    return true;
  });
}

export function groupSearchIsActive(filters) {
  const query = String(filters?.query ?? "").trim();
  const amount = Number(filters?.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const whenMode = filters?.whenMode ?? "any";
  const hasDay = whenMode === "day" && Boolean(filters?.date);
  const hasRange =
    whenMode === "range" && (Boolean(filters?.from) || Boolean(filters?.to));
  return Boolean(query || hasAmount || hasDay || hasRange);
}
