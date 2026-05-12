<template>
  <UModal
    v-model:open="isOpen"
    :title="modalTitle"
  >
    <template #body>
      <UForm :state="state" :schema="formSchema" @submit="save" ref="formRef">
        <UFormField
          v-if="!creditCard"
          label="Transaction Type"
          name="type"
          :required="true"
          class="mb-4"
        >
          <USelectMenu
            :disabled="isEditing"
            placeholder="Select Transaction Type"
            v-model="state.type"
            :items="types"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-else
          label="Line type"
          name="creditLineKind"
          :required="true"
          class="mb-4"
        >
          <USelectMenu
            :disabled="isEditing"
            placeholder="What kind of line"
            v-model="state.creditLineKind"
            value-key="value"
            :items="creditLineMenuItems"
            class="w-full"
          />
        </UFormField>
        <p
          v-if="creditCard && isGroupCardOwner"
          class="text-xs text-amber-800 dark:text-amber-200 -mt-2 mb-4"
        >
          You own this card — use Card spend and Reserve. Members record payments to you; you cannot
          pay yourself.
        </p>
        <p
          v-else-if="creditCard"
          class="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4"
        >
          A <span class="font-medium">payment to owner</span> is one line. If it is larger than what
          you <span class="font-medium">reserved</span> this period, your net savings for the period
          will go negative — that means you repaid more than you had set aside.
        </p>

        <UFormField label="Amount" name="amount" :required="true" class="mb-4">
          <AmountCalculatorInput v-model="state.amount" placeholder="Amount" input-class="w-full" />
        </UFormField>

        <div v-if="showSplitControls" class="mb-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Split with members
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-heroicons-user-group"
              :label="splitButtonLabel"
              @click="openSplitPicker"
            />
          </div>
          <div v-if="splitPickerOpen" class="mt-2">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">Split expense</h3>
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="closeSplitPicker" />
                </div>
              </template>

              <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">Select members (payer included)</p>
              <p class="mb-2 text-[11px] text-gray-500 dark:text-gray-400">Equal split is default. Custom amount and percentage split can be added next.</p>
              <div class="max-h-56 space-y-1 overflow-y-auto pr-1">
                <div
                  v-for="member in splitMemberItems"
                  :key="member.id"
                  class="flex cursor-pointer items-center justify-between rounded-lg border border-transparent px-2 py-1.5 hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800/60"
                  @click="toggleSplitDraftMember(member.id, !isSplitDraftSelected(member.id))"
                >
                  <div class="flex min-w-0 items-center gap-2">
                    <UAvatar :src="member.avatar" :alt="member.name" size="xs" />
                    <span class="truncate text-sm">{{ member.name }}</span>
                    <UBadge v-if="member.id === currentUserId" size="xs" color="primary" variant="subtle">You</UBadge>
                  </div>
                  <UCheckbox
                    :model-value="isSplitDraftSelected(member.id)"
                    :disabled="member.id === currentUserId"
                    @click.stop
                    @update:model-value="(on) => toggleSplitDraftMember(member.id, Boolean(on))"
                  />
                </div>
              </div>
              <p v-if="splitDraftError" class="mt-2 text-xs text-rose-600 dark:text-rose-400">{{ splitDraftError }}</p>
              <div class="mt-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-800/70">
                <div class="mb-1 text-[11px] text-gray-500 dark:text-gray-400">Preview</div>
                <div v-for="row in splitDraftPreviewRows" :key="row.userId" class="flex items-center justify-between text-xs py-0.5">
                  <span class="truncate text-gray-700 dark:text-gray-200">{{ row.name }}</span>
                  <span class="tabular-nums font-medium">{{ row.formatted }}</span>
                </div>
              </div>

              <template #footer>
                <div class="flex justify-end gap-2">
                  <UButton size="sm" color="neutral" variant="outline" label="Cancel" @click="closeSplitPicker" />
                  <UButton size="sm" color="neutral" variant="solid" label="Apply split" @click="confirmSplitPicker" />
                </div>
              </template>
            </UCard>
          </div>
          <div v-if="splitEnabled && splitPreviewRows.length" class="mt-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2 dark:border-teal-900/50 dark:bg-teal-950/30">
            <div class="text-[11px] font-medium text-teal-800 dark:text-teal-200 mb-1">Equal split preview</div>
            <div class="grid gap-1">
              <div
                v-for="row in splitPreviewRows"
                :key="row.userId"
                class="flex items-center justify-between text-xs"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <UAvatar :src="row.avatar" :alt="row.name" size="2xs" />
                  <span class="truncate text-gray-700 dark:text-gray-200">{{ row.name }}</span>
                </div>
                <span class="tabular-nums font-medium text-teal-900 dark:text-teal-200">{{ row.formatted }}</span>
              </div>
            </div>
          </div>
        </div>

        <UFormField
          :label="creditCard ? 'Transaction date' : 'Transaction Date'"
          name="created_at"
          :required="true"
          class="mb-4"
        >
          <UInput
            icon="i-heroicons-calendar-days-20-solid"
            type="date"
            v-model="state.created_at"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Description" name="description" hint="Optional" class="mb-4">
          <UInput v-model="state.description" type="text" placeholder="Description" class="w-full" />
        </UFormField>

        <UFormField
          label="Category"
          name="category"
          :required="true"
          class="mb-4"
          v-if="showCategoryField"
        >
          <USelectMenu
            placeholder="Select Category"
            v-model="state.category"
            :items="filteredCategories"
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" color="neutral" label="Save" variant="solid" :loading="isLoading" />
      </UForm>
    </template>
  </UModal>
