import { expenseGroupCategoryOptions } from "~/constants";
import { isCcReserve } from "~/utils/creditCardTransaction";

const TYPE_COLORS = {
  credit_card: "#6366f1",
  monthly: "#f43f5e",
  other: "#10b981",
  personal: "#f59e0b",
};

const BAR_COLORS = [
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
  "#ec4899",
];

export function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function groupTypeLabel(type) {
  const c = expenseGroupCategoryOptions.find((o) => o.value === type);
  return c?.label ?? "Other";
}

export function groupTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

/** Money that counts as spend (not income, reserve, or card payment). */
export function spendAmount(transaction) {
  const type = String(transaction?.type ?? "").toLowerCase();
  if (type !== "expense") return 0;
  const sub = String(transaction?.subtype ?? "").trim().toLowerCase();
  if (sub === "reserve" || sub === "payment") return 0;
  return Number(transaction.amount) || 0;
}

export function buildGroupSpendRows(transactions, groups) {
  const map = new Map();

  for (const t of transactions ?? []) {
    const gid = t.group_id ? String(t.group_id) : "";
    if (!gid) continue;
    const amount = spendAmount(t);
    if (!amount) continue;
    const nested = t.expense_groups;
    const fromList = (groups ?? []).find((g) => String(g.id) === gid);
    const type = nested?.type ?? fromList?.type ?? "other";
    if (!map.has(gid)) {
      map.set(gid, {
        id: gid,
        name: nested?.name ?? fromList?.name ?? "Group",
        type,
        typeLabel: groupTypeLabel(type),
        spent: 0,
        count: 0,
        href: `/groups/${gid}`,
      });
    }
    const row = map.get(gid);
    row.spent += amount;
    row.count += 1;
  }

  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

export function buildTypeSlices(rows) {
  const totals = {};
  for (const row of rows) {
    const key = row.type || "other";
    totals[key] = (totals[key] || 0) + row.spent;
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  let start = 0;
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([type, amount]) => {
      const pct = total ? (amount / total) * 100 : 0;
      const slice = {
        type,
        label: groupTypeLabel(type),
        amount,
        pct,
        color: groupTypeColor(type),
        start,
        end: start + pct,
      };
      start += pct;
      return slice;
    });
}

export function conicGradient(slices) {
  if (!slices.length) return "conic-gradient(#e5e7eb 0 100%)";
  const stops = slices.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(", ");
  return `conic-gradient(${stops})`;
}

export function barColor(index) {
  return BAR_COLORS[index % BAR_COLORS.length];
}

export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function txGroupType(transaction, groups) {
  if (transaction?.expense_groups?.type) return transaction.expense_groups.type;
  const gid = String(transaction?.group_id ?? "");
  const g = (groups ?? []).find((row) => String(row.id) === gid);
  return g?.type ?? "other";
}

export function monthlyRemaining(transactions, groups) {
  const monthlyIds = new Set(
    (groups ?? [])
      .filter((g) => (g.type ?? g.category) === "monthly")
      .map((g) => String(g.id)),
  );
  let allocated = 0;
  let spent = 0;
  let sawMonthly = monthlyIds.size > 0;
  for (const t of transactions ?? []) {
    const type = txGroupType(t, groups);
    if (type !== "monthly" && !monthlyIds.has(String(t.group_id ?? ""))) continue;
    sawMonthly = true;
    const ty = String(t.type ?? "").toLowerCase();
    if (ty === "income") allocated += Number(t.amount) || 0;
    else spent += spendAmount(t);
  }
  return { allocated, spent, left: allocated - spent, hasMonthly: sawMonthly };
}

export function cardNeedToSave(transactions, groups) {
  const cardIds = new Set(
    (groups ?? [])
      .filter((g) => (g.type ?? g.category) === "credit_card")
      .map((g) => String(g.id)),
  );
  let spent = 0;
  let reserved = 0;
  let hasCard = cardIds.size > 0;
  for (const t of transactions ?? []) {
    const type = txGroupType(t, groups);
    if (type !== "credit_card" && !cardIds.has(String(t.group_id ?? ""))) continue;
    hasCard = true;
    if (isCcReserve(t)) reserved += Number(t.amount) || 0;
    else spent += spendAmount(t);
  }
  return {
    spent,
    reserved,
    need: Math.max(0, spent - reserved),
    hasCard,
  };
}

export function fastestRisingGroup(currentRows, previousRows) {
  const prevMap = new Map((previousRows ?? []).map((r) => [r.id, r.spent]));
  let best = null;
  for (const row of currentRows ?? []) {
    const prev = prevMap.get(row.id) || 0;
    const delta = row.spent - prev;
    if (delta <= 0) continue;
    if (!best || delta > best.delta) {
      best = { name: row.name, id: row.id, href: row.href, delta, spent: row.spent, prev };
    }
  }
  return best;
}

export function spendByDay(transactions) {
  const map = {};
  for (const t of transactions ?? []) {
    const day = String(t.created_at ?? "").split("T")[0];
    if (!day) continue;
    map[day] = (map[day] || 0) + spendAmount(t);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}
