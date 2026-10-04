import { computed, unref } from "vue";
import { groupTransactionsByDate } from "~/utils/transactions";

/**
 * @param {import('vue').Ref | import('vue').ComputedRef} period
 * @param {object} [options]
 * @param {'mine' | 'group'} [options.scope='mine']
 * @param {import('vue').Ref<string>|string|null} [options.groupId]
 */
export const useFetchTransactions = async (period, options = {}) => {
  const supabase = useSupabaseClient();

  const scope = options.scope ?? "mine";

  const asyncKey = computed(() => {
    const p = unref(period);
    const from = p?.from?.getTime?.() ?? "";
    const to = p?.to?.getTime?.() ?? "";
    const gid = unref(options.groupId) ?? "";
    return ["transactions", from, to, scope, gid].join(":");
  });

  const {
    data: transactions,
    pending,
    refresh: refreshTransactions,
  } = await useCachedAsyncData(
    asyncKey,
    async () => {
      const p = unref(period);
      if (!p?.from || !p?.to) return [];
      const gid = unref(options.groupId);
      if (scope === "group" && !gid) return [];
      const select =
        scope === "group"
          ? "*, expense_groups(name), profiles(full_name, avatar_url)"
          : "*, expense_groups(name)";

      let query = supabase
        .from("transactions")
        .select(select)
        .gte("created_at", p.from.toISOString())
        .lte("created_at", p.to.toISOString())
        .order("created_at", { ascending: false });

      if (scope === "group") {
        query = query.eq("group_id", gid);
      } else if (scope === "mine") {
        query = query.is("group_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data ?? [];
    },
    { watch: [asyncKey], ttl: 5 * 60 * 1000 },
  );

  const income = computed(() =>
    (transactions.value ?? []).filter((t) => t.type === "Income"),
  );
  const expense = computed(() =>
    (transactions.value ?? []).filter((t) => t.type === "Expense"),
  );
  const investment = computed(() =>
    (transactions.value ?? []).filter((t) => t.type === "Investment"),
  );
  const saving = computed(() =>
    (transactions.value ?? []).filter((t) => t.type === "Saving"),
  );

  const incomeCount = computed(() => income.value.length);
  const expenseCount = computed(() => expense.value.length);
  const investmentCount = computed(() => investment.value.length);
  const savingCount = computed(() => saving.value.length);

  const incomeTotal = computed(() =>
    income.value.reduce((acc, t) => acc + t.amount, 0),
  );
  const expenseTotal = computed(() =>
    expense.value.reduce((acc, t) => acc + t.amount, 0),
  );
  const investmentTotal = computed(() =>
    investment.value.reduce((acc, t) => acc + t.amount, 0),
  );
  const savingTotal = computed(() =>
    saving.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const transactionGroupedByDate = computed(() =>
    groupTransactionsByDate(transactions.value ?? []),
  );

  return {
    transactions: {
      all: transactions,
      grouped: {
        byDate: transactionGroupedByDate,
      },
      income,
      expense,
      investment,
      saving,
      incomeCount,
      expenseCount,
      investmentCount,
      savingCount,
      incomeTotal,
      expenseTotal,
      investmentTotal,
      savingTotal,
    },
    pending,
    refreshTransactions,
  };
};
