<template>
    <div>
        <div class="font-bold" :class="[color]">
            {{ title }}
        </div>
        <div class="text-2xl font-extrabold text-black dark:text-white">
            <USkeleton class="h-8 w-full" v-if="loading" />
            <span v-else>{{ currency }}</span>
        </div>
        <div v-if="showPeriodCompare">
            <USkeleton class="h-4 w-full" v-if="loading" />
            <div v-else class="flex space-x-1 items-center">
                <UIcon :name="icon" class="w-6 h-6" :class="{ 'green': trendingUp, 'red': !trendingUp }" />
                <div class="text-gray-500 dark:text-gray-400">
                    {{ percentageTrend }} vs last period
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    title: String,
    amount: Number,
    /** When omitted, no “vs last period” row is shown (saves layout and avoids extra fetches). */
    lastAmount: { type: Number, required: false, default: undefined },
    color: String,
    loading: Boolean,
})

const { amount } = toRefs(props)

const showPeriodCompare = computed(() => props.lastAmount !== undefined)

const trendingUp = computed(() => {
    return props.amount >= (props.lastAmount ?? 0)
})

const icon = computed(() => {
    return trendingUp.value ? 'i-heroicons-arrow-trending-up-solid' : 'i-heroicons-arrow-trending-down-solid'
})

const { currency } = useCurrency(amount)

const percentageTrend = computed(() => {
    const last = props.lastAmount ?? 0
    if (last === 0 || props.amount === 0) return '♾️%'
    const biggerAmount = Math.max(props.amount, last)
    const smallerAmount = Math.min(props.amount, last)

    return `${Math.ceil(((biggerAmount - smallerAmount) / smallerAmount) * 100)}%`
})
</script>

<style scoped>
@reference "~/assets/css/main.css";

.green {
    @apply text-green-500 dark:text-green-400;
}

.red {
    @apply text-red-500 dark:text-red-400;
}
</style>