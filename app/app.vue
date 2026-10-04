<template>
  <div>
    <VitePwaManifest v-if="!isNativeBuild" />
    <UApp>
    <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const isNativeBuild = computed(() => Boolean(config.public.isNativeBuild));
</script>