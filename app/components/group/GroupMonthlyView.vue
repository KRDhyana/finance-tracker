<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-3 mt-5">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold">{{ groupTitle || "Monthly group" }}</h1>
      </div>
      <div class="flex items-center justify-between gap-3 mt-2">
        <div class="flex items-center gap-3">
          <UFormField name="memberFilter">
            <USelectMenu
              v-model="memberFilterUserId"
              value-key="id"
              :items="memberFilterItems"
              placeholder="All members"
              class="w-56"
            >
              <template #item-trailing="{ item }">
                <UBadge
                  v-if="isMemberItemGroupOwner(item)"
                  color="primary"
                  variant="subtle"
                  class="shrink-0 text-[11px] font-medium"
                >
                  Group owner
                </UBadge>
              </template>
            </USelectMenu>
          </UFormField>
        </div>
        <UButton
          icon="i-heroicons-funnel"
          color="neutral"
          variant="outline"
          aria-label="Filter"
          class="shrink-0 rounded-full"
          @click="isFilterModalOpen = true"
        />
      </div>
    </div>

    <p
      v-if="hasConfiguredCycle && !cycleMenuItems.length && !pending"
      class="text-sm text-amber-700 dark:text-amber-300"
    >
      Could not build expense periods from these cycle days. Check that start and end days are
      valid (1–31).
    </p>

    <section class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 sm:gap-6 lg:gap-10">
      <Trend
        color="green"
        title="Allocated Funds"
        :amount="currentSummary.incomeTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Total Spends"
        :amount="currentSummary.expenseTotal"
        :loading="pending"
      />
      <Trend
        :color="currentSummary.incomeTotal - currentSummary.expenseTotal >= 0 ? 'green' : 'text-red-600 dark:text-red-400'"
        :title="currentSummary.incomeTotal - currentSummary.expenseTotal >= 0 ? 'Remaining Amount' : 'Debt'"
        :amount="Math.abs(currentSummary.incomeTotal - currentSummary.expenseTotal)"
        :loading="pending"
      />
    </section>

    <section class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div class="min-w-0 flex-1 space-y-1">
        <h2 class="text-lg font-bold">Transactions</h2>
        <div
          v-if="!pending && filteredList.length"
          class="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap"
        >
          <div class="font-medium text-gray-900 dark:text-white mr-1">{{ filterPeriodLabel }}</div> &middot;
          <div>{{ currentSummary.incomeCount }} allocated funds &middot; {{ currentSummary.expenseCount }} spends</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <TransactionModal
          v-model:isOpen="isAddOpen"
          :group-id="groupId"
          :group-members="members"
          @saved="refreshData"
        />
        <UButton
          color="neutral"
          icon="i-heroicons-plus-circle-solid"
          variant="outline"
          label="Add"
          @click="isAddOpen = true"
        />
      </div>
    </section>

    <section v-if="filteredList.length" class="space-y-0">
      <div v-for="(dayTx, date) in byDate" :key="String(date)">
        <DailyTransactionSummary :date="String(date)" :transactions="dayTx" />
        <Transaction
          v-for="t in dayTx"
          :key="t.id"
          :transaction="t"
          :group-id="groupId"
          :group-owner-user-id="ownerUserId"
          :member-names-by-user-id="memberNameByUserId"
          :show-group-badge="false"
          show-owner-badge
          @deleted="refreshData"
          @edited="refreshData"
        />
      </div>
    </section>
    <p
      v-else-if="!pending"
      class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6"
    >
      No transactions in this period for this filter.
    </p>
    <div v-else>
      <USkeleton v-for="i in 4" :key="i" class="h-12 w-full mb-2" />
    </div>

    <UModal v-model:open="isFilterModalOpen" title="Select expense period">
      <template #body>
        <UFormField
          v-if="cycleMenuItems.length"
          name="cycle"
          :label="hasConfiguredCycle ? 'Expense period' : 'Month (calendar)'"
        >
          <USelectMenu
            v-model="tempSelectedPeriodId"
            value-key="id"
            :items="cycleMenuItems"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="dateFilter"
          label="Specific date"
          class="mt-4"
        >
          <USelectMenu
            v-model="tempSelectedDateId"
            value-key="id"
            :items="[{ id: 'ALL', label: 'All days in period' }, ...tempPeriodDates]"
            placeholder="All days in period"
            class="w-full"
          />
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
import { format, subMonths, endOfMonth, startOfMonth, eachDayOfInterval } from "date-fns";
import {
  listCardStatementCycleMenuItems,
} from "~/utils/billingCycle";
import {
  groupTransactionsByDate,
  filterTransactionsByUserId,
  summarizeTransactions,
} from "~/utils/transactions";

