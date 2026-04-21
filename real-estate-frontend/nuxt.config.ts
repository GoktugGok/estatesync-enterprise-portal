export default defineNuxtConfig({
  // Nuxt 4 yapısı için app klasörünü baz almasını sağlar
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000'
    }
  }
})