<template>
  <label class="relative block">
    <span
      class="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-sm"
      :class="display
        ? 'text-gray-900 dark:text-white'
        : 'text-gray-400 dark:text-gray-500'"
    >
      {{ display || placeholder }}
    </span>
    <input
      type="date"
      :value="modelValue || ''"
      class="w-full min-h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-transparent caret-transparent dark:border-gray-700 dark:bg-gray-900"
      @input="$emit('update:modelValue', $event.target.value || '')"
    />
  </label>
</template>

<script setup>
import { format } from "date-fns";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "DD/MM/YYYY" },
});

defineEmits(["update:modelValue"]);

const display = computed(() => {
  if (!props.modelValue) return "";
  try {
    return format(new Date(`${props.modelValue}T12:00:00`), "dd/MM/yyyy");
  } catch {
    return props.modelValue;
  }
});
</script>
