import { readDataCache, writeDataCache } from "~/utils/dataCache";

const PREFETCH_KEY = "prefetch:my-groups";

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const { listMyMemberships } = useExpenseGroups();

  watch(
    user,
    (current) => {
      if (!current) return;
      void prefetchGroups();
    },
    { immediate: true },
  );

  async function prefetchGroups() {
    const cached = readDataCache(PREFETCH_KEY, 10 * 60 * 1000);
    if (cached) return;

    try {
      const { data, error } = await listMyMemberships();
      if (error) return;
      writeDataCache(PREFETCH_KEY, data ?? []);
    } catch {
      // Prefetch is best-effort only.
    }
  }
});