</template>

<script setup>
import { categories, types, creditCardLineOptions } from "~/constants";
import {
  buildCreditLinePayload,
  creditLineKindFromRow,
  fetchGrossSavingsInCreditCardScope,
  mirrorReserveToMonthlyExpense,
} from "~/utils/creditCardTransaction";
import { getBillingCycleKeyForTransactionDate } from "~/utils/billingCycle";
import { z } from "zod";

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  transaction: { type: Object, required: false },
  groupId: { type: String, default: null },
  isDemo: { type: Boolean, default: false },
  /**
   * Credit line: all rows use `type: expense` and optional `subtype` (null, `reserve`, `payment`).
   */
  creditCard: { type: Boolean, default: false },
  creditCardId: { type: String, default: null },
  billingCycleKey: { type: String, default: null },
  /** From `credit_cards` for this card; when both set, `billing_cycle_key` is derived from the line date. */
  cardBillingCycleStartDay: { type: [Number, String], default: null },
  cardBillingCycleEndDay: { type: [Number, String], default: null },
  /** When set, current user is treated as card owner for this group (hides “Payment to owner” on new lines) */
  groupOwnerUserId: { type: String, default: null },
  /** Group members used for equal split selection in credit card group spends. */
  groupMembers: { type: Array, default: () => [] },
});

const emit = defineEmits(["saved", "update:isOpen"]);
const creditCard = computed(() => props.creditCard);
const isOpen = computed({
  get: () => props.isOpen,
  set: (value) => {
    emit("update:isOpen", value);
    if (!value) {
      resetForm();
    }
  },
});
const isEditing = computed(() => !!props.transaction);

const user = useSupabaseUser();

const isGroupCardOwner = computed(
  () =>
    Boolean(
      props.creditCard &&
        props.groupOwnerUserId &&
        user.value?.sub &&
        String(user.value.sub) === String(props.groupOwnerUserId),
    ),
);

const creditLineMenuItems = computed(() => {
  if (isGroupCardOwner.value && !isEditing.value) {
    return creditCardLineOptions.filter((o) => o.value !== "payment");
  }
  return creditCardLineOptions;
});
const typeMenuItems = types;
const filteredCategories = computed(() => {
  if (props.creditCard) {
    return categories.filter((category) => category !== "Credit card");
  }
  return categories;
});

const showCategoryField = computed(() => {
  if (creditCard.value) {
    return state.value.creditLineKind === "spend";
  }
  return state.value.type === "Expense";
});

const modalTitle = computed(() => {
  if (isEditing.value) {
    return creditCard.value ? "Edit credit line" : "Edit Transaction";
  }
  if (creditCard.value) {
    return "Add credit line";
  }
  return "Add Transaction";
});

const defaultSchema = z.object({
  amount: z.number().positive("Amount Needs to be positive"),
  created_at: z.string().min(1, "Date required"),
  description: z.string().optional(),
});

const expenseSchema = z.object({ type: z.literal("Expense"), category: z.enum(categories) });
const incomeSchema = z.object({ type: z.literal("Income") });
const savingSchema = z.object({ type: z.literal("Saving") });
const investmentSchema = z.object({ type: z.literal("Investment") });
const mainSchema = z.intersection(
  defaultSchema,
  z.discriminatedUnion("type", [expenseSchema, incomeSchema, savingSchema, investmentSchema]),
);

const creditLineKindAll = z
  .object({
    amount: z.number().positive("Amount Needs to be positive"),
    created_at: z.string().min(1, "Date required"),
    description: z.string().optional(),
    creditLineKind: z.enum(["spend", "reserve", "payment"]),
    category: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.creditLineKind === "spend" && !filteredCategories.value.includes(d.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Select a category" });
    }
  });

