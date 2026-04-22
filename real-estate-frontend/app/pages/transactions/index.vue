<script setup>
import { useTransactionStore } from '~/stores/transactions'
import { useAuthStore } from '~/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const store = useTransactionStore()
const router = useRouter()
const route = useRoute()

const searchQuery = ref('')
const statusFilter = ref('All')

// Prevent UI flash: clear synchronously if no view trigger
if (!route.query.view) {
  store.selectedTransaction = null
}

onMounted(async () => {
  await store.fetchTransactions()
  if (route.query.view) {
    store.selectTransaction(route.query.view)
  }
})
onUnmounted(() => {
  store.selectedTransaction = null
})

const activeTransactionsCount = computed(() => {
  return store.transactions.filter(t => t.status !== 'completed').length
})

const sortedTransactions = computed(() => {
  let list = [...store.transactions]
  
  if (statusFilter.value === 'Active') {
    list = list.filter(t => t.status !== 'completed' && t.status !== 'canceled')
  } else if (statusFilter.value === 'Completed') {
    list = list.filter(t => t.status === 'completed')
  } else if (statusFilter.value === 'Yours') {
    const myId = authStore.user?._id
    list = list.filter(t => {
       const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId
       const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId
       return myId === listId || myId === sellId
    })
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => 
      t.title?.toLowerCase().includes(q) ||
      getAgentName(t.listingAgentId)?.toLowerCase().includes(q) ||
      getAgentName(t.sellingAgentId)?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    )
  }
  
  return list.sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
})

const advanceStatus = (id, e) => {
  if (e) e.stopPropagation()
  router.push(`/transactions/manage-${id}`)
}

const openDrawer = (id) => {
  store.selectTransaction(id)
}

const showConfirmModal = ref(false)
const targetCancelId = ref(null)

const handleCancel = (id) => {
  targetCancelId.value = id
  showConfirmModal.value = true
}

const confirmCancel = async () => {
  if (!targetCancelId.value) return
  try {
    await store.updateTransaction(targetCancelId.value, { status: 'canceled' })
    store.closeDetail()
    showConfirmModal.value = false
    targetCancelId.value = null
    // Refresh list locally
    await store.fetchTransactions()
  } catch (e) {
    console.error('Cancel failed:', e)
    showConfirmModal.value = false
  }
}

// Stage Badges formatter matching screenshots
const formatStatusBadge = (status) => {
  const map = {
    agreement: { text: 'Agreement', class: 'bg-indigo-50 text-indigo-500' },
    earnest_money: { text: 'Earnest Money', class: 'bg-amber-100/60 text-amber-600' },
    title_deed: { text: 'Title Deed', class: 'bg-indigo-50 text-indigo-400' },
    completed: { text: 'Completed', class: 'bg-emerald-50 text-emerald-500' },
    canceled: { text: 'Canceled', class: 'bg-red-50 text-red-500 border border-red-100' }
  }
  return map[status] || { text: status, class: 'bg-slate-100 text-slate-600' }
}

const getAgentName = (agent) => {
  if (!agent) return 'Unknown';
  if (typeof agent === 'string') return agent;
  if (agent.name) return agent.name;
  return `${agent?.firstName || ''} ${agent?.lastName || ''}`.trim() || 'Unknown';
}

const getAgentPhoto = (agent) => {
  if (agent && typeof agent === 'object') return agent.photo;
  return null;
}

