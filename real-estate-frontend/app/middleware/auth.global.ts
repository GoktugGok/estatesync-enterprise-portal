import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  authStore.restoreFromStorage()

  if (to.path !== '/login' && !authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (to.path === '/login' && authStore.isLoggedIn) {
    return navigateTo('/')
  }
})
