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
  formRef.value?.clear();
};

const formRef = ref();
const isLoading = ref(false);
const { toastSuccess, toastError, toastWarning } = useAppToast();
const supabase = useSupabaseClient();
const r2 = (n) => Math.round(Number(n) * 100) / 100;

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
  },
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
