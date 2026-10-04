<template>
  <UCard>
    <template #header>Signing in...</template>
    <div class="text-center">
      Wait a moment while we sign you in...
    </div>
  </UCard>
</template>

<script setup>
const supabase = useSupabaseClient();

useRedirectedIfAuthenticated();

onMounted(async () => {
  if (!import.meta.client) return;
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return;
  try {
    await supabase.auth.getSession();
  } catch (e) {
    console.warn("[auth] Could not restore session from redirect:", e);
  }
});
</script>