const creditLineFormSchema = creditLineKindAll;

const creditLineFormSchemaOwnerAdd = z
  .object({
    amount: z.number().positive("Amount Needs to be positive"),
    created_at: z.string().min(1, "Date required"),
    description: z.string().optional(),
    creditLineKind: z.enum(["spend", "reserve"]),
    category: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.creditLineKind === "spend" && !filteredCategories.value.includes(d.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Select a category" });
    }
  });

const formSchema = computed(() => {
  if (!props.creditCard) return mainSchema;
  if (isGroupCardOwner.value && !isEditing.value) {
    return creditLineFormSchemaOwnerAdd;
  }
  return creditLineFormSchema;
});

const getEmptyState = () => {
  if (props.creditCard) {
    return {
      creditLineKind: "spend",
      amount: 0,
      created_at: undefined,
      category: undefined,
      description: undefined,
    };
  }
  return {
    type: undefined,
    amount: 0,
    created_at: undefined,
    category: undefined,
    description: undefined,
  };
};

const getInitialState = () => {
  if (props.creditCard && props.transaction) {
    const t = props.transaction;
    return {
      creditLineKind: creditLineKindFromRow(t),
      amount: t.amount,
      created_at: t.created_at?.split("T")?.[0] ?? undefined,
      category: t.category,
      description: t.description,
    };
  }
  if (!props.creditCard && props.transaction) {
    return {
      type: props.transaction.type,
      amount: props.transaction.amount,
      created_at: props.transaction.created_at?.split("T")?.[0] ?? undefined,
      category: props.transaction.category,
      description: props.transaction.description,
    };
  }
  return { ...getEmptyState() };
};

const state = ref(getInitialState());

const resetForm = () => {
  Object.assign(state.value, getInitialState());
  resetSplitState();
  formRef.value?.clear();
};

const formRef = ref();
const isLoading = ref(false);
const { toastSuccess, toastError, toastWarning } = useAppToast();
const supabase = useSupabaseClient();
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const splitPickerOpen = ref(false);
const splitDraftIds = ref([]);
const splitAppliedIds = ref([]);
const splitDraftError = ref("");

const currentUserId = computed(() => user.value?.sub ?? user.value?.id ?? null);

const splitMemberItems = computed(() => {
  const map = new Map();
  for (const m of props.groupMembers ?? []) {
    const id = m?.user_id ? String(m.user_id) : "";
    if (!id || map.has(id)) continue;
    const profile = m?.profiles;
    const name = profile?.full_name || `Member ...${id.slice(-6)}`;
    map.set(id, {
      id,
      name,
      avatar: profile?.avatar_url || undefined,
    });
  }
  if (currentUserId.value && !map.has(String(currentUserId.value))) {
    const id = String(currentUserId.value);
    map.set(id, { id, name: "You", avatar: undefined });
  }
  return Array.from(map.values());
});

const showSplitControls = computed(() => {
  return Boolean(
    props.creditCard &&
      !isEditing.value &&
      props.groupId &&
      state.value.creditLineKind === "spend" &&
      splitMemberItems.value.length > 1,
  );
});

const splitEnabled = computed(() => splitAppliedIds.value.length > 1);
const splitDraftIdSet = computed(() => new Set(splitDraftIds.value.map(String)));
const splitCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function equalShares(totalAmount, participantIds) {
  const ids = (participantIds ?? []).filter(Boolean).map(String);
  if (!ids.length) return [];
  const totalCents = Math.round((Number(totalAmount) || 0) * 100);
  const base = Math.floor(totalCents / ids.length);
  let rem = totalCents - base * ids.length;
  return ids.map((id) => {
    const add = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    return { userId: id, amount: (base + add) / 100 };
  });
}

function formatSplitAmount(amount) {
  return splitCurrencyFormatter.format(Number(amount) || 0);
}

function isSplitDraftSelected(memberId) {
  return splitDraftIdSet.value.has(String(memberId));
}

function normalizeSplitDescription(input) {
  const text = String(input ?? "").trim();
  if (!text) return "[Split]";
  return text.startsWith("[Split]") ? text : `[Split] ${text}`;
}

const splitDraftPreviewRows = computed(() => {
  const byId = Object.fromEntries(splitMemberItems.value.map((m) => [m.id, m]));
  return equalShares(state.value.amount, splitDraftIds.value).map((s) => ({
    userId: s.userId,
    name: byId[s.userId]?.name ?? `Member ...${String(s.userId).slice(-6)}`,
    formatted: formatSplitAmount(s.amount),
  }));
});