const getInitials = (name) => {
  if (!name || name === 'Unknown') return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Check if listing agent is exactly the same as selling agent
const isSameAgent = computed(() => {
  if (!store.selectedTransaction) return false
  const listId = typeof store.selectedTransaction.listingAgentId === 'object' ? store.selectedTransaction.listingAgentId?._id : store.selectedTransaction.listingAgentId
  const sellId = typeof store.selectedTransaction.sellingAgentId === 'object' ? store.selectedTransaction.sellingAgentId?._id : store.selectedTransaction.sellingAgentId
  return listId === sellId && listId != null
})

const hasSellingAgent = computed(() => {
  if (!store.selectedTransaction) return false
  const sellId = typeof store.selectedTransaction.sellingAgentId === 'object' ? store.selectedTransaction.sellingAgentId?._id : store.selectedTransaction.sellingAgentId
  return !!sellId
})

// Timeline Steps
const steps = [
  { id: 'agreement', name: 'Agreement', desc: 'Contract Signed' },
  { id: 'earnest_money', name: 'Earnest Money', desc: 'Deposit Received' },
  { id: 'title_deed', name: 'Title Deed', desc: 'Registry Process' },
  { id: 'completed', name: 'Completed', desc: 'Commission Disbursed' }
]

const getStepStatus = (stepId, currentStatus) => {
  const order = ['agreement', 'earnest_money', 'title_deed', 'completed']
  const stepIndex = order.indexOf(stepId)
  const currentIndex = order.indexOf(currentStatus)
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

const authStore = useAuthStore()

const canManage = (t) => {
  if (authStore.isAdmin) return true
  const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId
  const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId
  return authStore.user?._id === listId || authStore.user?._id === sellId
}

// Pagination
const currentPage = ref(1)
const itemsPerPage = 8

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return sortedTransactions.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(sortedTransactions.value.length / itemsPerPage))

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="relative w-full h-full text-slate-800">
    <div class="max-w-[1600px] w-full">
      
      <!-- List Header -->
      <div class="mb-6 flex flex-col gap-4 mt-2">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 class="text-[28px] sm:text-[42px] font-black text-[#0B1A40] tracking-tight leading-[1.1] mb-1 sm:mb-2">Transactions</h1>
            <p class="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest">
              MANAGING {{ activeTransactionsCount }} ESCROWS IN PROGRESS
            </p>
          </div>
          <NuxtLink to="/transactions/create" class="flex items-center gap-2 bg-[#5B4EFF] hover:bg-indigo-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-[13px] font-bold shadow-sm transition-colors cursor-pointer w-fit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            New Transaction
          </NuxtLink>
        </div>
        <!-- Search + Filter bar -->
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex items-center gap-3 bg-white px-4 py-2.5 border border-slate-100 rounded-[14px] shadow-sm flex-1">
            <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input v-model="searchQuery" type="text" placeholder="Search by Agent or Address" class="w-full text-[13px] font-bold focus:outline-none text-slate-600 placeholder-slate-400" />
          </div>
          <div class="bg-slate-50/80 flex items-center rounded-xl p-1 shadow-inner h-11 md:h-10 shrink-0 overflow-x-auto no-scrollbar">
             <button @click="statusFilter = 'All'" :class="['px-4 md:px-3 text-[11px] md:text-[12px] font-black h-full rounded-[8px] transition-all whitespace-nowrap', statusFilter === 'All' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-400 hover:text-[#0B1A40]']">All</button>
             <button @click="statusFilter = 'Active'" :class="['px-4 md:px-3 text-[11px] md:text-[12px] font-black h-full rounded-[8px] transition-all whitespace-nowrap', statusFilter === 'Active' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-400 hover:text-[#0B1A40]']">Active</button>
             <button @click="statusFilter = 'Completed'" :class="['px-4 md:px-3 text-[11px] md:text-[12px] font-black h-full rounded-[8px] transition-all whitespace-nowrap', statusFilter === 'Completed' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-400 hover:text-[#0B1A40]']">Completed</button>
             <button @click="statusFilter = 'Yours'" :class="['px-4 md:px-3 text-[11px] md:text-[12px] font-black h-full rounded-[8px] transition-all whitespace-nowrap', statusFilter === 'Yours' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-400 hover:text-[#0B1A40]']">Yours</button>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100/80 overflow-hidden mb-12">
        <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap text-left">
          <thead class="bg-slate-50/50 border-b border-slate-100/80">
            <tr>
              <th class="px-5 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
              <th class="hidden lg:table-cell px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Listing<br>Agent</th>
              <th class="hidden lg:table-cell px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Selling<br>Agent</th>
              <th class="px-4 sm:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee</th>
              <th class="px-4 sm:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
              <th class="hidden sm:table-cell px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th class="px-5 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100/60">
            <tr v-for="t in paginatedTransactions" :key="t._id" @click="openDrawer(t._id)" class="hover:bg-slate-50/40 transition-colors cursor-pointer group">
              <td class="px-5 sm:px-8 py-5">
                <div class="flex items-center gap-3 sm:gap-4">
                  <div class="hidden sm:flex w-12 h-12 rounded-[14px] bg-gradient-to-br from-indigo-50 to-slate-100 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/50 items-center justify-center">
                    <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[13px] sm:text-[14px] font-black text-[#0B1A40] truncate max-w-[120px] sm:max-w-none">{{ t.title }}</span>
                  </div>
                </div>
              </td>
              <td class="hidden lg:table-cell px-6 py-5">
                 <div class="flex flex-col text-[13px] font-medium text-[#0B1A40]">
                   {{ getAgentName(t.listingAgentId).split(' ')[0] }}<br>
                   {{ getAgentName(t.listingAgentId).split(' ').slice(1).join(' ') }}
                 </div>
              </td>
              <td class="hidden lg:table-cell px-6 py-5">
                 <div v-if="getAgentName(t.sellingAgentId) !== 'Unknown'" class="flex flex-col text-[13px] font-medium text-[#0B1A40]">
                   {{ getAgentName(t.sellingAgentId).split(' ')[0] }}<br>
                   {{ getAgentName(t.sellingAgentId).split(' ').slice(1).join(' ') }}
                 </div>
                 <div v-else class="text-[13px] font-medium text-slate-400 italic">
                    -
                 </div>
              </td>
              <td class="px-4 sm:px-6 py-5 text-[13px] sm:text-[14.5px] font-black text-[#0B1A40]">
                ${{ (t.totalServiceFee || 0).toLocaleString('en-US') }}
              </td>
              <td class="px-4 sm:px-6 py-5">
                <span :class="['px-2 sm:px-3.5 py-0.5 sm:py-1.5 rounded-full text-[8.5px] sm:text-[11.5px] font-black tracking-wide whitespace-nowrap', formatStatusBadge(t.status).class]">
                  {{ formatStatusBadge(t.status).text }}
                </span>
              </td>
              <td class="hidden sm:table-cell px-6 py-5">
                 <div class="text-[13px] font-bold text-slate-500 whitespace-nowrap">
                   {{ t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : '11 Feb 2024' }}
                 </div>
              </td>
              <td class="px-5 sm:px-8 py-5 text-right">
                <button v-if="t.status !== 'completed' && t.status !== 'canceled' && canManage(t)" @click="advanceStatus(t._id, $event)" class="bg-[#5B4EFF] hover:bg-indigo-700 text-white text-[8.5px] sm:text-[11px] font-black px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors shadow-sm uppercase tracking-wider">
                  Manage
                </button>
                <button v-else @click.stop="openDrawer(t._id)" class="inline-flex items-center justify-center bg-white text-slate-500 text-[8.5px] sm:text-[11px] font-black px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 border-dashed hover:bg-slate-50 hover:text-slate-700 transition-colors uppercase tracking-wider">
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-[13px] text-slate-400 font-medium">
            Showing <span class="font-bold text-slate-600">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> to <span class="font-bold text-slate-600">{{ Math.min(currentPage * itemsPerPage, sortedTransactions.length) }}</span> of <span class="font-bold text-slate-600">{{ sortedTransactions.length }}</span> properties
          </div>
          <div class="flex items-center gap-2">
            <button @click="currentPage--" :disabled="currentPage === 1" class="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div class="flex items-center gap-1">
              <button v-for="p in totalPages" :key="p" @click="currentPage = p" :class="['w-10 h-10 rounded-xl text-[13px] font-bold transition-all', currentPage === p ? 'bg-[#5B4EFF] text-white shadow-md' : 'hover:bg-slate-50 text-slate-500']">{{ p }}</button>
            </div>
            <button @click="currentPage++" :disabled="currentPage === totalPages" class="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>


    <!-- Right Drawer (Financial Breakdown) -->
    <div v-if="store.selectedTransaction" class="fixed inset-0 z-50 flex justify-end">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/10 transition-opacity" @click="store.closeDetail()"></div>
      
      <!-- Drawer Panel -->
      <div class="relative w-full sm:max-w-[1100px] bg-[#fcfcfc] h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        
        <!-- Absolute Close Button -->
        <button @click="store.closeDetail()" class="absolute top-4 sm:top-8 right-4 sm:right-8 w-11 h-11 bg-white border border-slate-100 rounded-full flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm z-[60] group cursor-pointer">
          <svg class="w-5 h-5 text-slate-400 group-hover:text-[#5B4EFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div class="px-5 py-8 sm:p-10 relative">
          <!-- Breadcrumbs -->
          <div class="text-[9px] sm:text-[11px] font-bold text-slate-400 mb-4 sm:mb-6 flex flex-wrap items-center gap-2 tracking-widest uppercase relative z-10 w-full pr-12 sm:pr-20">
            <span class="cursor-pointer hover:text-slate-600 border border-slate-200 border-dashed px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md" @click="store.closeDetail()">Transactions</span>
            <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            <span class="text-slate-500">TRX-{{ store.selectedTransaction._id.slice(-5).toUpperCase() }}</span>
            <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            <span class="text-[#0B1A40]">Financial Breakdown</span>
          </div>

          <div class="mb-6 sm:mb-8">
            <h2 class="text-2xl sm:text-4xl font-black text-[#0B1A40] tracking-tight mb-2">Financial Breakdown</h2>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p class="text-[12px] sm:text-[13px] font-medium text-slate-500">
                {{ store.selectedTransaction.title || store.selectedTransaction.location || 'Unknown Property' }} • {{ store.selectedTransaction.status === 'completed' ? 'Closed' : 'Updated' }} {{ store.selectedTransaction.updatedAt ? new Date(store.selectedTransaction.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : '' }}
              </p>
              <button v-if="canManage(store.selectedTransaction) && store.selectedTransaction.status !== 'completed' && store.selectedTransaction.status !== 'canceled'" @click="handleCancel(store.selectedTransaction._id)" class="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 px-2 py-1 rounded bg-red-50/50 hover:bg-red-50 w-fit">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                Cancel Transaction
              </button>
            </div>
          </div>

          <!-- Purple Card (Total Gross) -->
          <div class="bg-[#4438E8] rounded-[20px] sm:rounded-[24px] px-6 sm:px-10 py-8 sm:py-12 flex flex-col sm:flex-row justify-between items-start sm:items-center text-white relative overflow-hidden mb-8 shadow-[0_8px_30px_rgba(68,56,232,0.3)] gap-6">
            <div class="z-10 flex flex-col justify-center">
              <div class="text-[9px] sm:text-[11px] font-bold text-[#A8A1F8] tracking-widest uppercase mb-1">Total Gross Commission</div>
              <div class="text-[26px] sm:text-[56px] leading-[1.1] font-black tracking-tight">${{ (store.selectedTransaction.totalServiceFee || 0).toLocaleString('en-US') }}<span class="text-[14px] sm:text-[32px] text-[#A8A1F8] font-bold ml-1">.00</span></div>
            </div>
            
            <div class="z-10 flex flex-col items-start sm:items-end gap-3">
               <div class="text-[16px] sm:text-[20px] font-bold tracking-wide">{{ store.selectedTransaction.title.substring(0, 30) }}{{ store.selectedTransaction.title.length > 30 ? '...' : '' }}</div>
               <div v-if="store.selectedTransaction.status === 'completed'" class="bg-[#058B5E] text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-[13px] font-bold flex items-center gap-2 border border-[#047750] shadow-sm">
                 <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 Completed
               </div>
               <div v-else-if="store.selectedTransaction.status === 'canceled'" class="bg-red-500 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-[13px] font-bold flex items-center gap-2 border border-red-600 shadow-sm">
                 <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                 Canceled
               </div>
               <div v-else class="bg-amber-500 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-[13px] font-bold flex items-center gap-2 border border-amber-600 shadow-sm">
                 <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                 In Progress
               </div>
            </div>
          </div>

          <!-- Layout below banner -->
          <div class="flex flex-col lg:flex-row gap-6 w-full items-start">
            <!-- Left Col (Splits) -->
            <div class="contents lg:block lg:flex-1 lg:min-w-[500px]">
              <div :class="['bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all order-2 lg:order-none', store.selectedTransaction.status === 'canceled' ? 'grayscale opacity-60' : '']">
                <!-- Title -->
                <div class="flex items-center gap-3 mb-5 sm:mb-8">
                  <div class="w-[20px] h-[20px] sm:w-[26px] sm:h-[26px] rounded-full bg-[#5B4EFF] flex items-center justify-center shrink-0">
                    <!-- Icon resembling a pie chart slice -->
                    <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2v10l8.8 5.1c.8-1.5 1.2-3.3 1.2-5.1C22 6.5 17.5 2 12 2z"/><path d="M10 2.2C4.5 3.1 0 8 0 14c0 6.6 5.4 12 12 12s12-5.4 12-12c0-.5 0-1-.1-1.5L10 6V2.2z" opacity="0.3"/></svg>
                  </div>
                  <h3 class="text-[16px] sm:text-[22px] font-black text-[#0B1A40]">Commission Split</h3>
                </div>

                <!-- Brokerage Split -->
                <div class="flex items-center justify-between bg-slate-50 rounded-[20px] p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-100">
                   <div class="flex items-center gap-3 sm:gap-4">
                     <span class="bg-indigo-100/60 text-indigo-600 text-[10px] sm:text-[12px] font-black px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-indigo-200/50">50%</span>
                     <div>
                       <div class="text-[13px] sm:text-[15px] font-black text-[#0B1A40]">Brokerage Share</div>
                       <div class="text-[10px] sm:text-[12px] font-medium text-slate-500">EstateSync Split</div>
                     </div>
                   </div>
                   <div class="text-right">
                     <div class="text-[14px] sm:text-[18px] font-black text-[#0B1A40]">${{ ((store.selectedTransaction.totalServiceFee || 0) * 0.5).toLocaleString('en-US') }}<span class="text-[10px] sm:text-[12px] text-slate-400">.00</span></div>
                     <div class="text-[9px] sm:text-[11px] font-bold text-slate-400">Retained</div>
                   </div>
                </div>

                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Agent Distribution Pool (50%)</div>
                
                <div class="space-y-4">
                  <!-- IF SAME AGENT OR NO SELLING AGENT YET: 1 row of 100% distribution -->
                  <div v-if="isSameAgent || !hasSellingAgent" class="flex flex-col gap-3 sm:gap-4">
                    <div :class="['flex items-center justify-between p-4 sm:p-5 border border-slate-100 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.01)] transition-all', store.selectedTransaction.status === 'canceled' ? 'opacity-50 grayscale bg-slate-50' : 'hover:border-indigo-100 hover:shadow-md']">
                      <div class="flex items-center gap-3 sm:gap-4">
                         <div class="w-[36px] h-[36px] sm:w-[46px] sm:h-[46px] rounded-[10px] sm:rounded-[14px] overflow-hidden bg-indigo-500 border border-indigo-100 shrink-0 flex items-center justify-center text-white text-[12px] sm:text-[14px] font-black">
                           <img v-if="getAgentPhoto(store.selectedTransaction.listingAgentId)" :src="getAgentPhoto(store.selectedTransaction.listingAgentId)" class="w-full h-full object-cover" />
                           <span v-else>{{ getInitials(getAgentName(store.selectedTransaction.listingAgentId)) }}</span>
                         </div>
                         <div>
                           <div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2.5 mb-0.5 sm:mb-1">
                             <div class="text-[13px] sm:text-[15px] font-black text-[#0B1A40]">{{ getAgentName(store.selectedTransaction.listingAgentId) }}</div>
                             <span v-if="isSameAgent" class="bg-indigo-50 text-indigo-500 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">Listing & Selling</span>
                             <span v-else class="bg-indigo-50 text-indigo-500 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">Listing</span>
                           </div>
                           <div class="text-[10px] sm:text-[12px] font-medium text-slate-500">100% of Pool</div>
                         </div>
                      </div>
                      <div class="text-right">
                        <div class="text-[14px] sm:text-[18px] font-black text-[#0B1A40] mb-0.5">${{ ((store.selectedTransaction.totalServiceFee || 0) * 0.5).toLocaleString('en-US') }}<span class="text-[10px] sm:text-[12px] text-slate-400">.00</span></div>
                        <div v-if="store.selectedTransaction.status === 'completed'" class="text-[9px] sm:text-[11px] font-bold text-emerald-500 flex items-center justify-end gap-1 px-1 sm:px-2 py-0.5"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg> Paid</div>
                        <div v-else-if="store.selectedTransaction.status === 'canceled'" class="text-[9px] sm:text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1 px-1 sm:px-2 py-0.5"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg></div>
                        <div v-else class="text-[9px] sm:text-[11px] font-bold text-amber-500 flex items-center justify-end gap-1 px-1 sm:px-2 py-0.5"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> In Progress</div>
                      </div>
                    </div>

                    <!-- Unassigned Ghost Row -->
                    <div v-if="!hasSellingAgent" class="flex items-center justify-between p-5 border border-slate-100/50 rounded-[20px] shadow-none bg-slate-50/50 opacity-70">
                      <div class="flex items-center gap-4">
                         <div class="w-[46px] h-[46px] rounded-[14px] overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center">
                           <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                         </div>
                         <div>
                           <div class="flex items-center gap-2.5 mb-1">
                             <div class="text-[15px] font-black text-slate-500">Pending Assignment</div>
                             <span class="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Unassigned</span>
                           </div>
                           <div class="text-[12px] font-medium text-slate-400">Selling Agent</div>
                         </div>
                      </div>
                      <div class="text-right">
                        <div class="text-[18px] font-black text-slate-400 mb-0.5">$0<span class="text-[12px] text-slate-400">.00</span></div>
                        <div class="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1 px-2 py-0.5">Pending</div>
                      </div>
                    </div>
                  </div>

                  <!-- IF DIFFERENT AGENTS: 2 rows of 50% distribution -->
                  <template v-else>
                    <!-- Listing Agent -->
                    <div :class="['flex items-center justify-between p-5 border border-slate-100 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.01)] transition-all', store.selectedTransaction.status === 'canceled' ? 'opacity-50 grayscale bg-slate-50' : 'hover:border-indigo-100 hover:shadow-md']">
                      <div class="flex items-center gap-4">
                         <div class="w-[46px] h-[46px] rounded-[14px] overflow-hidden bg-indigo-500 border border-indigo-100 shrink-0 flex items-center justify-center text-white text-[14px] font-black">
                           <img v-if="getAgentPhoto(store.selectedTransaction.listingAgentId)" :src="getAgentPhoto(store.selectedTransaction.listingAgentId)" class="w-full h-full object-cover" />
                           <span v-else>{{ getInitials(getAgentName(store.selectedTransaction.listingAgentId)) }}</span>
                         </div>
                         <div>
                           <div class="flex items-center gap-2.5 mb-1">
                             <div class="text-[15px] font-black text-[#0B1A40]">{{ getAgentName(store.selectedTransaction.listingAgentId) }}</div>
                             <span class="bg-indigo-50 text-indigo-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Listing</span>
                           </div>
                           <div class="text-[12px] font-medium text-slate-500">50% of Agent Pool</div>
                         </div>
                      </div>
                      <div class="text-right">
                        <div class="text-[18px] font-black text-[#0B1A40] mb-0.5">${{ ((store.selectedTransaction.totalServiceFee || 0) * 0.25).toLocaleString('en-US') }}<span class="text-[12px] text-slate-400">.00</span></div>
                        <div v-if="store.selectedTransaction.status === 'completed'" class="text-[11px] font-bold text-emerald-500 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg> Paid</div>
                        <div v-else-if="store.selectedTransaction.status === 'canceled'" class="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg></div>
                        <div v-else class="text-[11px] font-bold text-amber-500 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> In Progress</div>
                      </div>
                    </div>
                    
                    <!-- Selling Agent -->
                    <div :class="['flex items-center justify-between p-5 border border-slate-100 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.01)] transition-all', store.selectedTransaction.status === 'canceled' ? 'opacity-50 grayscale bg-slate-50' : 'hover:border-indigo-100 hover:shadow-md']">
                      <div class="flex items-center gap-4">
                         <div class="w-[46px] h-[46px] rounded-[14px] overflow-hidden bg-indigo-500 border border-indigo-100 shrink-0 flex items-center justify-center text-white text-[14px] font-black">
                           <img v-if="getAgentPhoto(store.selectedTransaction.sellingAgentId)" :src="getAgentPhoto(store.selectedTransaction.sellingAgentId)" class="w-full h-full object-cover" />
                           <span v-else>{{ getInitials(getAgentName(store.selectedTransaction.sellingAgentId)) }}</span>
                         </div>
                         <div>
                           <div class="flex items-center gap-2.5 mb-1">
                             <div class="text-[15px] font-black text-[#0B1A40]">{{ getAgentName(store.selectedTransaction.sellingAgentId) }}</div>
                             <span class="bg-indigo-50 text-indigo-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Selling</span>
                           </div>
                           <div class="text-[12px] font-medium text-slate-500">50% of Agent Pool</div>
                         </div>
                      </div>
                      <div class="text-right">
                        <div class="text-[18px] font-black text-[#0B1A40] mb-0.5">${{ ((store.selectedTransaction.totalServiceFee || 0) * 0.25).toLocaleString('en-US') }}<span class="text-[12px] text-slate-400">.00</span></div>
                        <div v-if="store.selectedTransaction.status === 'completed'" class="text-[11px] font-bold text-emerald-500 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg> Paid</div>
                        <div v-else-if="store.selectedTransaction.status === 'canceled'" class="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg></div>
                        <div v-else class="text-[11px] font-bold text-amber-500 flex items-center justify-end gap-1 px-2 py-0.5"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> In Progress</div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Right col (Info & Timelines) -->
            <div class="contents lg:flex lg:flex-col lg:max-w-[320px] gap-6">
              
              <!-- Timeline/Stepper -->
              <div class="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-[20px] p-6 relative order-1 lg:order-none">
                 <div class="font-black text-[#0B1A40] mb-6 flex items-center gap-2 text-[15px]">
                   <svg class="w-4 h-4 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   Transaction Timeline
                 </div>
                 
                 <div :class="['relative pl-3 border-l border-slate-200/80 space-y-7 ml-3 mb-2', store.selectedTransaction.status === 'canceled' ? 'grayscale opacity-50' : '']">
                   <div v-for="(step, index) in steps" :key="index" class="relative">
                     <!-- Indicator -->
                     <span v-if="getStepStatus(step.id, store.selectedTransaction.status) === 'completed'" class="absolute -left-[18px] w-3 h-3 rounded-full bg-[#5B4EFF] ring-4 ring-indigo-50"></span>
                     <span v-else-if="getStepStatus(step.id, store.selectedTransaction.status) === 'current'" class="absolute -left-[19px] w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-50 shadow-sm"></span>
                     <span v-else class="absolute -left-[17px] w-2.5 h-2.5 rounded-full bg-slate-200 ring-4 ring-white"></span>
                     
                     <!-- Text -->
                     <div class="pl-4 flex items-center justify-between gap-4 w-full">
                       <div>
                         <div :class="['text-[13px] font-bold', getStepStatus(step.id, store.selectedTransaction.status) === 'upcoming' ? 'text-slate-400' : 'text-[#0B1A40]']">{{ step.name }}</div>
                         <div class="text-[11px] font-medium text-slate-500 mt-0.5">{{ step.desc }}</div>
                       </div>
                       
                        <!-- Manage Shortcut -->
                        <button v-if="getStepStatus(step.id, store.selectedTransaction.status) === 'current' && canManage(store.selectedTransaction) && store.selectedTransaction.status !== 'canceled' && store.selectedTransaction.status !== 'completed'" 
                                @click="advanceStatus(store.selectedTransaction._id, $event)"
                                class="bg-white border border-indigo-200 text-[#5B4EFF] text-[10px] font-black px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors uppercase tracking-wider shadow-sm shrink-0">
                          Manage
                        </button>
                     </div>
                   </div>
                 </div>
              </div>

              <!-- Calculation Logic Info -->
              <div class="bg-[#F8F9FB] border border-slate-100 rounded-[20px] p-6 relative overflow-hidden group order-3 lg:order-none">
                 <div class="flex items-center gap-2 font-black text-[#0B1A40] mb-4 text-[14px]">
                   <svg class="w-4 h-4 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                   Calculation Logic
                 </div>
                 <p class="mb-5 leading-relaxed text-[12.5px] text-slate-600 font-medium">
                   This transaction involved separate Listing and Selling agents. Per company policy, the Agent Distribution Pool (remaining 50% after Brokerage Share) is split equally (50/50).
                 </p>
                 <div class="bg-white rounded-[12px] p-3.5 text-[12px] border border-slate-200 border-dashed space-y-2.5 shadow-sm">
                   <div class="flex justify-between items-center">
                     <span class="text-slate-500 font-medium">If agents identical:</span>
                     <span class="font-black text-[#0B1A40]">100% to agent</span>
                   </div>
                   <div class="flex justify-between items-center">
                     <span class="text-slate-500 font-medium">If agents different:</span>
                     <span class="font-black text-[#0B1A40]">50/50 split</span>
                   </div>
                 </div>
              </div>

              
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Glass Backdrop -->
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showConfirmModal = false"></div>
        
        <!-- Modal Card -->
        <div class="relative bg-white rounded-[32px] p-8 sm:p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 fade-in duration-200">
            <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 class="text-[26px] font-black text-center text-[#0B1A40] mb-3 tracking-tight">Cancel Transaction?</h3>
            <p class="text-center text-slate-500 font-medium text-[15px] mb-10 leading-relaxed">
              Are you sure you want to cancel <span class="font-bold text-slate-700">TRX-{{ (targetCancelId || '').slice(-5).toUpperCase() }}</span>? This action is permanent and cannot be undone.
            </p>
            <div class="flex flex-col sm:flex-row gap-3">
                <button @click="showConfirmModal = false" class="flex-1 px-6 py-4 rounded-2xl border border-slate-200 font-bold text-slate-500 text-[14px] hover:bg-slate-50 transition-colors order-2 sm:order-1">
                  Keep Active
                </button>
                <button @click="confirmCancel" class="flex-1 px-6 py-4 rounded-2xl bg-red-500 text-white font-black text-[14px] hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-[0.98] order-1 sm:order-2">
                  Yes, Cancel
                </button>
            </div>
        </div>
    </div>
  </div>
</template>