// https://nuxt.com/docs/api/configuration/nuxt-config
const isNativeBuild = process.env.NUXT_NATIVE_BUILD === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    ...(isNativeBuild ? [] : ['@vite-pwa/nuxt']),
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Finance Tracker',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#111827' },
      ],
    },
  },
  pwa: {
    disable: isNativeBuild,
    registerType: 'autoUpdate',
    manifest: {
      name: 'Finance Tracker',
      short_name: 'Finance',
      theme_color: '#000000',
      icons: [
        {
          src: 'fn-icon.png',
          sizes: '192x192 512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },
  },
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    public: {
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
      isNativeBuild: process.env.NUXT_NATIVE_BUILD === 'true',
      /** Requires Firebase google-services.json — off by default to avoid Android crash. */
      enablePush: process.env.NUXT_PUBLIC_ENABLE_PUSH === 'true',
    }
  },
  vite: {
    build: {
      target: 'es2020',
    },
  },
})