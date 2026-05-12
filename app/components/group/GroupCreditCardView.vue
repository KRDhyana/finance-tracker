<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-3 mt-5">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-3xl font-extrabold">
          {{ groupTitle || "Credit card" }}
        </h1>
      </div>
      <div class="flex items-center justify-between gap-3 mt-2">
        <div class="flex items-center gap-3">
          <UFormField name="memberFilter">
            <USelectMenu v-model="memberFilterUserId" value-key="id" :items="memberFilterItems"
              placeholder="All members" class="w-56">
              <template #item-trailing="{ item }">
                <UBadge v-if="isMemberItemCardOwner(item)" color="primary" variant="subtle"
                  class="shrink-0 text-[11px] font-medium">
                  Card owner
                </UBadge>
              </template>
            </USelectMenu>
          </UFormField>
        </div>
        <UButton icon="i-heroicons-funnel" color="neutral" variant="outline" aria-label="Filter"
          class="shrink-0 rounded-full" @click="isFilterModalOpen = true" />
      </div>
    </div>

    <p v-if="!cardMenuItems.length && !cardsPending" class="text-sm text-amber-700 dark:text-amber-300">
      No active credit cards. Add one under
      <NuxtLink to="/cards" class="font-medium underline">Credit cards</NuxtLink> first.
    </p>

    <section v-if="memberFilterUserId === 'ALL' && hasCard"
      class="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:gap-10">
      <Trend color="red" title="Total Spends" :amount="allMembersView.spent" :loading="txLoading" />
      <Trend :color="allMembersView.saved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'" title="Total Saved"
        :amount="allMembersView.saved" :loading="txLoading" />
      <Trend color="green" title="Available to Repay" :amount="allMembersView.availableToPayCard"
        :loading="txLoading" />
      <Trend color="red" title="Debt (spent - saved)" :amount="allMembersView.debtDepth" :loading="txLoading" />
    </section>

    <section v-else-if="memberFilterUserId === ownerUserId && ownerUserId && hasCard"
      class="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:grid-cols-5 sm:gap-10 lg:gap-14">
      <Trend color="red" :title="ownerTrendTitles.spends" :amount="ownerAsMemberView.mySpent" :loading="txLoading" />
      <Trend :color="ownerAsMemberView.mySaved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'"
        :title="ownerTrendTitles.savings" :amount="ownerAsMemberView.mySaved" :loading="txLoading" />
      <Trend
        :color="ownerAsMemberView.balanceToSavings > 0 ? 'red' : 'green'"
        :title="ownerTrendTitles.needToSave"
        :amount="ownerAsMemberView.balanceToSavings"
        :loading="txLoading"
      />
      <Trend color="text-amber-600 dark:text-amber-400" :title="ownerTrendTitles.amountReceivable"
        :amount="ownerAsMemberView.shouldGetFromOthers" :loading="txLoading" />
      <Trend color="green" :title="ownerTrendTitles.amountReceived" :amount="ownerAsMemberView.gotFromOthers" :loading="txLoading" />
    </section>

    <section v-else-if="hasCard && memberFilterUserId && memberFilterUserId !== 'ALL'"
      class="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:gap-10 lg:gap-14">
      <Trend color="red" :title="nonOwnerTrendTitles.expenses" :amount="nonOwnerView.spent" :loading="txLoading" />
      <Trend :color="nonOwnerView.saved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'" :title="nonOwnerTrendTitles.savings"
        :amount="nonOwnerView.saved" :loading="txLoading" />
      <Trend
        :color="nonOwnerView.balanceToSavings > 0 ? 'red' : 'green'"
        :title="nonOwnerTrendTitles.needToSave"
        :amount="nonOwnerView.balanceToSavings"
        :loading="txLoading"
      />
      <Trend color="green" :title="nonOwnerTrendTitles.paid" :amount="nonOwnerView.paidToOwner" :loading="txLoading" />
      <Trend color="red" :title="nonOwnerTrendTitles.owed" :amount="nonOwnerView.stillOwesOwner" :loading="txLoading" />
    </section>

    <section v-if="hasCard" class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div class="min-w-0 flex-1 space-y-3">
        <div>
          <h2 class="text-lg font-bold">Activity</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-900 dark:text-white mr-1">{{ filterPeriodLabel }}</span>
          </p>
        </div>
        <div v-if="filteredList.length"
          class="flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center">
          <div v-if="memberFilterUserId === (user?.id || user?.sub)" class="max-w-md">
            <USwitch v-model="spendToReserveMode" :disabled="!canAddLine" label="Spends to reserves" />
          </div>
          <div v-else></div>
          <div class="flex items-center gap-2">
            <TransactionModal v-model:isOpen="isAddOpen" :group-id="groupId" :group-owner-user-id="ownerUserId"
              :group-members="members"
              :credit-card-id="selectedCardId" :billing-cycle-key="selectedCycleKey"
              :card-billing-cycle-start-day="selectedCard?.billing_cycle_start_day"
              :card-billing-cycle-end-day="selectedCard?.billing_cycle_end_day" credit-card @saved="refreshData" />
            <UButton color="neutral" icon="i-heroicons-plus-circle-solid" variant="outline" label="Add"
              :disabled="!canAddLine" @click="isAddOpen = true" />
          </div>
        </div>
        <UButton v-if="spendToReserveMode && selectedSpendCount > 0" color="primary" variant="solid"
          :loading="bulkReserveSaving" :disabled="!canAddLine || bulkReserveSaving" class="shrink-0"
          @click="openBulkReserveModal">
          {{ bulkReserveButtonLabel }}
        </UButton>
      </div>
    </section>

    <section v-if="hasCard && filteredList.length" class="space-y-0">
      <div v-for="(dayTx, date) in byDate" :key="String(date)">
        <DailyTransactionSummary :date="String(date)" :transactions="dayTx" credit-line-net />
        <Transaction v-for="t in dayTx" :key="t.id" :transaction="t" :group-id="groupId"
          :group-owner-user-id="ownerUserId" :member-names-by-user-id="memberNameByUserId" :show-group-badge="false"
          :show-owner-badge="memberFilterUserId === 'ALL'" credit-line :credit-card-id="selectedCardId" :billing-cycle-key="selectedCycleKey"
          :card-billing-cycle-start-day="selectedCard?.billing_cycle_start_day"
          :card-billing-cycle-end-day="selectedCard?.billing_cycle_end_day"
          :pick-spend-for-reserve-mode="spendToReserveMode" :credit-spend-selected="isSpendSelected(t)"
          :is-fully-reserved="(reservedAmountByTxId[t.id] || 0) >= (Number(t.amount) || 0)"
          :reserved-amount="reservedAmountByTxId[t.id] || 0"
          @toggle-credit-spend-select="(on) => setSpendSelected(t.id, on)" @deleted="refreshData"
          @edited="refreshData" />
      </div>
    </section>
    <p v-else-if="hasCard && !txLoading"
      class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
      No lines in this statement. Pick another period or add a line.
    </p>
    <div v-else-if="txLoading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
    </div>

    <UModal v-model:open="bulkReserveDateModalOpen" title="Save money for selected lines" class="sm:max-w-md">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Reserve an amount for the {{ selectedSpendCount }} selected line{{ selectedSpendCount === 1 ? "" : "s" }}.
          The available unreserved amount is
          <span class="font-medium tabular-nums">{{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(bulkReserveDefaultAmount) }}</span>.
        </p>
        <UFormField label="Reserve Amount" required class="mb-4">
          <AmountCalculatorInput v-model="bulkReserveAmount" placeholder="Reserve amount" input-class="w-full max-w-xs" />
        </UFormField>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton color="neutral" variant="outline" label="Cancel" :disabled="bulkReserveSaving"
            @click="bulkReserveDateModalOpen = false" />
          <UButton color="primary" variant="solid" label="Add reserve" :loading="bulkReserveSaving"
            :disabled="bulkReserveSaving || !bulkReserveAmount || bulkReserveAmount <= 0" @click="confirmBulkReserve" />
        </div>
      </template>
    </UModal>
    <UModal v-model:open="isFilterModalOpen" title="Filter transactions">
      <template #body>
        <UFormField v-if="cardMenuItems.length" name="cardFilter" label="Card">
          <USelectMenu v-model="tempSelectedCardId" value-key="id" :items="cardMenuItems" placeholder="Select card"
            class="w-full" />
        </UFormField>
        <UFormField v-if="cycleMenuItems.length" name="statementCycle" label="Statement" class="mt-4">
          <USelectMenu v-model="tempSelectedCycleKey" value-key="id" :items="cycleMenuItems" class="w-full" />
        </UFormField>
        <UFormField name="dateFilter" label="Specific date" class="mt-4">
          <USelectMenu v-model="tempSelectedDateId" value-key="id"
            :items="[{ id: 'ALL', label: 'All days in statement' }, ...tempPeriodDates]"
            placeholder="All days in statement" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-3 mt-6">
          <UButton color="neutral" variant="outline" label="Cancel" @click="isFilterModalOpen = false" />
          <UButton color="neutral" variant="solid" label="OK" @click="applyFilter" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { format, eachDayOfInterval } from "date-fns";