const props = defineProps({
  groupId: { type: String, required: true },
  groupTitle: { type: String, default: "" },
  members: { type: Array, default: () => [] },
  /** From `expense_groups.cycle_start_day` when type is monthly */
  cycleStartDay: { type: [Number, String], default: null },
  /** From `expense_groups.cycle_end_day` when type is monthly */
  cycleEndDay: { type: [Number, String], default: null },
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const isAddOpen = ref(false);
const memberFilterUserId = ref("ALL");
const selectedPeriodId = ref("");
const selectedDateId = ref("ALL");
const isFilterModalOpen = ref(false);
const tempSelectedPeriodId = ref("");
const tempSelectedDateId = ref("ALL");

const tempPeriodDates = computed(() => {
  const row = cycleMenuItems.value.find((c) => c.id === tempSelectedPeriodId.value);
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

watch(tempSelectedPeriodId, () => {
  tempSelectedDateId.value = "ALL";
});

watch(isFilterModalOpen, (open) => {
  if (open) {
    tempSelectedPeriodId.value = selectedPeriodId.value;
    tempSelectedDateId.value = selectedDateId.value;
  }
});

const applyFilter = () => {
  selectedPeriodId.value = tempSelectedPeriodId.value;
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

function isMemberItemGroupOwner(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      item.isGroupOwner &&
      item.id !== "ALL",
  );
}

const memberFilterItems = computed(() => {
  const rows = (props.members ?? [])
    .filter((m) => m && m.user_id)
    .map((m) => ({
      label: memberDisplayName(m),
      id: m.user_id,
      isGroupOwner: m.role === "owner",
    }));
  return [{ label: "All members", id: "ALL", isGroupOwner: false }, ...rows];
});

const memberNameByUserId = computed(() => {
  const map = {};
  for (const m of props.members ?? []) {
    if (m?.user_id) map[m.user_id] = memberDisplayName(m);
  }
  return map;
});

const hasConfiguredCycle = computed(() => {
  const s = Math.floor(Number(props.cycleStartDay));
  const e = Math.floor(Number(props.cycleEndDay));
  return (
    Number.isFinite(s) &&
    s >= 1 &&
    s <= 31 &&
    Number.isFinite(e) &&
    e >= 1 &&
    e <= 31
  );
});

const cycleStartLabel = computed(() =>
  hasConfiguredCycle.value ? String(Math.floor(Number(props.cycleStartDay))) : "",
);
const cycleEndLabel = computed(() =>
  hasConfiguredCycle.value ? String(Math.floor(Number(props.cycleEndDay))) : "",
);

/** Calendar fallback: last 12 months, newest first (same ordering as statement menu). */
const calendarMonthMenu = (() => {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const d = subMonths(new Date(), i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    out.push({
      start,
      end,
      id: format(start, "yyyy-MM"),
      label: format(start, "MMMM yyyy"),
    });
  }
  return out;
})();

const { data: rpcCycles, refresh: refreshCycles } = await useAsyncData(
  () => `group-cycles-rpc-${props.groupId}`,
  async () => {
    if (!import.meta.client) return [];
    const { data, error } = await supabase.rpc('get_monthly_group_cycles', {
      p_group_id: props.groupId
    });
    if (error) {
      console.error(error);
      return [];
    }
    return (data ?? []).map(x => x.billing_cycle_key);
  },
  { watch: [() => props.groupId] }
);

const allCycleMenuItems = computed(() => {
  if (hasConfiguredCycle.value) {
    const s = Math.floor(Number(props.cycleStartDay));
    const e = Math.floor(Number(props.cycleEndDay));
    return listCardStatementCycleMenuItems(s, e, 24, new Date());
  }
  return calendarMonthMenu;
});

const cycleMenuItems = computed(() => {
  const all = allCycleMenuItems.value;
  const keys = new Set(rpcCycles.value ?? []);
  return all.filter((item, index) => index === 0 || keys.has(item.id));
});

watch(
  () => cycleMenuItems.value.map((x) => x.id).join("|"),
  () => {
    const items = cycleMenuItems.value;
    if (!items.length) return;
    if (!items.some((i) => i.id === selectedPeriodId.value)) {
      selectedPeriodId.value = items[0].id;
    }
  },
  { immediate: true },
);

const selectedCycleRow = computed(
  () =>
    cycleMenuItems.value.find((x) => x.id === selectedPeriodId.value) ??
    cycleMenuItems.value[0],
);

const selectedCycleLabel = computed(() => selectedCycleRow.value?.label ?? "");

const filterPeriodLabel = computed(() => {
  if (selectedDateId.value !== "ALL") {
    return format(new Date(selectedDateId.value + 'T12:00:00'), "MMM d, yyyy");
  }
  return selectedCycleLabel.value;
});

const currentPeriod = computed(() => {
  const c = selectedCycleRow.value;
  if (!c?.start || !c?.end) return { from: new Date(0), to: new Date(0) };
  return { from: c.start, to: c.end };
});



const {
  transactions: { all: currentAll },
  pending: pendingCurrent,
  refreshTransactions: refreshC,
} = await useFetchTransactions(currentPeriod, {
  scope: "group",
  groupId: computed(() => props.groupId),
});



const pending = computed(() => pendingCurrent.value);

const refreshData = () => {
  refreshC();
  refreshCycles();
};

const currentFiltered = computed(() => {
  let list = filterTransactionsByUserId(currentAll.value, memberFilterUserId.value);
  if (selectedDateId.value !== "ALL") {
    list = list.filter((t) => t.created_at?.startsWith(selectedDateId.value));
  }
  return list;
});


const currentSummary = computed(() =>
  summarizeTransactions(currentFiltered.value),
);


const filteredList = computed(() => currentFiltered.value);
const byDate = computed(() => groupTransactionsByDate(filteredList.value));

const filterNote = computed(() => {
  if (memberFilterUserId.value === "ALL") return null;
  const m = memberFilterItems.value.find(
    (x) => x.id === memberFilterUserId.value,
  );
  const label = filterPeriodLabel.value || "this period";
  return `Showing ${m?.label ?? "this member"} in ${label}.`;
});
</script>
