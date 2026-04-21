export default defineNuxtConfig({
  // Nuxt 4 yapısı için app klasörünü baz almasını sağlar
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  devtools: { enabled: false },

})