const splitPreviewRows = computed(() => {
  const byId = Object.fromEntries(splitMemberItems.value.map((m) => [m.id, m]));
  return equalShares(state.value.amount, splitAppliedIds.value).map((s) => ({
    userId: s.userId,
    name: byId[s.userId]?.name ?? `Member ...${String(s.userId).slice(-6)}`,
    avatar: byId[s.userId]?.avatar,
    formatted: formatSplitAmount(s.amount),
  }));
});

const splitButtonLabel = computed(() => {
  if (!splitEnabled.value) return "Split";
  return `Split (${splitAppliedIds.value.length})`;
});

function ensurePayerIn(ids) {
  const payer = currentUserId.value ? String(currentUserId.value) : null;
  const uniq = Array.from(new Set((ids ?? []).filter(Boolean).map(String)));
  if (payer && !uniq.includes(payer)) uniq.unshift(payer);
  return uniq;
}

function resetSplitState() {
  splitPickerOpen.value = false;
  splitDraftError.value = "";
  splitDraftIds.value = ensurePayerIn([]);
  splitAppliedIds.value = [];
}

function openSplitPicker() {
  if (splitPickerOpen.value) {
    closeSplitPicker();
    return;
  }
  splitDraftError.value = "";
  const baseline = splitAppliedIds.value.length ? splitAppliedIds.value : ensurePayerIn([]);
  splitDraftIds.value = ensurePayerIn(baseline);
  splitPickerOpen.value = true;
}

function closeSplitPicker() {
  splitDraftError.value = "";
  splitPickerOpen.value = false;
}

function toggleSplitDraftMember(memberId, on) {
  const id = String(memberId);
  const payer = currentUserId.value ? String(currentUserId.value) : null;
  if (payer && id === payer) return;
  const set = new Set(splitDraftIds.value.map(String));
  if (on) set.add(id);
  else set.delete(id);
  splitDraftIds.value = ensurePayerIn(Array.from(set));
}

function confirmSplitPicker() {
  const ids = ensurePayerIn(splitDraftIds.value);
  if (!ids.length) {
    splitDraftError.value = "Select at least one participant.";
    return;
  }
  if ((Number(state.value.amount) || 0) <= 0) {
    splitDraftError.value = "Enter an amount first.";
    return;
  }
  splitAppliedIds.value = ids.length > 1 ? ids : [];
  splitPickerOpen.value = false;
}

/** Date-only field as local calendar day (avoids UTC shifting the day). */
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

watch(
  () => [state.value.creditLineKind, props.creditCard],
  () => {
    if (props.creditCard && state.value.creditLineKind && state.value.creditLineKind !== "spend") {
      state.value.category = undefined;
    }
  },
  { immediate: true },
);

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.creditCard) {
      Object.assign(state.value, getInitialState());
    }
    if (!open) {
      splitPickerOpen.value = false;
    }
  },
);

watch(
  () => [showSplitControls.value, state.value.creditLineKind, props.groupId],
  ([enabled]) => {
    if (!enabled) {
      resetSplitState();
    } else if (!splitDraftIds.value.length) {
      splitDraftIds.value = ensurePayerIn([]);
    }
  },
  { immediate: true },
);

