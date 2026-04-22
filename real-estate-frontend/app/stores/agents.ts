import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useAgentStore = defineStore('agents', {
  state: () => ({
    agents: [] as any[],
    loading: false,
    lastFetched: 0
  }),
  actions: {
    async fetchAgents(force = false) {
      const now = Date.now()
      if (!force && this.agents.length > 0 && (now - this.lastFetched < 30000)) {
        this._doFetch()
        return
      }

      this.loading = true
      await this._doFetch()
      this.loading = false
    },
    async _doFetch() {
      const config = useRuntimeConfig()
      const auth = useAuthStore()
      try {
        const data = await $fetch(`${config.public.apiBase}/users`, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        })
        if (data && Array.isArray(data)) {
          this.agents = data.filter((u: any) => u.role === 'agent')
        }
        this.lastFetched = Date.now()
      } catch (error) {
        console.error('Agent fetch error:', error)
      }
    },
    getAgentById(id: string) {
      return this.agents.find(a => a._id === id)
    }
  }
})
