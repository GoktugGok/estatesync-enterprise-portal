import { defineStore } from 'pinia'

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as any[],
    selectedTransaction: null as any | null,
    loading: false
  }),
  actions: {
    async fetchTransactions() {
      this.loading = true
      try {
        // Backend'deki listeyi çekiyoruz
        const data = await $fetch('http://localhost:3000/transactions')
        this.transactions = data as any[]
      } catch (error) {
        console.error('Hata:', error)
      } finally {
        this.loading = false
      }
    },
    async completeTransaction(id: string) {
      try {
        await $fetch(`http://localhost:3000/transactions/${id}/status`, {
          method: 'PATCH',
          body: { status: 'completed' }
        })
        // Güncel halini tekrar çek
        await this.fetchTransactions()
      } catch (error) {
        alert('İşlem güncellenemedi!')
      }
    },
    async createTransaction(payload: any) {
      try {
        await $fetch('http://localhost:3000/transactions', {
          method: 'POST',
          body: payload
        })
        await this.fetchTransactions()
      } catch (error) {
        console.error('Kayıt hatası:', error)
      }
    },
    async updateTransaction(id: string, payload: any) {
      try {
        await $fetch(`http://localhost:3000/transactions/${id}/status`, {
          method: 'PATCH',
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