import {
  listCardStatementCycleMenuItems,
  listRecentBillingCycleKeyItems,
  getBillingCycleKeyForTransactionDate,
} from "~/utils/billingCycle";
import {
  isCcSpend,
  isCcReserve,
  isCcPaymentToOwner,
  buildCreditLinePayload,
  mirrorReserveToMonthlyExpense,
} from "~/utils/creditCardTransaction";
import {
  groupTransactionsByDate,
  filterTransactionsByUserId,
} from "~/utils/transactions";

const props = defineProps({
  groupId: { type: String, required: true },
  groupTitle: { type: String, default: "" },
  members: { type: Array, default: () => [] },
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { toastSuccess, toastError } = useAppToast();

const isAddOpen = ref(false);
/** When on, user can tick card spend rows and merge them into one reserve line. */
const spendToReserveMode = ref(false);
const selectedSpendIds = ref([]);
const bulkReserveSaving = ref(false);
const bulkReserveDateModalOpen = ref(false);
const bulkReserveAmount = ref(0);
const memberFilterUserId = ref("ALL");
const selectedCardId = ref(null);
const selectedCycleKey = ref("");
const selectedDateId = ref("ALL");

const isFilterModalOpen = ref(false);
const tempSelectedCardId = ref(null);
const tempSelectedCycleKey = ref("");
const tempSelectedDateId = ref("ALL");

const effectiveCardId = computed(() => isFilterModalOpen.value ? tempSelectedCardId.value : selectedCardId.value);

const tempPeriodDates = computed(() => {
  const row = cycleMenuItems.value.find((c) => c.id === tempSelectedCycleKey.value);
  if (!row?.start || !row?.end) return [];
  try {
    const days = eachDayOfInterval({ start: row.start, end: row.end });
    return days.map((d) => {
      const val = format(d, "yyyy-MM-dd");
      return { id: val, label: format(d, "MMM d, yyyy") };
    });
  } catch (e) {
    return [];
  }
});

watch(tempSelectedCycleKey, () => {
  tempSelectedDateId.value = "ALL";
});

watch(isFilterModalOpen, (open) => {
  if (open) {
    tempSelectedCardId.value = selectedCardId.value;
    tempSelectedCycleKey.value = selectedCycleKey.value;
    tempSelectedDateId.value = selectedDateId.value;
  }
});

const applyFilter = () => {
  selectedCardId.value = tempSelectedCardId.value;
  selectedCycleKey.value = tempSelectedCycleKey.value;
  selectedDateId.value = tempSelectedDateId.value;
  isFilterModalOpen.value = false;
};

const memberDisplayName = (m) => {
  const n = m?.profiles?.full_name;
  if (n) return n;
  if (m?.user_id) return `Member …${String(m.user_id).slice(-6)}`;
  return "Member";
};

const avatarSrc = (m) => {
  const path = m?.profiles?.avatar_url;
  if (!path) return undefined;
  if (String(path).startsWith("http")) return String(path);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl;
};

const owner = computed(() =>
  (props.members ?? []).find((m) => m && m.role === "owner"),
);
const ownerUserId = computed(() => owner.value?.user_id ?? "");
const cardOwnerDisplayName = computed(() =>
  owner.value ? memberDisplayName(owner.value) : "",
);

/** Select menu item may be a string in edge cases; only member objects carry `isCardOwner`. */
function isMemberItemCardOwner(item) {
  return Boolean(
    item &&
    typeof item === "object" &&
    item.isCardOwner &&
    item.id !== "ALL",
  );
}

const memberNameByUserId = computed(() => {
  const map = {};
  for (const m of props.members ?? []) {
    if (m?.user_id) map[m.user_id] = memberDisplayName(m);
  }
  return map;
});

const memberFilterItems = computed(() => {
  const rows = (props.members ?? [])
    .filter((m) => m && m.user_id)
    .map((m) => ({
      label: memberDisplayName(m),
      id: m.user_id,
      isCardOwner: m.role === "owner",
    }));

  return [{ label: "All members", id: "ALL", isCardOwner: false }, ...rows];
});

watch(
  memberFilterItems,
  (items) => {
    if (items.length && !items.some((i) => i.id === memberFilterUserId.value)) {
      memberFilterUserId.value = items[0].id;
    }
  },
  { immediate: true }
);

watch(memberFilterUserId, (val) => {
  if (val === 'ALL') {
    spendToReserveMode.value = false;
    selectedSpendIds.value = [];
  }
});

const { data: cardRows, pending: cardsPending, refresh: refreshCards } =
  await useAsyncData(
    () => `credit-cards-${props.groupId}`,
    async () => {
      if (!import.meta.client) return [];
      const { data, error } = await supabase.from("credit_cards").select("*");
      if (error) {
        console.error(error);
        return [];
      }
      return data ?? [];
    },
    { watch: () => [props.groupId] },
  );

const { data: rpcCycles, refresh: refreshCycles } = await useAsyncData(
  () => `group-cycles-rpc-${props.groupId}-${effectiveCardId.value ?? 'none'}`,
  async () => {
    if (!import.meta.client) return [];
    if (!effectiveCardId.value) return [];
    const { data, error } = await supabase.rpc('get_group_cycles', {
      p_group_id: props.groupId,
      p_card_id: effectiveCardId.value
    });
    if (error) {
      console.error(error);
      return [];
    }
    return (data ?? []).map(x => x.billing_cycle_key);
  },
  { watch: [() => props.groupId, effectiveCardId] }
);

const allCycleMenuItems = computed(() => {
  if (!effectiveCardId.value) {
    return listRecentBillingCycleKeyItems(20);
  }
  const row = (cardRows.value ?? []).find((c) => c.id === effectiveCardId.value);
  if (!row) {
    return listRecentBillingCycleKeyItems(20);
  }
  const s = row.billing_cycle_start_day;
  const e = row.billing_cycle_end_day;
  return listCardStatementCycleMenuItems(
    s ?? 1,
    e ?? 1,
    20,
    new Date(),
  );
});

const cycleMenuItems = computed(() => {
  const all = allCycleMenuItems.value;
  const keys = new Set(rpcCycles.value ?? []);
  return all.filter((item, index) => index === 0 || keys.has(item.id));
});

watch(
  () => cycleMenuItems.value,
  (items) => {
    if (!items?.length) return;
    if (isFilterModalOpen.value) {
      if (!items.some((x) => x.id === tempSelectedCycleKey.value)) {
        tempSelectedCycleKey.value = items[0].id;
      }
    } else {
      if (!items.some((x) => x.id === selectedCycleKey.value)) {
        selectedCycleKey.value = items[0].id;
      }
    }
  },
  { immediate: true, deep: true },
);

const cardMenuItems = computed(() =>
  (cardRows.value ?? []).map((c) => ({
    id: c.id,
    label: c.is_deleted ? `${c.name ?? "Card"} (Inactive)` : c.name ?? "Card",
    isInactive: c.is_deleted,
  })),
);

const selectedCard = computed(
  () =>
    (cardRows.value ?? []).find((c) => c.id === selectedCardId.value) ?? null,
);

watch(
  cardMenuItems,
  (items) => {
    if (!items.length) {
      selectedCardId.value = null;
      return;
    }
    if (!items.some((x) => x.id === selectedCardId.value)) {
      selectedCardId.value = items[0].id;
    }
  },
  { immediate: true },
);

const hasCard = computed(() => !!selectedCardId.value);
const selectedCardIsInactive = computed(() => selectedCard.value?.is_deleted);
const canAddLine = computed(() => hasCard.value && !!selectedCycleKey.value && !selectedCardIsInactive.value);

const currentTxKey = computed(() => {
  if (!props.groupId || !selectedCardId.value || !selectedCycleKey.value) {
    return "cc-cur:none";
  }
  return `cc-cur:${props.groupId}:${selectedCardId.value}:${selectedCycleKey.value}`;
});

const { data: currentList, pending: pCur, refresh: rCur } = await useAsyncData(
  currentTxKey,
  async () => {
    if (!import.meta.client) return [];
    if (!props.groupId || !selectedCardId.value || !selectedCycleKey.value) {
      return [];
    }
    const { data, error } = await supabase
      .from("transactions")
      .select("*, profiles(full_name, avatar_url)")
      .eq("group_id", props.groupId)
      .eq("credit_card_id", selectedCardId.value)
      .eq("billing_cycle_key", selectedCycleKey.value)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data ?? [];
  },
  { watch: [currentTxKey] },
);

const { data: reservationsList, refresh: rRes } = await useAsyncData(
  () => `cc-res:${currentTxKey.value}`,
  async () => {
    if (!import.meta.client) return [];
    if (!props.groupId || !selectedCardId.value || !selectedCycleKey.value) {
      return [];
    }
    const { data, error } = await supabase
      .from('transaction_reservations')
      .select('*')
      .eq('group_id', props.groupId)
      .eq('credit_card_id', selectedCardId.value)
      .eq('billing_cycle_key', selectedCycleKey.value);
    
    if (error) {
      console.error(error);
      return [];
    }
    return data ?? [];
  },
  { watch: [currentTxKey] }
);

const { data: batchesList, refresh: rBatches } = await useAsyncData(
  () => `cc-batches:${currentTxKey.value}`,
  async () => {
    if (!import.meta.client) return [];
    if (!props.groupId || !selectedCardId.value || !selectedCycleKey.value) {
      return [];
    }
    const { data, error } = await supabase
      .from('reservation_batches')
      .select('*')
      .eq('group_id', props.groupId)
      .eq('credit_card_id', selectedCardId.value)
      .eq('billing_cycle_key', selectedCycleKey.value);
    
    if (error) {
      console.error(error);
      return [];
    }
    return data ?? [];
  },
  { watch: [currentTxKey] }
);

const reservedAmountByTxId = computed(() => {
  const map = {};
  for (const r of reservationsList.value ?? []) {
    map[r.source_transaction_id] = (map[r.source_transaction_id] || 0) + Number(r.reserved_amount);
  }
  return map;
});

const txLoading = computed(() => pCur.value);

const refreshData = () => {
  rCur();
  rRes();
  rBatches();
  refreshCards();
  refreshCycles();
};

const r2 = (n) => Math.round(n * 100) / 100;

/** Calendar day from `<input type="date">` value (local Y-M-D). */
function localDateFromInput(created) {
  if (!created) return new Date();
  const raw = String(created).split("T")[0];
  const p = raw.split("-");
  if (p.length < 3) return new Date(created);
  const y = Number(p[0]);
  const m = Number(p[1]);
  const d = Number(p[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(created);
  }
  return new Date(y, m - 1, d);
}

function userSum(list, kind, userId) {
  const oId = ownerUserId.value;
  const kindPred =
    kind === "spend"
      ? (t) => isCcSpend(t) || (t.type === "Expense" && t.subtype !== "reserve" && t.subtype !== "payment")
      : kind === "reserve"
        ? isCcReserve
        : isCcPaymentToOwner;
  return r2(
    (list ?? [])
      .filter(
        (t) =>
          t &&
          kindPred(t) &&
          t.user_id &&
          (kind !== "payment" || !oId || t.user_id !== oId) &&
          (!userId || t.user_id === userId),
      )
      .reduce((a, t) => a + (t.amount || 0), 0),
  );
}

const nonOwnerIds = computed(() =>
  (props.members ?? [])
    .filter((m) => m && m.user_id && m.user_id !== ownerUserId.value)
    .map((m) => m.user_id),
);

const reserveTransactions = computed(() => {
  return (batchesList.value ?? []).map(b => {
    const userId = b.reserved_by || b.user_id || b.created_by;
    const member = (props.members ?? []).find(m => m.user_id === userId);
    return {
      id: b.id,
      type: "Expense",
      subtype: "reserve",
      amount: Number(b.total_amount || b.amount || 0),
      created_at: b.created_at,
      description: b.description || "Reserve batch",
      user_id: userId,
      group_id: b.group_id,
      credit_card_id: b.credit_card_id,
      billing_cycle_key: b.billing_cycle_key,
      profiles: member?.profiles || null,
    };
  });
});

const combinedList = computed(() => {
  const normalTx = (currentList.value ?? []).filter(t => t.subtype !== "reserve");
  const all = [...normalTx, ...reserveTransactions.value];
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all;
});

const currentFilteredByDate = computed(() => {
  if (selectedDateId.value === "ALL") return combinedList.value;
  return combinedList.value.filter((t) => t.created_at?.startsWith(selectedDateId.value));
});

const settlementRows = computed(() => {
  const cur = currentFilteredByDate.value;
  const oId = ownerUserId.value;
  if (!oId) return [];
  return nonOwnerIds.value.map((userId) => {
    const memberSpend = userSum(cur, "spend", userId);
    const grossReserve = userSum(cur, "reserve", userId);
    const paidToOwner = userSum(cur, "payment", userId);
    const mrow = (props.members ?? []).find((m) => m.user_id === userId);
    const netSavings = r2(grossReserve - paidToOwner);
    const stillOwedToOwner = r2(Math.max(0, memberSpend - paidToOwner));
    return {
      userId,
      name: mrow ? memberDisplayName(mrow) : "Member",
      memberSpend,
      res: netSavings,
      paid: paidToOwner,
      pending: stillOwedToOwner,
    };
  });
});

const byUserSpent = computed(() => {
  const map = { [ownerUserId.value || "x"]: 0 };
  (props.members ?? []).forEach((m) => {
    if (m?.user_id) map[m.user_id] = 0;
  });
  for (const t of currentFilteredByDate.value) {
    if ((isCcSpend(t) || (t.type === "Expense" && t.subtype !== "reserve" && t.subtype !== "payment")) && t.user_id) {
      map[t.user_id] = (map[t.user_id] ?? 0) + (t.amount || 0);
    }
  }
  for (const k of Object.keys(map)) {
    map[k] = r2(map[k]);
  }
  return map;
});

/**
 * @param {unknown[]} [list] transactions
 * @returns {Record<string, number>} per-user: reserve total minus payments to owner (may be negative)
 */
function netSavedByUserMap(list) {
  const oId = ownerUserId.value;
  const keys = { [oId || "x"]: 0 };
  (props.members ?? []).forEach((m) => {
    if (m?.user_id) keys[m.user_id] = 0;
  });
  const gross = { ...keys };
  for (const t of list ?? []) {
    if (isCcReserve(t) && t.user_id) {
      if (!Object.prototype.hasOwnProperty.call(gross, t.user_id)) {
        gross[t.user_id] = 0;
      }
      gross[t.user_id] = (gross[t.user_id] ?? 0) + (t.amount || 0);
    }
  }
  const paidOut = { ...keys };
  for (const t of list ?? []) {
    if (isCcPaymentToOwner(t) && t.user_id && t.user_id !== oId) {
      if (!Object.prototype.hasOwnProperty.call(paidOut, t.user_id)) {
        paidOut[t.user_id] = 0;
      }
      paidOut[t.user_id] = (paidOut[t.user_id] ?? 0) + (t.amount || 0);
    }
  }
  const map = {};
  for (const k of new Set([...Object.keys(gross), ...Object.keys(paidOut)])) {
    map[k] = r2((gross[k] ?? 0) - (paidOut[k] ?? 0));
  }
  return map;
}

const byUserSaved = computed(() => netSavedByUserMap(currentFilteredByDate.value));

const allMembersView = computed(() => {
  const curL = currentFilteredByDate.value;
  const oId = ownerUserId.value;
  const sumE = (L) =>
    r2(
      (L ?? []).filter((t) => isCcSpend(t) || (t.type === "Expense" && t.subtype !== "reserve" && t.subtype !== "payment"))
        .reduce((a, t) => a + t.amount, 0),
    );
  const totalNetSaved = (L) => {
    const m = netSavedByUserMap(L);
    return r2(Object.values(m).reduce((a, n) => a + n, 0));
  };
  const fromOthers = r2(
    (settlementRows.value ?? []).reduce(
      (a, b) => a + (b.paid ?? 0),
      0,
    ),
  );
  const spent = sumE(curL);
  const saved = totalNetSaved(curL);
  const availableToPayCard = r2(
    (byUserSaved.value[oId] ?? 0) + fromOthers,
  );
  return {
    spent,
    saved,
    availableToPayCard,
    /** Spend not offset by positive net reserved (ignore negative net “saved” so overpay doesn’t inflate this). */
    debtDepth: r2(spent - Math.max(0, saved)),
  };
});

const ownerAsMemberView = computed(() => {
  const oId = ownerUserId.value;
  if (!oId) {
    return {
      mySpent: 0,
      mySaved: 0,
      balanceToSavings: 0,
      shouldGetFromOthers: 0,
      gotFromOthers: 0,
    };
  }
  const rows = settlementRows.value;
  const shouldGetFromOthers = r2(
    rows.reduce((a, b) => a + b.pending, 0),
  );
  const gotFromOthers = r2(rows.reduce((a, b) => a + b.paid, 0));
  return {
    mySpent: r2(byUserSpent.value[oId] ?? 0),
    mySaved: r2(byUserSaved.value[oId] ?? 0),
    balanceToSavings: r2((byUserSpent.value[oId] ?? 0) - (byUserSaved.value[oId] ?? 0)),
    shouldGetFromOthers,
    gotFromOthers,
  };
});

const nonOwnerView = computed(() => {
  const id = memberFilterUserId.value;
  const s = byUserSpent.value;
  const sv = byUserSaved.value;
  const row = settlementRows.value.find((r) => r.userId === id);
  return {
    spent: r2(s[id] ?? 0),
    saved: r2(sv[id] ?? 0),
    balanceToSavings: r2((s[id] ?? 0) - (sv[id] ?? 0)),
    paidToOwner: r2(row?.paid ?? 0),
    stillOwesOwner: r2(row?.pending ?? 0),
  };
});

const currentViewerUserId = computed(() => {
  const id = user.value?.id ?? user.value?.sub;
  return id ? String(id) : "";
});

const isViewingOwnMemberDetails = computed(() => {
  if (!memberFilterUserId.value || memberFilterUserId.value === "ALL") return false;
  if (!currentViewerUserId.value) return false;
  return String(memberFilterUserId.value) === currentViewerUserId.value;
});

const isViewingOwnerAsSelf = computed(() => {
  if (!ownerUserId.value || !currentViewerUserId.value) return false;
  return String(ownerUserId.value) === currentViewerUserId.value;
});

const ownerTrendTitles = computed(() => {
  if (isViewingOwnerAsSelf.value) {
    return {
      spends: "Your Spends",
      savings: "Your Savings",
      needToSave: "Need to Save",
      amountReceivable: "Your Amount Receivable",
      amountReceived: "Your Amount Received",
    };
  }

  return {
    spends: "Spends",
    savings: "Savings",
    needToSave: "Need to Save",
    amountReceivable: "Amount Receivable",
    amountReceived: "Amount Received",
  };
});

const nonOwnerTrendTitles = computed(() => {
  if (isViewingOwnMemberDetails.value) {
    return {
      expenses: "Your Expenses",
      savings: "Your Savings",
      needToSave: "Need to Save",
      paid: "You Paid",
      owed: "You Owed",
    };
  }

  return {
    expenses: "Expenses",
    savings: "Savings",
    needToSave: "Need to Save",
    paid: "Paid",
    owed: "Owed",
  };
});

const filteredList = computed(() =>
  filterTransactionsByUserId(
    currentFilteredByDate.value,
    memberFilterUserId.value,
  ),
);
const byDate = computed(() => groupTransactionsByDate(filteredList.value));

const selectedCycleRow = computed(
  () => cycleMenuItems.value.find((x) => x.id === selectedCycleKey.value) ?? cycleMenuItems.value[0]
);
const selectedCycleLabel = computed(() => selectedCycleRow.value?.label ?? "");

const selectedCardRow = computed(() => (cardRows.value ?? []).find((c) => c.id === selectedCardId.value));

const filterPeriodLabel = computed(() => {
  let lbl = selectedCycleLabel.value;
  if (selectedDateId.value !== "ALL") {
    lbl = format(new Date(selectedDateId.value + 'T12:00:00'), "MMM d, yyyy");
  }
  return selectedCardRow.value ? `${selectedCardRow.value.name} \u00B7 ${lbl}` : lbl;
});

/** Plain card spend lines only (checkbox + bulk reserve source). */
function isCcCardSpendOnly(t) {
  if (!t?.id) return false;
  if (isCcReserve(t) || isCcPaymentToOwner(t)) return false;
  if (!isCcSpend(t)) return false;
  
  const reserved = reservedAmountByTxId.value[t.id] || 0;
  if (reserved >= (Number(t.amount) || 0)) return false;
  
  return true;
}

const selectedReserveSourceRows = computed(() => {
  const idSet = new Set(selectedSpendIds.value.map(String));
  return (filteredList.value ?? []).filter(
    (t) => t && idSet.has(String(t.id)) && isCcCardSpendOnly(t),
  );
});

const bulkReserveDefaultAmount = computed(() => {
  return r2(selectedReserveSourceRows.value.reduce((a, t) => {
    const reserved = reservedAmountByTxId.value[t.id] || 0;
    const available = Math.max(0, (Number(t.amount) || 0) - reserved);
    return a + available;
  }, 0));
});

function isSpendSelected(t) {
  return selectedSpendIds.value.includes(String(t.id));
}

function setSpendSelected(id, on) {
  const s = String(id);
  const cur = new Set(selectedSpendIds.value);
  if (on) cur.add(s);
  else cur.delete(s);
  selectedSpendIds.value = Array.from(cur);
}

const selectedSpendCount = computed(
  () => selectedReserveSourceRows.value.length,
);

const bulkReserveButtonLabel = computed(() => {
  const n = selectedSpendCount.value;
  if (n <= 0) return "";
  if (n === 1) return "Save money for this transaction";
  return `Save money for these ${n} transactions`;
});

function openBulkReserveModal() {
  const rows = selectedReserveSourceRows.value;
  selectedSpendIds.value = rows.map((t) => String(t.id));
  if (!rows.length) {
    toastError({
      title: "Nothing selected",
      description: "Select one or more card transactions.",
    });
    return;
  }
  bulkReserveAmount.value = bulkReserveDefaultAmount.value;
  bulkReserveDateModalOpen.value = true;
}

async function confirmBulkReserve() {
  const amount = Number(bulkReserveAmount.value) || 0;
  if (amount <= 0) {
    toastError({ title: "Invalid amount", description: "Amount must be greater than zero." });
    return;
  }

  if (!props.groupId || !selectedCardId.value || !selectedCycleKey.value) {
    toastError({
      title: "Missing context",
      description: "Pick a card and statement first.",
    });
    return;
  }
  const rows = selectedReserveSourceRows.value;
  if (!rows.length) {
    toastError({
      title: "Nothing to save",
      description: "Select one or more card spend lines.",
    });
    return;
  }
  const uids = [
    ...new Set(
      rows
        .map((r) =>
          r.user_id != null && r.user_id !== ""
            ? String(r.user_id).trim()
            : "",
        )
        .filter(Boolean),
    ),
  ];
  if (uids.length !== 1) {
    toastError({
      title: "Invalid selection",
      description:
        uids.length === 0
          ? "Each selected line needs a member on the row."
          : "Select card spends from one member only.",
    });
    return;
  }

  bulkReserveSaving.value = true;
  try {
    const { data, error } = await supabase.rpc('create_reservation_batch', {
      p_group_id: props.groupId,
      p_credit_card_id: selectedCardId.value,
      p_billing_cycle_key: selectedCycleKey.value,
      p_total_amount: amount,
      p_transaction_ids: rows.map(t => t.id)
    });

    if (error) {
      console.error(error);
      throw error;
    }

    toastSuccess({
      title: "Savings recorded",
      description: `Reserved ${amount} across ${rows.length} line${rows.length === 1 ? "" : "s"}.`,
    });
    selectedSpendIds.value = [];
    spendToReserveMode.value = false;
    bulkReserveDateModalOpen.value = false;
    refreshData();
  } catch (e) {
    toastError({
      title: "Could not add reserve",
      description: e instanceof Error ? e.message : String(e),
    });
  } finally {
    bulkReserveSaving.value = false;
  }
}

watch(spendToReserveMode, (on) => {
  if (!on) {
    selectedSpendIds.value = [];
    bulkReserveDateModalOpen.value = false;
  }
});

watch([selectedCardId, selectedCycleKey, memberFilterUserId], () => {
  selectedSpendIds.value = [];
});

</script>
