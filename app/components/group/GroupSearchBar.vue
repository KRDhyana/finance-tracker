<template>
  <div class="inline-flex">
    <UChip :show="appliedCount > 0" :text="String(appliedCount)" size="3xs" color="primary">
      <UButton
        icon="i-heroicons-magnifying-glass"
        color="neutral"
        variant="ghost"
        class="shrink-0"
        :aria-label="appliedCount ? `Search, ${appliedCount} filters` : 'Search'"
        @click="open"
      />
    </UChip>

    <UModal v-model:open="isOpen" title="Search transactions">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" name="groupSearch">
            <UInput
              v-model="draft.query"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search by name or description"
              class="w-full"
            />
          </UFormField>

          <div>
            <div class="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">Amount</div>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 mb-2">
              <button
                v-for="op in amountOps"
                :key="op.value"
                type="button"
                class="rounded-md px-2 py-2 text-xs font-medium transition"
                :class="
                  draft.amountOp === op.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                "
                @click="draft.amountOp = op.value"
              >
                {{ op.label }}
              </button>
            </div>
            <UInput
              v-model="draft.amount"
              type="number"
              min="0"
              inputmode="decimal"
              :placeholder="amountPlaceholder"
              class="w-full"
            />
          </div>

          <div>
            <div class="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">When</div>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 mb-2">
              <button
                v-for="mode in whenModes"
                :key="mode.value"
                type="button"
                class="rounded-md px-2 py-2 text-xs font-medium transition"
                :class="
                  draft.whenMode === mode.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                "
                @click="draft.whenMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
            <GroupDateDisplayInput
              v-if="draft.whenMode === 'day'"
              v-model="draft.date"
              placeholder="DD/MM/YYYY"
            />
            <div v-else-if="draft.whenMode === 'range'" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <GroupDateDisplayInput v-model="draft.from" placeholder="From DD/MM/YYYY" />
              <GroupDateDisplayInput v-model="draft.to" placeholder="To DD/MM/YYYY" />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Clear" @click="clearAndApply" />
          <UButton color="neutral" variant="outline" label="Cancel" @click="isOpen = false" />
          <UButton color="neutral" variant="solid" label="Search" @click="applyFilters" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { emptyGroupSearch } from "~/composables/useGroupSearch";

const model = defineModel({ type: Object, required: true });
const isOpen = ref(false);
const draft = ref(emptyGroupSearch());

const amountOps = [
  { value: "above", label: "Above" },
  { value: "below", label: "Below" },
  { value: "about", label: "About" },
];

const whenModes = [
  { value: "any", label: "Any" },
  { value: "day", label: "Date" },
  { value: "range", label: "Duration" },
];

const amountPlaceholder = computed(() => {
  if (draft.value.amountOp === "above") return "Enter the amount above";
  if (draft.value.amountOp === "below") return "Enter the amount below";
  return "Enter the amount about";
});

const appliedCount = computed(() => {
  const s = model.value;
  let n = 0;
  if (String(s.query ?? "").trim()) n += 1;
  if (Number(s.amount) > 0) n += 1;
  if (s.whenMode === "day" && s.date) n += 1;
  if (s.whenMode === "range" && (s.from || s.to)) n += 1;
  return n;
});

function copySearch(from) {
  return {
    query: from.query ?? "",
    amountOp: from.amountOp || "about",
    amount: from.amount ?? "",
    whenMode: from.whenMode || "any",
    date: from.date ?? "",
    from: from.from ?? "",
    to: from.to ?? "",
  };
}

function normalizeDraft(value) {
  const next = copySearch(value);
  if (next.whenMode !== "day") next.date = "";
  if (next.whenMode !== "range") {
    next.from = "";
    next.to = "";
  }
  return next;
}

function open() {
  draft.value = copySearch(model.value);
  isOpen.value = true;
}

function applyFilters() {
  Object.assign(model.value, normalizeDraft(draft.value));
  isOpen.value = false;
}

function clearAndApply() {
  Object.assign(model.value, emptyGroupSearch());
  draft.value = emptyGroupSearch();
  isOpen.value = false;
}
</script>
