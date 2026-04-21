<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionStore } from '~/stores/transactions'

const router = useRouter()
const store = useTransactionStore()

// State for custom dropdowns
const openDropdown = ref(null)
const toggleDropdown = (name, e) => {
  e.stopPropagation()
  openDropdown.value = openDropdown.value === name ? null : name
}

const closeDropdowns = () => {
  openDropdown.value = null
}

const stageOptions = [
  { value: 'agreement', label: 'Agreement (Sözleşme Aşaması)' },
  { value: 'earnest_money', label: 'Earnest Money (Kapora Alındı)' },
  { value: 'title_deed', label: 'Title Deed (Tapu Süreci)' },
  { value: 'completed', label: 'Completed (Tamamlandı)' }
]

// Real Agents from DB
const agents = ref([])

const fetchAgents = async () => {
  try {
    const config = useRuntimeConfig()
    const data = await $fetch(`${config.public.apiBase}/users`)
    if(data && Array.isArray(data) && data.length > 0) {
      agents.value = data
    }
  } catch (e) {
    console.log('Failed to fetch agents, using mock data.')
  }
}

onMounted(() => {
  fetchAgents()
  document.addEventListener('click', closeDropdowns)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
})

const form = ref({
  title: '',
  status: 'agreement',
  totalServiceFeeStr: '',
  listingAgentId: '', // Forces explicit selection
  sellingAgentId: ''
})

const currentStageLabel = computed(() => {
  return stageOptions.find(o => o.value === form.value.status)?.label || 'Select'
})

const currentListingLabel = computed(() => {
  return agents.value.find(a => a._id === form.value.listingAgentId)?.name || 'Select...'
})

const currentSellingLabel = computed(() => {
  if (!form.value.sellingAgentId) return showSellingAgentError.value ? 'Not Selected' : 'Select (Optional)...'
  return agents.value.find(a => a._id === form.value.sellingAgentId)?.name || 'Select...'
})

const loading = ref(false)
const errorMsg = ref('')

// Currency Formatting
const totalServiceFeeNum = computed(() => {
  const num = parseInt(form.value.totalServiceFeeStr.replace(/\D/g, ''), 10)
  return isNaN(num) ? 0 : num
})

const onFeeInput = (e) => {
  const val = e.target.value.replace(/\D/g, '')
  if (val) {
    form.value.totalServiceFeeStr = parseInt(val, 10).toLocaleString('en-US')
  } else {
    form.value.totalServiceFeeStr = ''
  }
}

// Validasyon İşleyişi
const isSellingAgentRequired = computed(() => {
  return form.value.status !== 'agreement'
})

const isSellingAgentValid = computed(() => {
  if (isSellingAgentRequired.value) {
    return !!form.value.sellingAgentId
  }
  return true
})

const showSellingAgentError = computed(() => {
  return isSellingAgentRequired.value && !form.value.sellingAgentId
})

const isValid = computed(() => {
  return form.value.title.trim().length > 0 &&
         totalServiceFeeNum.value > 0 &&
         form.value.listingAgentId &&
         isSellingAgentValid.value
})

// Komisyon Hesaplaması Yansıtma
const commissionPreview = computed(() => {
  const total = totalServiceFeeNum.value
  const brokerage = total * 0.5
  const pool = total * 0.5

  if (!form.value.sellingAgentId) {
     return { brokerage, list: pool, sell: 0, same: false }
  }

  if (form.value.listingAgentId === form.value.sellingAgentId) {
     return { brokerage, list: pool, sell: 0, same: true }
  } else {
     return { brokerage, list: pool / 2, sell: pool / 2, same: false }
  }
})

