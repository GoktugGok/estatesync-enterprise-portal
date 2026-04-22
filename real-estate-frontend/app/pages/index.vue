<script setup>
import { useTransactionStore } from '~/stores/transactions'
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const transStore = useTransactionStore()
const authStore = useAuthStore()

onMounted(async () => {
  await transStore.fetchTransactions()
  // Select the first transaction by default to show in the donut chart
  if (transStore.transactions.length > 0 && !transStore.selectedTransaction) {
    transStore.selectTransaction(transStore.transactions[0]._id)
  }
})

const stats = computed(() => {
  const completed = transStore.transactions.filter(t => t.status === 'completed')
  const active = transStore.transactions.filter(t => t.status !== 'completed')
  return {
    totalRevenue: completed.reduce((sum, t) => sum + (t.financialBreakdown?.agencyShare || 0), 0),
    transactionCount: transStore.transactions.length,
    completedCount: completed.length,
    activeCount: active.length
  }
})

// Provide a safe fallback for the selected transaction chart
const selectedTx = computed(() => transStore.selectedTransaction || transStore.transactions[0] || null)

const chartData = computed(() => {
  if (!selectedTx.value) return []
  
  const total = selectedTx.value.totalServiceFee || 1
  const agency = total * 0.5
  
  const listId = typeof selectedTx.value.listingAgentId === 'object' ? selectedTx.value.listingAgentId?._id : selectedTx.value.listingAgentId
  const sellId = typeof selectedTx.value.sellingAgentId === 'object' ? selectedTx.value.sellingAgentId?._id : selectedTx.value.sellingAgentId
  
  let listing = 0
  let selling = 0
  let unassigned = 0

  if (!sellId) {
     listing = total * 0.25
     unassigned = total * 0.25
  } else if (listId === sellId) {
     listing = total * 0.5
  } else {
     listing = total * 0.25
     selling = total * 0.25
  }

  const isSameAgent = listId === sellId && listId != null
  const agencyPct = (agency / total) * 100
  const listingPct = (listing / total) * 100
  const sellingPct = (selling / total) * 100
  const unassignedPct = (unassigned / total) * 100

  const sections = []
  
  sections.push({
    stroke: '#4f46e5', // indigo-600
    dash: `${agencyPct} ${100 - agencyPct}`,
    offset: 0,
    label: 'Company Share',
    value: agency,
    colorClass: 'bg-indigo-600'
  })
  
  if (isSameAgent) {
    sections.push({
      stroke: '#10b981', // emerald-500
      dash: `${listingPct} ${100 - listingPct}`,
      offset: -agencyPct,
      label: 'Listing & Selling Agent',
      name: selectedTx.value.listingAgentId?.name || 'Unknown',
      value: listing,
      colorClass: 'bg-emerald-500'
    })
  } else {
    sections.push({
      stroke: '#f59e0b', // amber-500
      dash: `${listingPct} ${100 - listingPct}`,
      offset: -agencyPct,
      label: 'Listing Agent',
      name: selectedTx.value.listingAgentId?.name || 'Unknown',
      value: listing,
      colorClass: 'bg-amber-500'
    })
    
    if (selling > 0) {
      sections.push({
        stroke: '#06b6d4', // cyan-500
        dash: `${sellingPct} ${100 - sellingPct}`,
        offset: -(agencyPct + listingPct),
        label: 'Selling Agent',
        name: selectedTx.value.sellingAgentId?.name || 'Unknown',
        value: selling,
        colorClass: 'bg-cyan-500'
      })
    } else if (unassigned > 0) {
      sections.push({
        stroke: '#e2e8f0', // slate-200
        dash: `${unassignedPct} ${100 - unassignedPct}`,
        offset: -(agencyPct + listingPct),
        label: 'Unassigned Selling Agent',
        name: 'Pending Assignment',
        value: 0,
        colorClass: 'bg-slate-200'
      })
    }
  }
  
  return sections
})

const sortedTransactions = computed(() => {
  return [...transStore.transactions].sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })
})

