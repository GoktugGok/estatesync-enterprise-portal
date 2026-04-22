<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionStore } from '~/stores/transactions'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const store = useTransactionStore()

// Prevent UI flash: clear synchronously if no view trigger
if (!route.query.view || route.query.view === 'undefined') {
  store.selectedTransaction = null
}
const authStore = useAuthStore()

const transactionId = route.params.id

const transaction = ref(store.transactions.find(tx => tx._id === transactionId) || null)
const loading = ref(!transaction.value)
const selectedStage = ref(transaction.value?.status || 'agreement')
const selectedSellingAgent = ref(
  typeof transaction.value?.sellingAgentId === 'object' 
    ? transaction.value.sellingAgentId?._id 
    : (transaction.value?.sellingAgentId || '')
)
const errorMsg = ref('')
const successMsg = ref('')

// Stage transition flow: Agreement -> Earnest Money -> Title Deed -> Completed

const isDropdownOpen = ref(false)
const toggleDropdown = (e) => {
  if (!canManage.value) return
  e.stopPropagation()
  isDropdownOpen.value = !isDropdownOpen.value
}
const closeDropdown = () => {
  isDropdownOpen.value = false
}
 
const showConfirmModal = ref(false)

const agents = ref([])
const selectableAgents = computed(() => agents.value.filter(a => a.role !== 'admin'))

// Stages definition
const stages = [
  { id: 'agreement', name: 'Agreement', desc: 'Contract signed and verified by all parties.' },
  { id: 'earnest_money', name: 'Earnest Money', desc: 'Deposit received in escrow account.' },
  { id: 'title_deed', name: 'Title Deed', desc: 'Transfer of legal ownership documents.' },
  { id: 'completed', name: 'Completed', desc: 'Final settlement and transaction closed.' }
]

const stageOrder = ['agreement', 'earnest_money', 'title_deed', 'completed']