const submitTransaction = async () => {
  if (!isValid.value) return
  errorMsg.value = ''
  loading.value = true
  try {
    await store.createTransaction({
      title: form.value.title,
      status: form.value.status,
      // Backend expects number
      totalServiceFee: totalServiceFeeNum.value,
      listingAgentId: form.value.listingAgentId,
      sellingAgentId: form.value.sellingAgentId || null
    })
    
    // Toast simulation
    setTimeout(() => {
       alert('Transaction Successfully Created!')
       router.push('/transactions')
    }, 500)
    
  } catch(e) {
    errorMsg.value = 'An error occurred during submission: ' + e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-[800px] mx-auto py-10 px-4">
    
    <!-- Top Header & Actions -->
    <div class="flex justify-between items-start mb-10">
      <div class="flex items-center gap-5">
        <button @click="router.push('/transactions')" class="w-11 h-11 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
          <svg class="w-5 h-5 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div>
          <h1 class="text-3xl font-black text-[#0B1A40] tracking-tight">New Transaction</h1>
          <p class="text-[13px] font-medium text-slate-500 mt-1">Create a new ledger entry. Fill in the required details below.</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="router.push('/transactions')" class="px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-[13px]">
          Cancel
        </button>
        <button @click="submitTransaction" :disabled="!isValid || loading" :class="['px-6 py-2.5 rounded-xl font-bold text-white text-[13px] flex items-center gap-2 shadow-sm transition-all', isValid && !loading ? 'bg-[#5B4EFF] hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed opacity-70']">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          Start Transaction
        </button>
      </div>
    </div>

    <!-- Error Toast Box -->
    <div v-if="errorMsg" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
      <svg class="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span class="text-sm font-bold">{{ errorMsg }}</span>
    </div>

    <div class="space-y-6">
      <!-- 1. Transaction Context -->
      <div class="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative z-30">
        <div class="flex flex-col gap-6">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
               <svg class="w-5 h-5 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"></path></svg>
            </div>
            <div>
              <h2 class="text-lg font-black text-[#0B1A40]">Transaction Context</h2>
              <p class="text-[12px] font-medium text-slate-500">Set the initial state for this new ledger.</p>
            </div>
          </div>
          
          <div class="relative mt-2">
            <div class="border border-[#5B4EFF] rounded-xl p-4 relative bg-indigo-50/20 cursor-pointer" @click="toggleDropdown('stage', $event)">
               <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 cursor-pointer">Initial Stage</label>
               <div class="text-[14px] font-black text-[#0B1A40]">{{ currentStageLabel }}</div>
               <div :class="['absolute right-4 bottom-4 transition-transform duration-200 text-[#5B4EFF]', openDropdown === 'stage' ? 'rotate-180' : '']">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
               </div>
               
               <!-- Custom Dropdown Menu -->
               <div v-if="openDropdown === 'stage'" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-1.5 z-40 animate-in fade-in slide-in-from-top-2">
                 <div v-for="opt in stageOptions" :key="opt.value" @click.stop="form.status = opt.value; openDropdown = null" class="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-[#0B1A40] transition-colors border-b border-slate-50 last:border-0">
                    <span :class="['text-[13px]', form.status === opt.value ? 'font-black text-[#5B4EFF]' : 'font-medium']">{{ opt.label }}</span>
                    <svg v-if="form.status === opt.value" class="w-4 h-4 text-[#5B4EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Property Details -->
      <div class="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden z-10">
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-[#5B4EFF]"></div>
        <div class="flex flex-col gap-6 pl-2">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
               <svg class="w-5 h-5 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <div>
              <h2 class="text-lg font-black text-[#0B1A40]">Property Details</h2>
              <p class="text-[12px] font-medium text-slate-500">Select the subject property and financial terms.</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
               <label class="block text-[12px] font-bold text-slate-600 mb-2">Property Title</label>
               <input v-model="form.title" type="text" placeholder="e.g: Beverly Hills Mansion" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-medium text-[#0B1A40] focus:border-[#5B4EFF] focus:ring-1 focus:ring-[#5B4EFF] outline-none transition-colors" />
            </div>
            <div>
               <label class="block text-[12px] font-bold text-slate-600 mb-2">Total Service Fee</label>
               <div class="relative">
                 <input type="text" :value="form.totalServiceFeeStr" @input="onFeeInput" placeholder="0" class="w-full border border-slate-200 rounded-xl px-10 py-3 text-[14px] font-bold text-[#0B1A40] focus:border-[#5B4EFF] focus:ring-1 focus:ring-[#5B4EFF] outline-none transition-colors" />
                 <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-black text-slate-400 border-r border-slate-200 pr-3">$</span>
                 <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-slate-400">USD</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Agent Assignment -->
      <div class="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative z-20">
        <div class="flex flex-col gap-6">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
               <svg class="w-5 h-5 text-[#5B4EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
            </div>
            <div>
              <h2 class="text-lg font-black text-[#0B1A40]">Agent Assignment</h2>
              <p class="text-[12px] font-medium text-slate-500">Designate representation for this ledger.</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
            <div>
               <label class="block text-[12px] font-bold text-slate-600 mb-2">Listing Agent</label>
               <div class="relative cursor-pointer" @click="toggleDropdown('listing', $event)">
                 <div class="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-medium text-[#0B1A40] transition-colors focus-within:border-[#5B4EFF] bg-white flex justify-between items-center">
                   <span>{{ currentListingLabel }}</span>
                   <svg :class="['w-4 h-4 text-slate-400 transition-transform duration-200', openDropdown === 'listing' ? 'rotate-180 text-[#5B4EFF]' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
                 
                 <!-- Listing Agent Custom Dropdown -->
                 <div v-if="openDropdown === 'listing'" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-1.5 z-40 animate-in fade-in slide-in-from-top-2">
                   <div class="px-5 py-2 hover:bg-slate-50 cursor-pointer text-[#0B1A40] border-b border-slate-50 transition-colors" @click.stop="form.listingAgentId = ''; openDropdown = null">
                      <span class="text-[13px] font-medium text-slate-400 italic">Clear</span>
                   </div>
                   <div v-for="agent in agents" :key="agent._id" @click.stop="form.listingAgentId = agent._id; openDropdown = null" class="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-[#0B1A40] transition-colors border-b border-slate-50 last:border-0">
                      <span :class="['text-[13px]', form.listingAgentId === agent._id ? 'font-black text-[#5B4EFF]' : 'font-medium']">{{ agent.name }}</span>
                      <svg v-if="form.listingAgentId === agent._id" class="w-4 h-4 text-[#5B4EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                   </div>
                 </div>
               </div>
            </div>
            
            <div>
               <div class="flex justify-between items-center mb-2">
                 <label class="text-[12px] font-bold text-slate-600">Selling Agent</label>
                 <span v-if="isSellingAgentRequired" class="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>Required</span>
               </div>
               <div class="relative cursor-pointer" @click="toggleDropdown('selling', $event)">
                 <div :class="['w-full border rounded-xl px-4 py-3 text-[14px] font-medium transition-colors flex justify-between items-center', showSellingAgentError ? 'border-red-300 text-red-600 bg-red-50' : 'border-slate-200 text-[#0B1A40] bg-white']">
                   <span>{{ currentSellingLabel }}</span>
                   <svg :class="['w-4 h-4 transition-transform duration-200', showSellingAgentError ? 'text-red-400' : 'text-slate-400', openDropdown === 'selling' ? 'rotate-180 text-[#5B4EFF]' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
                 
                 <!-- Selling Agent Custom Dropdown -->
                 <div v-if="openDropdown === 'selling'" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-1.5 z-40 animate-in fade-in slide-in-from-top-2">
                   <div class="px-5 py-2 hover:bg-slate-50 cursor-pointer text-[#0B1A40] border-b border-slate-50 transition-colors" @click.stop="form.sellingAgentId = ''; openDropdown = null">
                      <span class="text-[13px] font-medium text-slate-400 italic">Clear (Remove)</span>
                   </div>
                   <div v-for="agent in agents" :key="agent._id" @click.stop="form.sellingAgentId = agent._id; openDropdown = null" class="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-[#0B1A40] transition-colors border-b border-slate-50 last:border-0">
                      <span :class="['text-[13px]', form.sellingAgentId === agent._id ? 'font-black text-[#5B4EFF]' : 'font-medium']">{{ agent.name }}</span>
                      <svg v-if="form.sellingAgentId === agent._id" class="w-4 h-4 text-[#5B4EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                   </div>
                 </div>
               </div>
               <p v-if="showSellingAgentError" class="text-[11px] font-bold text-red-500 mt-2">
                 A selling agent is required for this stage.
               </p>
            </div>
          </div>
        </div>
      </div>

       <!-- 4. Dynamic Commission Preview Box -->
       <div v-if="isValid && totalServiceFeeNum > 0" class="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
         <div class="text-[11px] font-black text-indigo-400 uppercase tracking-widest text-center">Estimated Commission Split</div>
         <div class="flex items-center gap-2">
            <div class="flex-1 bg-white rounded-xl p-4 border border-indigo-100 shadow-sm text-center">
              <div class="text-[11px] font-bold text-slate-400 mb-1">Brokerage Share (50%)</div>
              <div class="text-[16px] font-black text-[#0B1A40]">${{ commissionPreview.brokerage.toLocaleString('en-US') }}</div>
            </div>
            
            <div v-if="commissionPreview.same" class="flex-1 bg-white rounded-xl p-4 border border-emerald-100 shadow-sm text-center ring-2 ring-emerald-50">
              <div class="flex justify-center items-center gap-1 text-[11px] font-bold text-emerald-500 mb-1">
                Listing & Selling (50%)
              </div>
              <div class="text-[16px] font-black text-emerald-600">${{ commissionPreview.list.toLocaleString('en-US') }}</div>
            </div>

            <template v-else-if="form.sellingAgentId">
              <div class="flex-1 bg-white rounded-xl p-4 border border-amber-100 shadow-sm text-center">
                <div class="text-[11px] font-bold text-amber-500 mb-1">Listing Agent (25%)</div>
                <div class="text-[16px] font-black text-amber-600">${{ commissionPreview.list.toLocaleString('en-US') }}</div>
              </div>
              <div class="flex-1 bg-white rounded-xl p-4 border border-sky-100 shadow-sm text-center">
                <div class="text-[11px] font-bold text-sky-500 mb-1">Selling Agent (25%)</div>
                <div class="text-[16px] font-black text-sky-600">${{ commissionPreview.sell.toLocaleString('en-US') }}</div>
              </div>
            </template>
         </div>
       </div>

    </div>
  </div>
</template>
