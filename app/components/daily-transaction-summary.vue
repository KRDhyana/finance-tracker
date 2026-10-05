<template>
    <div class="grid grid-cols-2 py-1.5 pl-2 pr-0 dark:py-3 border-b border-gray-500 dark:border-gray-700 text-gray-600 dark:text-gray-400 shadow rounded font-bold">
        <div class="flex items-center justify-between">
            {{ formattedDate }}
        </div>
        <div class="flex items-center justify-end mr-6 md:mr-10" :class="sum >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
            {{ currency }}
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { format } from 'date-fns';
import { isCcReserve, isCcPaymentToOwner } from "~/utils/creditCardTransaction";

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
  transactions: {
    type: Array,
    required: true,
  },
  /** When true, Reserve/Settle count as inflows, Expense as outflow. */
  creditLineNet: {
    type: Boolean,
    default: false,
  },
});

const formattedDate = computed(() => {
  if (!props.date) return "";
  const parts = props.date.split("-");
  if (parts.length === 3) {
    //const date_wise = `${parts[2]}-${parts[1]}-${parts[0].slice(2)}`;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return format(d, 'MMM do, yyyy');
  }
  return props.date;
});

const sum = computed(() => {
    let s = 0
    for (const transaction of props.transactions) {
        if (props.creditLineNet) {
            const t = transaction
            if (isCcReserve(t) || isCcPaymentToOwner(t) || t.type === "Income" || t.type === "Reserve" || t.type === "Settle") {
                s += t.amount
            } else {
                s -= t.amount
            }
        } else {
            transaction.type === 'Income' ? s += transaction.amount : s -= transaction.amount
        }
    }
    return s
})

const { currency } = useCurrency(sum)
</script>