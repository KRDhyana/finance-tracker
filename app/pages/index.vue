<template>
  <div class="space-y-6 sm:space-y-8">
    <section class="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
      <h1 class="text-lg sm:text-4xl font-extrabold tracking-tight truncate min-w-0">Dashboard</h1>
      <div class="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
        <UButton
          to="/groups"
          color="primary"
          variant="solid"
          size="xs"
          icon="i-heroicons-user-group"
          aria-label="Groups"
          class="sm:hidden"
        />
        <UButton
          to="/groups"
          color="primary"
          variant="solid"
          label="Groups"
          class="hidden sm:inline-flex"
        />
        <UButton
          to="/cards"
          color="primary"
          variant="solid"
          size="xs"
          icon="i-heroicons-credit-card"
          aria-label="Cards"
          class="sm:hidden"
        />
        <UButton
          to="/cards"
          color="primary"
          variant="solid"
          label="Cards"
          class="hidden sm:inline-flex"
        />
        <USelectMenu
          v-model="selectedView"
          :items="transactionViewOptions"
          size="xs"
          class="w-[5.75rem] sm:w-32"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          aria-label="Refresh"
          :loading="refreshing"
          @click="refreshData"
        />
      </div>
    </section>

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <article
        v-for="kpi in kpis"
        :key="kpi.title"
        class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ kpi.title }}</p>
        <USkeleton v-if="summaryLoading" class="mt-2 h-8 w-24" />
        <p v-else class="mt-1 text-lg sm:text-2xl font-extrabold tabular-nums tracking-tight truncate">
          {{ kpi.value }}
        </p>
        <p
          v-if="!summaryLoading && kpi.hint"
          class="mt-1 text-xs"
          :class="kpi.hintClass || 'text-gray-500 dark:text-gray-400'"
        >
          {{ kpi.hint }}
        </p>
      </article>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <article
        class="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 class="font-bold mb-4">Where the money went</h2>
        <div v-if="summaryLoading" class="space-y-3">
          <USkeleton v-for="i in 4" :key="i" class="h-8 w-full" />
        </div>
        <p
          v-else-if="!spendRows.length"
          class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6"
        >
          No group spend in this period. Open a group to add lines.
        </p>
        <ul v-else class="space-y-3">
          <li v-for="(row, index) in spendRows" :key="row.id">
            <NuxtLink :to="row.href" class="block">
              <div class="flex items-baseline justify-between gap-2 text-sm">
                <span class="font-medium truncate">{{ row.name }}</span>
                <span class="tabular-nums shrink-0 font-semibold">{{ formatInr(row.spent) }}</span>
              </div>
              <div class="mt-1.5 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: `${barWidth(row.spent)}%`,
                    backgroundColor: barColor(index),
                  }"
                />
              </div>
              <p class="mt-1 text-[11px] text-gray-500">
                {{ row.typeLabel }} · {{ sharePct(row.spent) }}% of spend
              </p>
            </NuxtLink>
          </li>
        </ul>
      </article>

      <article
        class="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 class="font-bold mb-4">By group type</h2>
        <div v-if="summaryLoading" class="flex justify-center py-8">
          <USkeleton class="size-40 rounded-full" />
        </div>
        <div v-else-if="!typeSlices.length" class="text-sm text-gray-500">Nothing to chart yet.</div>
        <div v-else class="flex flex-col sm:flex-row lg:flex-col items-center gap-5">
          <div
            class="relative size-40 shrink-0"
            role="img"
            :aria-label="typeSlices.map((s) => `${s.label} ${formatInr(s.amount)}`).join(', ')"
          >
            <div class="size-40 rounded-full" :style="{ background: donutBg }" />
            <div
              class="absolute inset-[1.65rem] rounded-full bg-white dark:bg-gray-900 flex items-center justify-center"
            >
              <span class="text-xs font-semibold tabular-nums text-center px-2">
                {{ formatInr(totalSpend) }}
              </span>
            </div>
          </div>
          <ul class="w-full space-y-2 text-sm">
            <li
              v-for="slice in typeSlices"
              :key="slice.type"
              class="flex items-center justify-between gap-2"
            >
              <span class="flex items-center gap-2 min-w-0">
                <span class="size-2.5 rounded-full shrink-0" :style="{ backgroundColor: slice.color }" />
                <span class="truncate">{{ slice.label }}</span>
              </span>
              <span class="tabular-nums shrink-0">{{ formatInr(slice.amount) }}</span>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <article
      class="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <h2 class="font-bold mb-1">Daily spend</h2>
      <p class="text-xs text-gray-500 mb-4">Group expenses this {{ periodWord }}</p>
      <div v-if="summaryLoading">
        <USkeleton class="h-28 w-full" />
      </div>
      <p v-else-if="!daySeries.length" class="text-sm text-gray-500">No daily movement yet.</p>
      <svg
        v-else
        viewBox="0 0 320 96"
        class="w-full h-28 text-emerald-500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :points="sparkPoints"
        />
      </svg>
    </article>
  </div>
</template>

<script setup>
import { transactionViewOptions } from "~/constants";
import {
  barColor,
  buildGroupSpendRows,
  buildTypeSlices,
  cardNeedToSave,
  conicGradient,
  fastestRisingGroup,
  formatInr,
  monthlyRemaining,
  percentChange,
  spendByDay,
} from "~/utils/dashboard";

