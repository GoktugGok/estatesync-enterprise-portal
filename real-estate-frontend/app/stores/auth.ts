import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | { _id: string; name: string; email: string; role: string; photo?: string },
    token: null as null | string,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    async login(email: string, password: string) {
      const config = useRuntimeConfig()
      const data: any = await $fetch(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body: { email, password },
      })
      this.token = data.access_token
      this.user = data.user
      if (process.client) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
      }
    },
    async register(name: string, email: string, password: string) {
      const config = useRuntimeConfig()
      const data: any = await $fetch(`${config.public.apiBase}/auth/register`, {
        method: 'POST',
        body: { name, email, password, role: 'agent' },
      })
      this.token = data.access_token
      this.user = data.user
      if (process.client) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
      }
    },
    logout() {
      this.token = null
      this.user = null
      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    },
    restoreFromStorage() {
      if (process.client) {
        const token = localStorage.getItem('auth_token')
        const user = localStorage.getItem('auth_user')
        if (token && user) {
          this.token = token
          this.user = JSON.parse(user)
        }
      }
    },
  },
})
