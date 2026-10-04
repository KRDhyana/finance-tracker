<template>
  <section class="flex items-center justify-between flex-wrap gap-4">
    <h1 class="text-4xl font-extrabold">Summary</h1>
    <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
  </section>
  <div class="flex items-center gap-3 mb-10 mt-5">
    <UButton color="primary" variant="solid" label="Groups" @click="goToGroups" />
    <UButton color="primary" variant="solid" label="Cards" @click="goToCards" />
  </div>
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-16 mb-10">
    <Trend color="green" title="Income" :amount="incomeTotal" :last-amount="previousIncomeTotal" :loading="summaryLoading" />
    <Trend color="red" title="Expense" :amount="expenseTotal" :last-amount="previousExpenseTotal" :loading="summaryLoading" />
    <Trend color="green" title="Investments" :amount="investmentTotal" :last-amount="previousInvestmentTotal"
      :loading="summaryLoading" />
    <Trend color="red" title="Saving" :amount="savingTotal" :last-amount="previousSavingTotal" :loading="summaryLoading" />
  </section>

  <section class="flex justify-between mb-10">
    <div>
      <h2>Transactions</h2>
      <div class="text-gray-500 dark:text-gray-400">
        You have {{ incomeCount }} incomes and {{ expenseCount }} expenses this
        period
      </div>
    </div>
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-path" aria-label="Refresh"
        :loading="pending || previousPending" @click="refreshData" />
      <TransactionModal @saved="refreshData" v-model:isOpen="isOpen" />
      <UButton color="neutral" icon="i-heroicons-plus-circle-solid" variant="outline" label="Add"
        @click="isOpen = true">
        Add
      </UButton>
    </div>
  </section>

  <section v-if="!summaryLoading">
    <div v-for="(transactionsOnDay, date) in byDate" :key="date">
      <DailyTransactionSummary :date="date" :transactions="transactionsOnDay" :key="date" />
      <Transaction v-for="transaction in transactionsOnDay" :key="transaction.id" :transaction="transaction"
        @deleted="refreshData" @edited="refreshData" />
    </div>
  </section>
  <section v-else>
    <USkeleton class="h-10 w-full mb-2" v-for="i in 4" :key="i" />
  </section>
</template>

<script setup>
import { navigateTo } from "#app";
import { transactionViewOptions } from "~/constants";
const user = useSupabaseUser();

const selectedView = ref(
  user.value?.user_metadata?.transaction_view ?? transactionViewOptions[1],
);
const isOpen = ref(false);

const { currentPeriod, previousPeriod } = useSelectedTimePeriod(selectedView);

const refreshData = () => {
  refreshTransactions();
  previousRefreshTransactions();
};

const goToGroups = () => {
  navigateTo("/groups");
};

const goToCards = () => {
  navigateTo("/cards");
};

const {
  transactions: {
    all,
    grouped: { byDate },
    incomeCount,
    expenseCount,
    investmentTotal,
    savingTotal,
    incomeTotal,
    expenseTotal,
  },
  pending,
  refreshTransactions,
} = await useFetchTransactions(currentPeriod, { scope: "mine" });

const {
  transactions: {
    all: previousAll,
    incomeTotal: previousIncomeTotal,
    expenseTotal: previousExpenseTotal,
    investmentTotal: previousInvestmentTotal,
    savingTotal: previousSavingTotal,
  },
  pending: previousPending,
  refreshTransactions: previousRefreshTransactions,
} = await useFetchTransactions(previousPeriod, { scope: "mine" });

const summaryLoading = computed(
  () =>
    (pending.value && all.value == null) ||
    (previousPending.value && previousAll.value == null),
);

watch(selectedView, () => {
  refreshData();
});
</script>