const user = useSupabaseUser();
const { listMyMemberships } = useExpenseGroups();

const selectedView = ref(
  user.value?.user_metadata?.transaction_view ?? transactionViewOptions[1],
);

const { currentPeriod, previousPeriod } = useSelectedTimePeriod(selectedView);

const periodWord = computed(() =>
  String(selectedView.value || "month").toLowerCase().replace(/ly$/, ""),
);

const { data: memberships, pending: groupsPending, refresh: refreshGroups } =
  await useCachedAsyncData(
    "dashboard-groups",
    async () => {
      const { data, error } = await listMyMemberships();
      if (error) throw error;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      return list.map((raw) => ({
        id: raw.id ?? raw.group_id,
        name: raw.name ?? raw.group_name,
        type: raw.type ?? raw.category ?? "other",
      }));
    },
    { ttl: 10 * 60 * 1000 },
  );

const {
  transactions: { all: groupTx },
  pending: groupPending,
  refreshTransactions: refreshGroupTx,
} = await useFetchTransactions(currentPeriod, { scope: "groups" });

const {
  transactions: { all: prevGroupTx },
  pending: prevGroupPending,
  refreshTransactions: refreshPrevGroupTx,
} = await useFetchTransactions(previousPeriod, { scope: "groups" });

const refreshing = computed(
  () => groupPending.value || prevGroupPending.value || groupsPending.value,
);

const summaryLoading = computed(
  () =>
    (groupPending.value && groupTx.value == null) ||
    (groupsPending.value && memberships.value == null),
);

const spendRows = computed(() =>
  buildGroupSpendRows(groupTx.value, memberships.value),
);

const prevSpendRows = computed(() =>
  buildGroupSpendRows(prevGroupTx.value, memberships.value),
);

const totalSpend = computed(() => spendRows.value.reduce((s, r) => s + r.spent, 0));
const prevTotal = computed(() => prevSpendRows.value.reduce((s, r) => s + r.spent, 0));
const maxBar = computed(() => Math.max(...spendRows.value.map((r) => r.spent), 1));
const typeSlices = computed(() => buildTypeSlices(spendRows.value));
const donutBg = computed(() => conicGradient(typeSlices.value));

const monthly = computed(() => monthlyRemaining(groupTx.value, memberships.value));
const card = computed(() => cardNeedToSave(groupTx.value, memberships.value));
const rising = computed(() => fastestRisingGroup(spendRows.value, prevSpendRows.value));
const spendDelta = computed(() => percentChange(totalSpend.value, prevTotal.value));

const kpis = computed(() => {
  const spendHint =
    spendDelta.value === 0
      ? `Same as last ${periodWord.value}`
      : spendDelta.value > 0
        ? `${spendDelta.value}% more than last ${periodWord.value}`
        : `${Math.abs(spendDelta.value)}% less than last ${periodWord.value}`;

  const monthlyKpi = monthly.value.hasMonthly
    ? {
        title: "Left in monthly",
        value: formatInr(monthly.value.left),
        hint:
          monthly.value.left >= 0
            ? "Still available to spend"
            : `Over by ${formatInr(Math.abs(monthly.value.left))}`,
        hintClass:
          monthly.value.left >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-500",
      }
    : { title: "Left in monthly", value: "—", hint: "No monthly group" };

  const cardKpi = card.value.hasCard
    ? {
        title: "Still to save on cards",
        value: formatInr(card.value.need),
        hint:
          card.value.need > 0
            ? "Card spend not yet reserved"
            : "Reserves cover card spend",
        hintClass:
          card.value.need > 0
            ? "text-rose-500"
            : "text-emerald-600 dark:text-emerald-400",
      }
    : { title: "Still to save on cards", value: "—", hint: "No credit card group" };

  const risingKpi = rising.value
    ? {
        title: "Watch this group",
        value: rising.value.name,
        hint: `+${formatInr(rising.value.delta)} vs last ${periodWord.value}`,
        hintClass: "text-rose-500",
      }
    : {
        title: "Watch this group",
        value: "—",
        hint: "No group spent more than last period",
      };

  return [
    {
      title: "Spent this period",
      value: formatInr(totalSpend.value),
      hint: spendHint,
      hintClass:
        spendDelta.value > 0
          ? "text-rose-500"
          : "text-emerald-600 dark:text-emerald-400",
    },
    monthlyKpi,
    cardKpi,
    risingKpi,
  ];
});

const daySeries = computed(() => spendByDay(groupTx.value ?? []));

const sparkPoints = computed(() => {
  const series = daySeries.value;
  if (!series.length) return "";
  const max = Math.max(...series.map((d) => d.amount), 1);
  return series
    .map((d, i) => {
      const x = series.length === 1 ? 160 : (i / (series.length - 1)) * 320;
      const y = 88 - (d.amount / max) * 80;
      return `${x},${y}`;
    })
    .join(" ");
});

function barWidth(spent) {
  return Math.max(4, (spent / maxBar.value) * 100);
}

function sharePct(spent) {
  if (!totalSpend.value) return 0;
  return Math.round((spent / totalSpend.value) * 100);
}

const refreshData = () => {
  refreshGroups();
  refreshGroupTx();
  refreshPrevGroupTx();
};

watch(selectedView, () => {
  refreshData();
});
</script>
