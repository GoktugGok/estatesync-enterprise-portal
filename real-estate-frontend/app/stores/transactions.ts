import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as any[],
    selectedTransaction: null as any | null,
    loading: false,
    lastFetched: 0
  }),
  actions: {
    async fetchTransactions(force = false) {
      // Simple cache: if fetched in last 30 seconds and not forced, skip loading state
      const now = Date.now()
      if (!force && this.transactions.length > 0 && (now - this.lastFetched < 30000)) {
        // Just refresh in background without loading spinner
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
        const data = await $fetch(`${config.public.apiBase}/transactions`, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        })
        this.transactions = data as any[]
        this.lastFetched = Date.now()
      } catch (error) {
        console.error('Fetch error:', error)
      }
    },
    async completeTransaction(id: string) {
      const config = useRuntimeConfig()
      const auth = useAuthStore()
      try {
        await $fetch(`${config.public.apiBase}/transactions/${id}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${auth.token}`
          },
          body: { status: 'completed' }
        })
        // Fetch fresh data
        await this.fetchTransactions(true)
      } catch (error) {
        console.error('Hata:', error)
        alert('İşlem güncellenemedi!')
      }
    },
    async createTransaction(payload: any) {
      const config = useRuntimeConfig()
      const auth = useAuthStore()
      try {
        await $fetch(`${config.public.apiBase}/transactions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`
          },
          body: payload
        })
        await this.fetchTransactions(true)
      } catch (error) {
        console.error('Kayıt hatası:', error)
      }
    },
    async updateTransaction(id: string, payload: any) {
      const config = useRuntimeConfig()
      const auth = useAuthStore()
      try {
        await $fetch(`${config.public.apiBase}/transactions/${id}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${auth.token}`
          },
          body: payload
        })
        await this.fetchTransactions(true)
      } catch (error) {
        console.error('Güncelleme hatası:', error)
        throw error
      }
    },
    selectTransaction(id: string) {
      this.selectedTransaction = this.transactions.find(t => t._id === id) || null
    },
    closeDetail() {
      this.selectedTransaction = null
    }
  }
})