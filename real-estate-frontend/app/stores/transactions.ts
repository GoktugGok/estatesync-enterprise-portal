import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as any[],
    selectedTransaction: null as any | null,
    loading: false
  }),
  actions: {
    async fetchTransactions() {
      const config = useRuntimeConfig()
      const auth = useAuthStore()
      this.loading = true
      try {
        const data = await $fetch(`${config.public.apiBase}/transactions`, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        })
        this.transactions = data as any[]
      } catch (error) {
        console.error('Hata:', error)
      } finally {
        this.loading = false
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
        // Güncel halini tekrar çek
        await this.fetchTransactions()
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
        await this.fetchTransactions()
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
        await this.fetchTransactions()
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