const canManage = (t) => {
  if (authStore.isAdmin) return true
  const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId
  const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId
  return authStore.user?._id === listId || authStore.user?._id === sellId
}
</script>

<template>
  <div class="w-full">
    <!-- Header Removed by User Request -->

    <!-- Cards -->
    <!-- Cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 mt-4 sm:mt-8">
      <!-- 1 -->
      <div class="p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-between">
        <h3 class="text-[9px] sm:text-[11px] font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest truncate">Total Company Profit</h3>
        <div class="flex items-baseline gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <span class="text-xl sm:text-3xl font-black text-slate-800">${{ stats.totalRevenue.toLocaleString('en-US') }}</span>
          <span class="text-slate-400 text-[10px] sm:text-xs font-bold">USD</span>
        </div>
        <div class="flex items-center gap-2 text-[10px]">
          <span class="text-emerald-500 flex items-center gap-1 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            {{ stats.completedCount }} Deals
          </span>
        </div>
      </div>
      <!-- 2 -->
      <div class="p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-between">
        <h3 class="text-[9px] sm:text-[11px] font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest truncate">Active Transactions</h3>
        <div class="flex items-baseline gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <span class="text-xl sm:text-3xl font-black text-slate-800">{{ stats.activeCount }}</span>
        </div>
        <div class="flex items-center gap-2 text-[10px]">
          <span class="text-indigo-500 flex items-center gap-1 font-black bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">
            In Progress
          </span>
        </div>
      </div>
      <!-- 3 -->
      <div class="p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-between">
        <h3 class="text-[9px] sm:text-[11px] font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest truncate">Completed Deals</h3>
        <div class="flex items-baseline gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <span class="text-xl sm:text-3xl font-black text-slate-800">{{ stats.completedCount }}</span>
        </div>
        <div class="flex items-center gap-2 text-[10px]">
          <span class="text-emerald-500 flex items-center gap-1 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
            Finalized
          </span>
        </div>
      </div>
      <!-- 4 -->
      <div class="p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-between">
        <h3 class="text-[9px] sm:text-[11px] font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest truncate">Total Listings</h3>
        <div class="flex items-baseline gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <span class="text-xl sm:text-3xl font-black text-slate-800">{{ stats.transactionCount }}</span>
        </div>
        <div class="flex items-center gap-2 text-[10px]">
          <span class="text-slate-500 flex items-center gap-1 font-black bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">
            Lifetime
          </span>
        </div>
      </div>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Recent Transactions Table -->
      <div class="lg:col-span-2 bg-white rounded-[2rem] shadow-[0_2px_10px_rgba(0,0,0,0.01)] border border-slate-100 flex flex-col overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 class="text-[13px] sm:text-[15px] font-black text-slate-800">Recent Transactions</h3>
          <NuxtLink to="/transactions" class="text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">View All →</NuxtLink>
        </div>
        
        <div class="overflow-x-auto min-h-[400px]">
          <table class="w-full text-left whitespace-nowrap">
            <thead class="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th class="px-4 sm:px-6 py-4 text-[8.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Name</th>
                <th class="px-4 sm:px-6 py-4 text-[8.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th class="px-4 sm:px-6 py-4 text-[8.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th class="px-4 sm:px-6 py-4 text-[8.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Fee</th>
                <th class="px-4 sm:px-6 py-4 text-[8.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="t in sortedTransactions.slice(0, 7)" :key="t._id" 
                  @click="transStore.selectTransaction(t._id)"
                  class="transition-colors group cursor-pointer"
                  :class="selectedTx?._id === t._id ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50/70'">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                         :class="selectedTx?._id === t._id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 group-hover:border-indigo-200'">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    </div>
                    <span class="text-[13px] font-bold text-slate-800">{{ t.title }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span v-if="t.status === 'completed'" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></span> Completed
                  </span>
                  <span v-else-if="t.status === 'agreement'" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"></span> Agreement
                  </span>
                  <span v-else-if="t.status === 'earnest_money'" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></span> Deposit
                  </span>
                  <span v-else-if="t.status === 'title_deed'" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm"></span> Title Deed
                  </span>
                  <span v-else-if="t.status === 'canceled'" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-red-50 text-red-600 border border-red-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm"></span> Canceled
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-slate-50 text-slate-600 border border-slate-200/60 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-sm"></span> {{ t.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-[12px] font-bold text-slate-500">
                  {{ t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'}) : '11 Feb 2024' }}
                </td>
                <td class="px-6 py-4 text-[13px] font-black text-slate-800 text-right">
                  ${{ t.totalServiceFee?.toLocaleString('en-US') }}
                </td>
                <td class="px-4 sm:px-6 py-4 text-center">
                  <button v-if="t.status !== 'completed' && t.status !== 'canceled' && canManage(t)" @click.stop="router.push(`/transactions/manage-${t._id}`)" 
                          class="bg-indigo-600 text-white text-[8.5px] sm:text-[10px] px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold shadow-sm hover:bg-indigo-800 hover:shadow-indigo-200 transition uppercase tracking-widest">
                    Manage
                  </button>
                  <button v-else @click.stop="router.push(`/transactions?view=${t._id}`)" 
                          class="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 text-[8.5px] sm:text-[10px] font-bold inline-flex items-center justify-center gap-1.5 uppercase tracking-widest px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg border border-emerald-200/50 shadow-sm transition">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="transStore.transactions.length === 0" class="p-8 text-center text-slate-400 text-sm font-medium">
            No records found.
          </div>
        </div>
      </div>

      <!-- Financial Chart (Donut) -->
      <div :class="['bg-white rounded-[2rem] shadow-[0_2px_10px_rgba(0,0,0,0.01)] border border-slate-100 p-8 flex flex-col items-center sticky top-24 h-fit transition-all', selectedTx?.status === 'canceled' ? 'grayscale opacity-60' : '']">
        <div class="w-full flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
           <h3 class="text-[15px] font-black text-slate-800">Financial Breakdown</h3>
           <div class="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md text-[9px] font-black text-indigo-600 uppercase tracking-widest">Analytics</div>
        </div>

        <div v-if="selectedTx" class="w-full flex flex-col items-center animate-fade-in">
          
          <div class="relative w-52 h-52 mb-8">
            <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90 filter drop-shadow-sm">
              <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#f8fafc" stroke-width="4"></circle>
              <circle v-for="(section, i) in chartData" :key="i"
                cx="18" cy="18" r="15.9155" fill="transparent" :stroke="section.stroke" stroke-width="4"
                :stroke-dasharray="section.dash" :stroke-dashoffset="section.offset"
                class="transition-all duration-1000 ease-out"
                stroke-linecap="round"
              ></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center pt-1">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap" :title="selectedTx.title">
                {{ selectedTx.title }}
              </span>
              <span class="text-2xl font-black text-slate-800 mt-0.5">${{ selectedTx.totalServiceFee?.toLocaleString('en-US') }}</span>
              <span class="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-1">USD TOTAL</span>
            </div>
          </div>

          <div class="w-full space-y-2.5">
            <div v-for="(section, i) in chartData" :key="i" class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 transition-colors hover:border-slate-200">
              <div class="flex items-center gap-3.5">
                <div class="w-2.5 h-2.5 rounded-sm shadow-sm" :class="section.colorClass"></div>
                <div>
                  <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">{{ section.label }}</p>
                  <p v-if="section.name" class="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    {{ section.name }}
                  </p>
                </div>
              </div>
              <p class="font-black text-slate-900 text-[13px]">${{ section.value?.toLocaleString('en-US') }}</p>
            </div>
          </div>

        </div>
        
        <div v-else class="flex flex-col items-center justify-center h-48 text-center w-full">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <span class="text-2xl opacity-50">📊</span>
          </div>
          <p class="text-sm font-bold text-slate-500">No transaction selected</p>
          <p class="text-[11px] text-slate-400 mt-2 px-4">Wait for completion or select a row to view the financial breakdown.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
</style>