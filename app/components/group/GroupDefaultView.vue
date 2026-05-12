<template>
  <div class="space-y-10">
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4 mt-5">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-3xl font-extrabold">{{ groupTitle }}</h1>
          <UBadge
            v-if="groupCategoryLabel"
            color="neutral"
            variant="subtle"
            class="shrink-0"
          >
            {{ groupCategoryLabel }}
          </UBadge>
          <div v-if="membersPending" class="flex gap-2 flex-wrap">
            <USkeleton class="h-10 w-32 rounded-full" />
          </div>
          <div
            v-else-if="owner"
            class="h-fit inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
          >
            <UAvatar
              v-if="avatarSrc(owner)"
              :src="avatarSrc(owner)"
              size="xs"
            />
            <span class="font-medium">{{ memberDisplayName(owner) }}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UFormField name="memberFilter" class="min-w-48">
            <USelectMenu
              v-model="memberFilterUserId"
              value-key="id"
              :items="memberFilterItems"
              placeholder="All members"
              class="w-56"
            />
          </UFormField>
          <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-16">
      <Trend
        color="green"
        title="Income"
        :amount="currentSummary.incomeTotal"
        :last-amount="previousSummary.incomeTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Expense"
        :amount="currentSummary.expenseTotal"
        :last-amount="previousSummary.expenseTotal"
        :loading="pending"
      />
      <Trend
        color="green"
        title="Investments"
        :amount="currentSummary.investmentTotal"
        :last-amount="previousSummary.investmentTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Saving"
        :amount="currentSummary.savingTotal"
        :last-amount="previousSummary.savingTotal"
        :loading="pending"
      />
    </section>

    <section class="flex justify-between mb-10">
      <div>
        <h2>Transactions</h2>
        <div class="text-gray-500 dark:text-gray-400">
          You have {{ currentSummary.incomeCount }} incomes and
          {{ currentSummary.expenseCount }} expenses this period
        </div>
      </div>
      <div>
        <TransactionModal
          :group-id="groupId"
          :group-members="members"
          @saved="refreshData"
          v-model:isOpen="isOpen"
        />
        <UButton
          color="neutral"
          icon="i-heroicons-plus-circle-solid"
          variant="outline"
          label="Add"
          @click="isOpen = true"
        />
      </div>
    </section>

    <section v-if="!pending">
      <div v-for="(transactionsOnDay, date) in byDateFiltered" :key="date">
        <DailyTransactionSummary
          :date="date"
          :transactions="transactionsOnDay"
        />
        <Transaction
          v-for="transaction in transactionsOnDay"
          :key="transaction.id"
          :transaction="transaction"
          :group-id="groupId"
          :member-names-by-user-id="memberNameByUserId"
          :show-group-badge="false"
          show-owner-badge
          @deleted="refreshData"
          @edited="refreshData"
        />
      </div>
    </section>
    <section v-else>
      <USkeleton class="h-10 w-full mb-2" v-for="i in 4" :key="i" />
    </section>
  </div>
</template>

<script setup>
import { transactionViewOptions } from "~/constants";
import {
  filterTransactionsByUserId,
  groupTransactionsByDate,
  summarizeTransactions,
} from "~/utils/transactions";

const props = defineProps({
  groupId: { type: String, required: true },
  groupTitle: { type: String, default: "Group" },
  groupCategoryLabel: { type: String, default: null },
  members: { type: Array, default: () => [] },
  membersPending: { type: Boolean, default: false },
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const selectedView = ref(
  user.value?.user_metadata?.transaction_view ?? transactionViewOptions[1],
);
const isOpen = ref(false);
const memberFilterUserId = ref("ALL");

const { currentPeriod, previousPeriod } = useSelectedTimePeriod(selectedView);

const {
  transactions: { all: currentAll },
  pending,
  refresh: refreshCurrent,
} = await useFetchTransactions(currentPeriod, {
  scope: "group",
  groupId: computed(() => props.groupId),
});

const {
  transactions: { all: previousAll },
  refresh: refreshPrevious,
} = await useFetchTransactions(previousPeriod, {
  scope: "group",
  groupId: computed(() => props.groupId),
});

const refreshData = () => {
  refreshCurrent();
  refreshPrevious();
};

const memberDisplayName = (m) => {
  const name = m.profiles?.full_name;
  if (name) return name;
  if (m.user_id) return `Member …${String(m.user_id).slice(-6)}`;
  return "Member";
};

const avatarSrc = (m) => {
  const path = m.profiles?.avatar_url;
  if (!path) return undefined;
  if (String(path).startsWith("http")) return String(path);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl;
};

const owner = computed(() =>
  (props.members ?? []).find((m) => m.role === "owner"),
);

const memberFilterItems = computed(() => [
  { label: "All members", id: "ALL" },
  ...(props.members ?? [])
    .filter((m) => m && m.user_id)
    .map((m) => ({
      label: memberDisplayName(m),
      id: m.user_id,
    })),
]);

const memberNameByUserId = computed(() => {
  const map = {};
  for (const m of props.members ?? []) {
    if (m?.user_id) map[m.user_id] = memberDisplayName(m);
  }
  return map;
});

const currentFiltered = computed(() =>
  filterTransactionsByUserId(
    currentAll.value,
    memberFilterUserId.value,
  ),
);

const previousFiltered = computed(() =>
  filterTransactionsByUserId(
    previousAll.value,
    memberFilterUserId.value,
  ),
);

const currentSummary = computed(() =>
  summarizeTransactions(currentFiltered.value),
);
const previousSummary = computed(() =>
  summarizeTransactions(previousFiltered.value),
);

const byDateFiltered = computed(() =>
  groupTransactionsByDate(currentFiltered.value),
);

watch(selectedView, () => {
  refreshData();
});
</script>
