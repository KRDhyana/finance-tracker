<template>
  <div ref="rootRef" class="relative">
    <UInput
      :model-value="rawInput"
      type="text"
      inputmode="decimal"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="effectiveInputClass"
      @update:model-value="onInputChange"
      @paste="onPaste"
      @keydown="onInputKeyDown"
    />

    <button
      type="button"
      class="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      :disabled="disabled"
      aria-label="Open calculator"
      @click.stop="openCalculator"
    >
      <UIcon name="i-heroicons-calculator" class="h-4 w-4" />
    </button>

    <p v-if="hasValue" class="mt-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
      {{ formattedCurrency }}
    </p>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-120 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="isOpen && !isMobile" class="fixed inset-0 z-120" @pointerdown.stop @click.stop>
        <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" @click="closeCalculator" />
        <div class="relative z-10 flex min-h-full items-center justify-center p-4">
          <div
            ref="panelRef"
            role="dialog"
            aria-label="Mini calculator"
            class="w-78 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
            @pointerdown.stop
            @click.stop
          >
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Calculator</h3>
              <button
                type="button"
                aria-label="Close calculator"
                class="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                @click="closeCalculator"
              >
                <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
              </button>
            </div>

            <div class="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
              <p class="min-h-6 break-all text-right text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ displayExpression }}
              </p>
              <p class="min-h-5 text-right text-xs text-gray-500 dark:text-gray-400">{{ preview }}</p>
              <p class="min-h-4.5 text-right text-xs text-rose-600 dark:text-rose-400">{{ errorMessage }}</p>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="key in keys"
                :key="key.label"
                type="button"
                :aria-label="key.label"
                class="h-11 rounded-xl border border-gray-200 text-sm font-semibold transition active:scale-[0.98] dark:border-gray-700"
                :class="key.className"
                @click="onKeyPress(key)"
              >
                {{ key.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-180 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-120 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen && isMobile" class="fixed inset-0 z-120">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closeCalculator" />
        <Transition
          enter-active-class="transition duration-180 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition duration-140 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="isOpen && isMobile"
            ref="panelRef"
            role="dialog"
            aria-modal="true"
            aria-label="Mini calculator"
            class="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-gray-200 bg-white p-4 pb-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            @pointerdown.stop
            @click.stop
          >
            <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />

            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Calculator</h3>
              <button
                type="button"
                aria-label="Close calculator"
                class="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                @click="closeCalculator"
              >
                <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
              </button>
            </div>

            <div class="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
              <p class="min-h-6 break-all text-right text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ displayExpression }}
              </p>
              <p class="min-h-5 text-right text-xs text-gray-500 dark:text-gray-400">{{ preview }}</p>
              <p class="min-h-4.5 text-right text-xs text-rose-600 dark:text-rose-400">{{ errorMessage }}</p>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="key in keys"
                :key="`m-${key.label}`"
                type="button"
                :aria-label="key.label"
                class="h-11 rounded-xl border border-gray-200 text-sm font-semibold transition active:scale-[0.98] dark:border-gray-700"
                :class="key.className"
                @click="onKeyPress(key)"
              >
                {{ key.label }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { evaluateMiniCalculator, sanitizeExpression, toDisplayNumber } from "~/utils/miniCalculator";

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  placeholder: { type: String, default: "Amount" },
  disabled: { type: Boolean, default: false },
  inputClass: { type: String, default: "w-full" },
  currency: { type: String, default: "INR" },
  locale: { type: String, default: "en-IN" },
});

const emit = defineEmits(["update:modelValue"]);

type CalcKey = {
  label: string;
  value?: string;
  action?: "clear" | "backspace";
  className: string;
};

const keys: CalcKey[] = [
  { label: "C", action: "clear", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
  { label: "(", value: "(", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
  { label: ")", value: ")", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
  { label: "÷", value: "/", className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },

  { label: "7", value: "7", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "8", value: "8", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "9", value: "9", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "×", value: "*", className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },

  { label: "4", value: "4", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "5", value: "5", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "6", value: "6", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "-", value: "-", className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },

  { label: "1", value: "1", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "2", value: "2", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "3", value: "3", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "+", value: "+", className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },

  { label: "0", value: "0", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: ".", value: ".", className: "bg-white text-gray-900 dark:bg-gray-900 dark:text-white" },
  { label: "⌫", action: "backspace", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
  { label: "=", className: "bg-teal-600 text-white" },
];

const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isMobile = ref(false);
const expression = ref("");
const rawInput = ref("");
const errorMessage = ref("");
const preview = ref("");

let previewTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;
const amountPattern = /^-?\d+(\.\d+)?$/;

const effectiveInputClass = computed(() => `${props.inputClass} pr-10`);
const displayExpression = computed(() => expression.value || "0");

const compactFormatter = computed(
  () =>
    new Intl.NumberFormat(props.locale, {
      style: "currency",
      currency: props.currency,
      maximumFractionDigits: 2,
    }),
);

const previewFormatter = computed(
  () =>
    new Intl.NumberFormat(props.locale, {
      style: "currency",
      currency: props.currency,
      maximumFractionDigits: 8,
    }),
);

const hasValue = computed(() => {
  const v = Number(props.modelValue);
  return Number.isFinite(v) && v !== 0;
});

const formattedCurrency = computed(() => {
  const v = Number(props.modelValue);
  if (!Number.isFinite(v)) return "";
  return compactFormatter.value.format(v);
});

function sanitizeAmountInput(value: string) {
  const source = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[₹$€£¥,]/g, "")
    .replace(/[−]/g, "-");

  let out = "";
  let hasDot = false;
  let hasSign = false;

  for (const ch of source) {
    if (/\d/.test(ch)) {
      out += ch;
      continue;
    }
    if (ch === "." && !hasDot) {
      out += ch;
      hasDot = true;
      continue;
    }
    if (ch === "-" && !hasSign && out.length === 0) {
      out += ch;
      hasSign = true;
    }
  }

  if (out.startsWith(".")) out = `0${out}`;
  if (out === "-0") return "-";
  return out;
}

function syncFromModel() {
  const v = Number(props.modelValue);
  if (!Number.isFinite(v) || v === 0) {
    rawInput.value = "";
    expression.value = "";
    return;
  }

  const txt = toDisplayNumber(v);
  rawInput.value = txt;
  expression.value = txt;
}

function emitNumericIfValid(raw: string) {
  if (!amountPattern.test(raw)) return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  emit("update:modelValue", n);
}

function updatePreviewNow() {
  if (!expression.value) {
    preview.value = compactFormatter.value.format(0);
    errorMessage.value = "";
    return;
  }

  const result = evaluateMiniCalculator(expression.value);
  if (!result.ok) {
    preview.value = "";
    errorMessage.value = result.error;
    return;
  }

  preview.value = previewFormatter.value.format(result.value);
  errorMessage.value = "";
}

function schedulePreview() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  previewTimer = setTimeout(updatePreviewNow, 90);
}

function onInputChange(value: string) {
  const cleaned = sanitizeAmountInput(value);
  rawInput.value = cleaned;

  if (!cleaned) {
    emit("update:modelValue", 0);
    return;
  }

  emitNumericIfValid(cleaned);
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (!text) return;

  const cleaned = sanitizeAmountInput(text);
  if (!cleaned) return;

  event.preventDefault();
  rawInput.value = cleaned;
  emitNumericIfValid(cleaned);
}

function openCalculator() {
  if (props.disabled) return;
  const current = rawInput.value || toDisplayNumber(Number(props.modelValue) || 0);
  expression.value = current && current !== "0" ? current : "";
  isOpen.value = true;
  errorMessage.value = "";
  updateViewportMode();
  schedulePreview();
}

function closeCalculator() {
  isOpen.value = false;
  errorMessage.value = "";
  syncFromModel();
}

function appendSymbol(symbol: string) {
  errorMessage.value = "";
  expression.value = sanitizeExpression(`${expression.value}${symbol}`);
  schedulePreview();
}

function clearExpression() {
  errorMessage.value = "";
  expression.value = "";
  preview.value = compactFormatter.value.format(0);
}

function backspace() {
  errorMessage.value = "";
  expression.value = expression.value.slice(0, -1);
  schedulePreview();
}

function applyExpression() {
  const result = evaluateMiniCalculator(expression.value);
  if (!result.ok) {
    errorMessage.value = result.error;
    return;
  }

  const out = toDisplayNumber(result.valueText);
  rawInput.value = out;
  emit("update:modelValue", result.value);
  closeCalculator();
}

function onKeyPress(key: CalcKey) {
  if (key.label === "=") {
    applyExpression();
    return;
  }
  if (key.action === "clear") {
    clearExpression();
    return;
  }
  if (key.action === "backspace") {
    backspace();
    return;
  }
  if (key.value) {
    appendSymbol(key.value);
  }
}

function onInputKeyDown(event: KeyboardEvent) {
  if (!isOpen.value) return;
  handleCalculatorKeyboard(event);
}

function onGlobalKeyDown(event: KeyboardEvent) {
  if (!isOpen.value) return;

  const active = import.meta.client ? document.activeElement : null;
  const inCalculatorContext = Boolean(active && rootRef.value?.contains(active));
  if (!inCalculatorContext) return;

  handleCalculatorKeyboard(event);
}

function handleCalculatorKeyboard(event: KeyboardEvent) {
  const key = event.key;

  if (key === "Escape") {
    event.preventDefault();
    closeCalculator();
    return;
  }
  if (key === "Enter" || key === "=") {
    event.preventDefault();
    applyExpression();
    return;
  }
  if (key === "Backspace" || key === "Delete") {
    event.preventDefault();
    backspace();
    return;
  }
  if (key === ",") {
    event.preventDefault();
    appendSymbol(".");
    return;
  }
  if (/^[0-9.+\-*/()xX%]$/.test(key)) {
    event.preventDefault();
    appendSymbol(key === "x" || key === "X" ? "*" : key);
  }
}

function updateViewportMode() {
  if (!import.meta.client) return;
  isMobile.value = window.matchMedia("(max-width: 767px)").matches;
}

function onWindowResize() {
  if (!isOpen.value) return;
  updateViewportMode();
}

function attachListeners() {
  if (!import.meta.client || listenersAttached) return;
  window.addEventListener("keydown", onGlobalKeyDown);
  window.addEventListener("resize", onWindowResize);
  listenersAttached = true;
}

function detachListeners() {
  if (!import.meta.client || !listenersAttached) return;
  window.removeEventListener("keydown", onGlobalKeyDown);
  window.removeEventListener("resize", onWindowResize);
  listenersAttached = false;
}

watch(
  () => props.modelValue,
  () => {
    if (!isOpen.value) syncFromModel();
  },
  { immediate: true },
);

watch(isOpen, (open) => {
  if (open) {
    attachListeners();
    return;
  }
  detachListeners();
});

onBeforeUnmount(() => {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  detachListeners();
});
</script>