const save = async () => {
  if (formRef.value?.errors?.length) return;

  isLoading.value = true;
  try {
    if (props.isDemo) {
      toastSuccess({
        title: "Demo",
        description: "This screen does not save to the server.",
      });
      isOpen.value = false;
      emit("saved", state.value);
      return;
    }
    const groupIdForSave = props.transaction?.group_id ?? props.groupId ?? null;
    let warnPaymentExceedsReserved = false;

    if (props.creditCard) {
      if (
        state.value.creditLineKind === "payment" &&
        props.groupOwnerUserId &&
        user.value?.sub &&
        String(user.value.sub) === String(props.groupOwnerUserId)
      ) {
        toastError({
          title: "Members record payments",
          description:
            "The card owner cannot add a payment to themself. Use Card spend or Reserve.",
        });
        isLoading.value = false;
        return;
      }
      const created = state.value.created_at
        ? `${String(state.value.created_at).split("T")[0]}T12:00:00.000Z`
        : null;
      const txDate = localDateFromInput(state.value.created_at);
      const hasCardCycle =
        props.cardBillingCycleStartDay != null &&
        props.cardBillingCycleStartDay !== "" &&
        props.cardBillingCycleEndDay != null &&
        props.cardBillingCycleEndDay !== "";
      const billingKey = hasCardCycle
        ? getBillingCycleKeyForTransactionDate(
            txDate,
            Number(props.cardBillingCycleStartDay),
            Number(props.cardBillingCycleEndDay),
          )
        : props.billingCycleKey;
      const userId = user.value?.sub;

      if (
        !props.transaction &&
        state.value.creditLineKind === "payment" &&
        userId &&
        groupIdForSave &&
        props.creditCardId &&
        billingKey
      ) {
        const P = r2(state.value.amount);
        const R = await fetchGrossSavingsInCreditCardScope(supabase, {
          groupId: groupIdForSave,
          creditCardId: props.creditCardId,
          billingCycleKey: billingKey,
          userId,
        });
        warnPaymentExceedsReserved = P > R + 0.0001;
      }

      const p = {
        ...buildCreditLinePayload({
          creditLineKind: state.value.creditLineKind,
          amount: state.value.amount,
          created_at: created,
          description: state.value.description,
          category: state.value.category,
          id: props.transaction?.id,
          group_id: groupIdForSave,
        }),
      };
      const actorUserId = currentUserId.value ? String(currentUserId.value) : null;
      if (actorUserId && !p.user_id) {
        p.user_id = actorUserId;
      }

      const shouldSplitCreditLine =
        !props.transaction &&
        state.value.creditLineKind === "spend" &&
        showSplitControls.value &&
        splitEnabled.value &&
        splitAppliedIds.value.length > 1;

      if (props.creditCardId) {
        p.credit_card_id = props.creditCardId;
      }
      if (billingKey) {
        p.billing_cycle_key = billingKey;
      } else if (props.billingCycleKey) {
        p.billing_cycle_key = props.billingCycleKey;
      }

      let isBatchEdit = false;
      let batchId = null;
      let selectedTransactions = [];

      // If it's a synthetic batch transaction, its ID is a UUID from reservation_batches
      if (props.transaction && state.value.creditLineKind === 'reserve') {
        const { data: batches } = await supabase
          .from('reservation_batches')
          .select('id')
          .eq('id', props.transaction.id);

        if (batches && batches.length > 0) {
          isBatchEdit = true;
          batchId = batches[0].id;
          
          const { data: reservations } = await supabase
            .from('transaction_reservations')
            .select('source_transaction_id')
            .eq('reservation_batch_id', batchId);
            
          selectedTransactions = reservations || [];
        }
      }

      if (isBatchEdit) {
        // 1. delete old batch
        await supabase
          .from('reservation_batches')
          .delete()
          .eq('id', batchId);

        // 2. create new batch pointing to the same source transactions
        const { error: rpcError } = await supabase.rpc('create_reservation_batch', {
          p_group_id: groupIdForSave,
          p_credit_card_id: props.creditCardId,
          p_billing_cycle_key: billingKey,
          p_total_amount: state.value.amount,
          p_transaction_ids: selectedTransactions.map(t => t.source_transaction_id)
        });
        
        if (rpcError) throw rpcError;
      } else if (shouldSplitCreditLine) {
        const participantIds = ensurePayerIn(splitAppliedIds.value);
        const shares = equalShares(state.value.amount, participantIds);
        const sum = r2(shares.reduce((a, s) => a + s.amount, 0));
        if (Math.abs(sum - r2(state.value.amount)) > 0.01) {
          throw new Error("Split total mismatch. Please re-open Split and confirm again.");
        }
        const { id: _omitId, ...insertBase } = p;
        const normalizedDescription = normalizeSplitDescription(insertBase.description);
        const rows = shares.map((s) => ({
          ...insertBase,
          amount: s.amount,
          subtype: null,
          description: normalizedDescription,
          user_id: s.userId,
        }));
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").upsert(p);
        if (error) throw error;
      }

      if (!props.transaction && state.value.creditLineKind === "reserve") {
        try {
          await mirrorReserveToMonthlyExpense(supabase, state.value.amount, created, state.value.description);
        } catch (mirrorError) {
          console.error("Failed to mirror reserve:", mirrorError);
        }
      }
    } else {
      const base = { ...state.value, id: props.transaction?.id, group_id: groupIdForSave };
      const { error } = await supabase.from("transactions").upsert(base);
      if (error) throw error;
    }
    if (warnPaymentExceedsReserved) {
      toastWarning({
        title: "Transaction saved",
        description:
          "This payment is larger than your reserve total for this statement. Net savings will show as negative until you add more reserve lines.",
      });
    } else {
      toastSuccess({ title: "Transaction saved" });
    }
    isOpen.value = false;
    emit("saved", state.value);
  } catch (error) {
    toastError({
      title: "Error saving transaction",
      description: error.message,
    });
  } finally {
    isLoading.value = false;
  }
};
</script>