// Fetch data
onMounted(async () => {
  if (!authStore.isLoggedIn) {
     router.push('/login')
     return
  }
  try {
    // 1. If we don't have the transaction yet, fetch it
    if (!transaction.value) {
      loading.value = true
      await store.fetchTransactions()
      const t = store.transactions.find(tx => tx._id === transactionId)
      if (!t) {
        router.push('/transactions')
        return
      }
      transaction.value = t
      selectedStage.value = t.status || 'agreement'
      selectedSellingAgent.value = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : (t.sellingAgentId || '')
    }

    // 2. Fetch agents for the dropdown in the background
    const config = useRuntimeConfig()
    const data = await $fetch(`${config.public.apiBase}/users`)
    if (data && Array.isArray(data)) {
      agents.value = data
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

const getAgentName = (id) => {
   if (!id) return ''
   // 1. Check if it's in the full agents list (most reliable for name changes)
   const agent = agents.value.find(a => a._id === id)
   if (agent) return agent.name
   
   // 2. Immediate fallback: Check if the transaction object already has this agent populated
   if (transaction.value) {
     const listId = typeof transaction.value.listingAgentId === 'object' ? transaction.value.listingAgentId?._id : transaction.value.listingAgentId
     const sellId = typeof transaction.value.sellingAgentId === 'object' ? transaction.value.sellingAgentId?._id : transaction.value.sellingAgentId
     
     if (listId === id && typeof transaction.value.listingAgentId === 'object') {
       return transaction.value.listingAgentId.name
     }
     if (sellId === id && typeof transaction.value.sellingAgentId === 'object') {
       return transaction.value.sellingAgentId.name
     }
   }

   return 'Loading...'
}

const currentListingAgentId = computed(() => {
   if (!transaction.value) return null
   return typeof transaction.value.listingAgentId === 'object' ? transaction.value.listingAgentId?._id : transaction.value.listingAgentId
})

const isSellingAgentRequired = computed(() => {
  return selectedStage.value !== 'agreement'
})

const showSellingAgentWarning = computed(() => {
  return isSellingAgentRequired.value && !selectedSellingAgent.value
})

const isValid = computed(() => {
  if (isSellingAgentRequired.value && !selectedSellingAgent.value) return false
  return true
})

const totalPool = computed(() => {
  return transaction.value ? transaction.value.totalServiceFee : 0
})

const financialSplit = computed(() => {
  const total = totalPool.value
  const brokerage = total * 0.5
  const pool = total * 0.5
  
  let list = 0
  let sell = 0
  
  // Ensure we compare strings to avoid object/string mismatch issues
  const listId = String(currentListingAgentId.value || '')
  const sellId = String(selectedSellingAgent.value || '')

  if (!sellId) {
    // No selling agent assigned: Listing agent gets everything in pool
    list = pool
    sell = 0
  } else if (listId === sellId) {
    // Same agent for listing and selling: Listing agent gets everything in pool
    list = pool
    sell = 0
  } else {
    // Different agents: split pool 50/50 (25% total each)
    list = pool / 2
    sell = pool / 2
  }
  
  return { brokerage, list, sell }
})

const isSameAgentLocal = computed(() => {
  const listId = String(currentListingAgentId.value || '')
  const sellId = String(selectedSellingAgent.value || '')
  return listId === sellId && !!sellId
})

const saveChanges = async () => {
  if (!isValid.value) return
  
  try {
    loading.value = true
    const payload = {
       status: selectedStage.value,
       sellingAgentId: selectedSellingAgent.value || null
    }
    
    await store.updateTransaction(transactionId, payload)
    
    successMsg.value = 'Stage successfully updated!'
    setTimeout(() => {
      router.push('/transactions')
    }, 1000)
    
  } catch(e) {
    console.error('Update failed:', e)
    errorMsg.value = e.data?.message || 'Failed to update transaction status. Ensure you are moving forward in the workflow.'
    loading.value = false
  }
}

const cancelTransaction = async () => {
  showConfirmModal.value = true
}

const confirmCancel = async () => {
  showConfirmModal.value = false
  loading.value = true
  try {
    await store.updateTransaction(transactionId, { status: 'canceled' })
    successMsg.value = 'Transaction successfully canceled'
    setTimeout(() => {
      router.push('/transactions')
    }, 1000)
  } catch (e) {
    console.error('Cancel failed:', e)
    errorMsg.value = e.data?.message || 'Failed to cancel transaction.'
    loading.value = false
  }
}

const currentSellingAgentIdOriginal = computed(() => {
   if (!transaction.value) return null
   return typeof transaction.value.sellingAgentId === 'object' ? transaction.value.sellingAgentId?._id : transaction.value.sellingAgentId
})

const canManage = computed(() => {
  if (authStore.user?.role === 'admin') return true
  const myId = authStore.user?._id
  return myId === currentListingAgentId.value || myId === currentSellingAgentIdOriginal.value
})

// Stepper Logic
const isStepActiveOrPast = (stepId) => {
  const currentIndex = stageOrder.indexOf(selectedStage.value)
  const stepIndex = stageOrder.indexOf(stepId)
  return stepIndex <= currentIndex
}
const isStepCurrent = (stepId) => {
  return selectedStage.value === stepId
}

const VALID_TRANSITIONS = {
  agreement: 'earnest_money',
  earnest_money: 'title_deed',
  title_deed: 'completed',
  completed: null
}
</script>

<template>
  <div v-if="loading && !transaction" class="p-10 flex justify-center items-center h-full">
    <svg class="w-8 h-8 text-[#5B4EFF] animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
  </div>

  <div v-else class="max-w-[1100px] mx-auto py-8 text-[#0B1A40]">
    
    <!-- Top Stepper Component -->
    <div class="mb-12 border-b border-slate-100 pb-8 flex items-start justify-between relative px-10">
       <div class="absolute inset-0 top-[20px] left-[10%] right-[10%] h-0.5 bg-slate-100 -z-10"></div>
       <div class="absolute inset-0 top-[20px] left-[10%] h-0.5 bg-[#5B4EFF] -z-10 transition-all duration-300" :style="{ width: ((stageOrder.indexOf(selectedStage) / (stageOrder.length - 1)) * 80) + '%' }"></div>
       
       <div v-for="step in stages" :key="step.id" class="flex flex-col items-center gap-3 relative z-10 w-[25%]" :class="canManage ? 'cursor-pointer' : 'cursor-default'" @click="canManage && (selectedStage = step.id)">
         <div :class="['w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ring-4 ring-white', isStepCurrent(step.id) ? 'bg-[#5B4EFF] ring-indigo-50 shadow-indigo-200' : (isStepActiveOrPast(step.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300')]">
           <svg v-if="isStepActiveOrPast(step.id) && !isStepCurrent(step.id)" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
           <div v-else-if="isStepCurrent(step.id)" class="w-3 h-3 bg-white rounded-full"></div>
         </div>
         <span :class="['text-[11px] font-black uppercase tracking-widest text-center', isStepCurrent(step.id) ? 'text-[#5B4EFF]' : (isStepActiveOrPast(step.id) ? 'text-emerald-500' : (step.id === VALID_TRANSITIONS[transaction?.status] ? 'text-indigo-400 animate-pulse' : 'text-slate-400'))]">{{ step.name }}</span>
       </div>
    </div>

    <!-- Error Toast -->
    <div v-if="errorMsg" class="mb-8 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
      <svg class="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span class="text-[14px] font-bold">{{ errorMsg }}</span>
    </div>

    <!-- Success Toast -->
    <div v-if="successMsg" class="mb-8 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-[14px] font-bold">{{ successMsg }}</span>
      </div>
      <svg class="w-5 h-5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
    </div>

    <div class="flex flex-col lg:flex-row items-start gap-8">
      
      <!-- Left Column: Stage Selection & Forms -->
      <div class="flex-1">
         
         <div class="flex items-center gap-4 mb-6">
            <button @click="router.push('/transactions')" class="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm cursor-pointer shrink-0">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h2 class="text-[18px] sm:text-[22px] font-black tracking-tight text-[#0B1A40]">{{ canManage ? 'Select Next Stage' : 'Transaction Status' }}</h2>
          </div>

         <!-- Cards Grid -->
         <div class="grid grid-cols-2 gap-4 mb-8">
           <div v-for="step in stages" :key="'card'+step.id" @click="canManage && (selectedStage = step.id)" :class="['relative p-6 rounded-2xl border-2 transition-all duration-200 overflow-hidden', canManage ? 'cursor-pointer' : 'cursor-default', selectedStage === step.id ? 'border-[#5B4EFF] shadow-[0_10px_30px_rgba(91,78,255,0.1)] bg-white' : 'border-slate-100 bg-white hover:border-indigo-100 hover:shadow-md']">
             
             <!-- Decorator blob -->
             <div v-if="selectedStage === step.id" class="absolute -right-10 -top-10 w-32 h-32 bg-indigo-50 rounded-full opacity-50 pointer-events-none"></div>

             <div class="flex justify-between items-start mb-4 relative z-10">
               <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', selectedStage === step.id ? 'bg-[#5B4EFF] text-white shadow-sm' : 'bg-slate-50 text-slate-400']">
                 <svg v-if="step.id === 'agreement'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 <svg v-if="step.id === 'earnest_money'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                 <svg v-if="step.id === 'title_deed'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                 <svg v-if="step.id === 'completed'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               </div>
               
               <div :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', selectedStage === step.id ? 'border-[#5B4EFF] bg-[#5B4EFF]' : (isStepActiveOrPast(step.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-white')]">
                  <div v-if="selectedStage === step.id" class="w-2 h-2 bg-white rounded-full"></div>
                  <svg v-else-if="isStepActiveOrPast(step.id)" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
               </div>
             </div>
             
             <div class="relative z-10">
               <h3 :class="['text-[16px] font-black tracking-tight mb-1', selectedStage === step.id ? 'text-[#5B4EFF]' : 'text-[#0B1A40]']">{{ step.name }}</h3>
               <p class="text-[12px] font-medium text-slate-500 leading-snug">{{ step.desc }}</p>
             </div>
           </div>
         </div>

         <!-- Selling Agent Assignment Block -->
         <div class="bg-indigo-50/30 rounded-3xl p-8 border border-white shadow-[0_4px_30px_rgba(0,0,0,0.02)] relative">
           <h3 class="text-[18px] font-black text-[#0B1A40] mb-2 tracking-tight">Assign Selling Agent</h3>
           <p class="text-[13px] font-medium text-slate-500 mb-6 max-w-[80%]">Required for the 'Earnest Money' stage and beyond to accurately split commissions.</p>
           
           <div v-if="showSellingAgentWarning" class="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start gap-3">
             <div class="mt-0.5">
               <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             </div>
             <div>
               <div class="text-[13px] font-black text-red-700">Action Required</div>
               <div class="text-[12px] font-medium text-red-600 mt-0.5">A Selling Agent must be assigned to move to this stage.</div>
             </div>
           </div>
           
           <div>
              <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Selling Agent</label>
              <div class="relative cursor-pointer" @click="toggleDropdown($event)">
                 <div :class="['w-full bg-white border rounded-xl px-4 py-3.5 text-[14px] font-bold flex justify-between items-center transition-all', !canManage ? 'opacity-75 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-indigo-200', showSellingAgentWarning ? 'border-red-300 text-red-700' : 'border-slate-200 text-[#0B1A40]', isDropdownOpen ? 'ring-2 ring-indigo-100 border-indigo-300 shadow-sm' : '']">
                    <span>{{ getAgentName(selectedSellingAgent) || 'Select Agent...' }}</span>
                    <svg :class="['w-5 h-5 transition-transform duration-200', isDropdownOpen ? 'rotate-180 text-[#5B4EFF]' : 'text-slate-400']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>

                 <!-- Custom Dropdown Menu -->
                 <div v-if="isDropdownOpen && canManage" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    <div class="px-5 py-2 hover:bg-slate-50 cursor-pointer text-[#0B1A40] border-b border-slate-50 transition-colors" @click.stop="selectedSellingAgent = ''; isDropdownOpen = false">
                       <span class="text-[13px] font-medium text-slate-400 italic">Clear (Remove)</span>
                    </div>
                    <div class="max-h-[220px] overflow-y-auto custom-scroll">
                      <div v-for="agent in selectableAgents" :key="agent._id" @click.stop="selectedSellingAgent = agent._id; isDropdownOpen = false" class="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-[#0B1A40] transition-colors border-b border-slate-50 last:border-0">
                         <span :class="['text-[13px]', selectedSellingAgent === agent._id ? 'font-black text-[#5B4EFF]' : 'font-medium']">{{ agent.name }}</span>
                         <svg v-if="selectedSellingAgent === agent._id" class="w-4 h-4 text-[#5B4EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                 </div>
              </div>
           </div>
         </div>
         
      </div>

      <!-- Right Column: Financial Breakdown -->
      <div class="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-10 flex flex-col gap-6">
        
        <!-- Breakdown Card -->
        <div class="bg-white rounded-3xl border border-slate-100 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border-t-4 border-t-[#5B4EFF] relative">
          
          <div class="flex items-center justify-between gap-3 mb-6">
            <div class="flex items-center gap-3">
               <svg class="w-6 h-6 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
               <h3 class="text-[20px] font-black text-[#0B1A40]">Financial Breakdown</h3>
            </div>
            <button v-if="canManage && transaction.status !== 'completed' && transaction.status !== 'canceled'" @click="cancelTransaction" class="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors flex items-center gap-1">
               <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               Cancel
            </button>
          </div>

          <div class="mb-4">
             <div class="flex justify-between items-end mb-1">
               <span class="text-[13px] font-bold text-slate-500">Total Commission Pool</span>
               <span class="text-[20px] font-black text-[#0B1A40]">${{ totalPool.toLocaleString('en-US') }}</span>
             </div>
             <p class="text-[11px] font-medium text-slate-400">Based on sale processing limits</p>
          </div>

          <div class="border border-[#5B4EFF]/20 rounded-xl p-5 bg-indigo-50/10 relative overflow-hidden">
             
             <!-- Bar Graphic -->
             <div class="text-[10px] font-black text-[#0B1A40] uppercase tracking-widest mb-3">Estimated Split <span class="text-slate-400">{{ !selectedSellingAgent && isSellingAgentRequired ? '(PENDING AGENT)' : '' }}</span></div>
             <div class="w-full h-3 rounded-full flex overflow-hidden mb-6 bg-slate-100">
                <div class="h-full bg-[#5B4EFF]" :style="{ width: '50%' }"></div>
                <div v-if="isSameAgentLocal || !selectedSellingAgent" class="h-full bg-emerald-500" :style="{ width: '50%' }"></div>
                <template v-else>
                   <div class="h-full bg-emerald-500" :style="{ width: '25%' }"></div>
                   <div class="h-full bg-slate-300" :style="{ width: '25%' }"></div>
                </template>
             </div>

             <!-- Breakdown Rows -->
             <div class="space-y-3 relative z-10">
                 <div class="flex justify-between items-center gap-4 text-[13px]">
                   <div class="flex items-center gap-2 font-medium text-slate-600 shrink-0">
                     <div class="w-2.5 h-2.5 rounded-full bg-[#5B4EFF]"></div>
                     <span class="whitespace-nowrap">Brokerage (50%)</span>
                   </div>
                   <div class="font-black text-[#0B1A40] whitespace-nowrap">${{ financialSplit.brokerage.toLocaleString('en-US') }}</div>
                 </div>
                
                <!-- Agent Distribution Pool -->
                <template v-if="isSameAgentLocal">
                   <div class="flex justify-between items-center gap-4 text-[13px]">
                     <div class="flex items-center gap-2 font-medium text-slate-600 shrink-0">
                       <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                       <span class="whitespace-nowrap">Listing & Selling Agent (50%)</span>
                     </div>
                     <div class="font-black text-[#0B1A40] whitespace-nowrap">${{ financialSplit.list.toLocaleString('en-US') }}</div>
                   </div>
                </template>
                <template v-else>
                  <!-- Listing Agent -->
                   <div class="flex justify-between items-center gap-4 text-[13px]">
                     <div class="flex items-center gap-2 font-medium text-slate-600 shrink-0">
                       <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                       <span class="whitespace-nowrap">Listing Agent ({{ !selectedSellingAgent ? '50%' : '25%' }})</span>
                     </div>
                     <div class="font-black text-[#0B1A40] whitespace-nowrap">${{ financialSplit.list.toLocaleString('en-US') }}</div>
                   </div>

                  <!-- Selling Agent (Show only if not same agent, unassigned or different) -->
                   <div :class="['flex justify-between items-center gap-4 text-[13px] pt-3 mt-3 border-t border-slate-100', (!selectedSellingAgent) ? 'opacity-50 grayscale pointer-events-none' : '']">
                     <div class="flex items-center gap-2 font-medium text-slate-600 shrink-0">
                       <div class="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                       <span class="whitespace-nowrap">Selling Agent ({{ !selectedSellingAgent ? '0%' : '25%' }})</span>
                     </div>
                     <div class="font-black text-[#0B1A40] whitespace-nowrap">${{ financialSplit.sell.toLocaleString('en-US') }}</div>
                   </div>
                </template>
             </div>
          </div>
        </div>

        <!-- Sticky Footer Buttons -->
         <div class="flex flex-col gap-3">
          <div class="p-3 bg-white border border-slate-100 rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex justify-between gap-3">
             <button @click="router.push('/transactions')" class="flex-1 bg-white hover:bg-slate-50 border border-slate-200 border-dashed text-slate-500 text-[11px] sm:text-[13px] font-bold rounded-xl py-3 sm:py-3.5 transition-colors">
               Cancel
             </button>
             <button v-if="canManage && transaction.status !== 'canceled'" @click="saveChanges" :disabled="!isValid || loading" :class="['flex-1 text-white text-[11px] sm:text-[13px] font-bold rounded-xl py-3 sm:py-3.5 flex items-center justify-center gap-2 transition-colors shadow-sm', isValid && !loading ? 'bg-[#5B4EFF] hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed']">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
               <span class="truncate">Update & Save</span>
             </button>
             <div v-else-if="transaction.status === 'canceled'" class="flex-1 bg-red-50 text-red-500 text-[11px] sm:text-[13px] font-bold rounded-xl py-3 sm:py-3.5 flex items-center justify-center gap-2 border border-red-100 border-dashed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Canceled
             </div>
             <div v-else class="flex-1 bg-slate-50 text-slate-400 text-[11px] sm:text-[13px] font-bold rounded-xl py-3 sm:py-3.5 flex items-center justify-center gap-2 border border-slate-200 border-dashed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Read Only
             </div>
          </div>
        </div>

      </div>

    </div>
  </div>

  <!-- Custom Confirmation Modal (Teleport to body for top-level layering) -->
  <Teleport to="body">
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
              Are you sure you want to cancel <span class="font-bold text-slate-700">TRX-{{ (transactionId || '').slice(-5).toUpperCase() }}</span>? This action is permanent and cannot be undone.
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
  </Teleport>
</template>
