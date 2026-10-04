import { filterGroupTransactions, groupSearchIsActive } from "~/utils/groupSearch";

export function emptyGroupSearch() {
  return {
    query: "",
    amountOp: "about",
    amount: "",
    whenMode: "any",
    date: "",
    from: "",
    to: "",
  };
}

export function useGroupSearch() {
  const state = ref(emptyGroupSearch());

  watch(
    () => state.value.whenMode,
    (mode) => {
      if (mode !== "day") state.value.date = "";
      if (mode !== "range") {
        state.value.from = "";
        state.value.to = "";
      }
    },
  );

  const active = computed(() => groupSearchIsActive(state.value));

  function apply(list, namesByUserId = {}) {
    return filterGroupTransactions(list, state.value, namesByUserId);
  }

  function clear() {
    state.value = emptyGroupSearch();
  }

  return { state, active, apply, clear };
}
