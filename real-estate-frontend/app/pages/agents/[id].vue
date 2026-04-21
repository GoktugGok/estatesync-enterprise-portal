<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionStore } from '~/stores/transactions'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const store = useTransactionStore()
const authStore = useAuthStore()

const agentId = route.params.id
const agent = ref(null)
const myTransactions = ref([])
const filter = ref('All')
const trendFilter = ref('Sales')
const loading = ref(true)
const editMode = ref(false)
const editData = ref({})
const saveLoading = ref(false)
const saveSuccess = ref(false)
const photoFile = ref(null)
const photoPreview = ref('')

const onPhotoChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  photoFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { photoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

onMounted(async () => {
  try {
    const config = useRuntimeConfig()
    const users = await $fetch(`${config.public.apiBase}/users`)
    const found = users.find(u => u._id === agentId)
    if (found) {
      agent.value = found
      editData.value = { ...found }
    }
  } catch (e) {
    console.error('Failed to fetch user', e)
  }

  if (store.transactions.length === 0) {
    await store.fetchTransactions()
  }

  myTransactions.value = store.transactions.filter(t => {
     const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId;
     const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId;
     return listId === agentId || sellId === agentId;
  }).map(t => {
     const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId;
     const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId;
     const fee = t.totalServiceFee || 0;
     
     let isListing = listId === agentId;
     let isSelling = sellId === agentId;
     
     let role = '';
     let agentFee = 0;
     
     if (isListing && isSelling) {
       role = 'Both';
       agentFee = fee * 0.5;
     } else if (isListing) {
       role = 'Listing Agent';
       agentFee = fee * 0.25;
     } else {
       role = 'Selling Agent';
       agentFee = fee * 0.25;
     }

     return {
       ...t,
       _displayRole: role,
       _displayFee: agentFee,
       _date: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'
     }
  })
  
  loading.value = false
})

const stats = computed(() => {
   let pEarnings = 0;
   let aContribution = 0;
   let completed = 0;
   let total = myTransactions.value.length;

   myTransactions.value.forEach(t => {
      if (t.status === 'completed') {
         pEarnings += t._displayFee;
         aContribution += (t.totalServiceFee || 0) * 0.5;
         completed++;
      }
   })

   let successRate = total === 0 ? 0 : Math.round((completed / total) * 100);

   return { pEarnings, aContribution, completed, successRate, total }
})

const filteredTransactions = computed(() => {
   if (filter.value === 'All') return myTransactions.value;
   return myTransactions.value.filter(t => t._displayRole === filter.value);
})

const chartData = computed(() => {
   const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
   let data = { 'JAN': 0, 'FEB': 0, 'MAR': 0, 'APR': 0, 'MAY': 0, 'JUN': 0 };

   myTransactions.value.forEach(t => {
     if (t.status === 'completed') {
       const isSelling = t._displayRole === 'Selling Agent' || t._displayRole === 'Both';
       const isListing = t._displayRole === 'Listing Agent' || t._displayRole === 'Both';
       
       let date = new Date(t.updatedAt || t.createdAt || Date.now());
       let monthIndex = date.getMonth(); 
       const mArr = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
       let mName = mArr[monthIndex];
       
       if (data[mName] !== undefined) {
         if (trendFilter.value === 'Sales' && isSelling) {
            data[mName] += t._displayFee;
         } else if (trendFilter.value === 'Listings' && isListing) {
            data[mName] += t._displayFee;
         }
       }
     }
   });

   let maxVal = 0;
   const result = months.map(m => {
     const val = data[m];
     if (val > maxVal) maxVal = val;
     return { label: m, value: val };
   });

   return { list: result, max: maxVal > 0 ? maxVal : 10000 };
})

// Setup progress (no licenseNumber)
const setupProgress = computed(() => {
  if (!agent.value) return 0
  let score = 0
  if (agent.value.name) score += 25
  if (agent.value.email) score += 25
  if (agent.value.phone) score += 20
  if (agent.value.location) score += 10
  if (agent.value.bio) score += 10
  if (agent.value.instagram) score += 5
  if (agent.value.linkedin) score += 5
  return score
})

const progressColor = computed(() => {
  if (setupProgress.value >= 90) return '#10b981'
  if (setupProgress.value >= 60) return '#5B4EFF'
  return '#f59e0b'
})

const canEdit = computed(() => {
  if (authStore.user?.role === 'admin') return true
  return authStore.user?._id === agentId
})

const missingFields = computed(() => {
  if (!agent.value) return []
  const missing = []
  if (!agent.value.phone) missing.push('Phone')
  if (!agent.value.location) missing.push('Location')
  if (!agent.value.bio) missing.push('Bio')
  if (!agent.value.instagram) missing.push('Instagram')
  if (!agent.value.linkedin) missing.push('LinkedIn')
  return missing
})

const saveEdit = async () => {
  try {
    saveLoading.value = true
    let photoUrl = editData.value.photo || ''
    // If a new file was picked, use the base64 preview as the photo value
    if (photoPreview.value) {
      photoUrl = photoPreview.value
    }
    const payload = { ...editData.value, photo: photoUrl }
    const config = useRuntimeConfig()
    const updated = await $fetch(`${config.public.apiBase}/users/${agentId}`, {
      method: 'PATCH',
      body: payload
    })
    agent.value = updated
    editMode.value = false
    photoFile.value = null
    photoPreview.value = ''
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 3000)
  } catch(e) {
    console.error(e)
  } finally {
    saveLoading.value = false
  }
}

const formatMoney = (val) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
}

const formatShortMoney = (val) => {
  if (val === 0) return '';
  if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'k';
  return '$' + val;
}
</script>

<template>
  <div v-if="loading" class="p-10 flex justify-center items-center h-full">
    <svg class="w-8 h-8 text-[#5B4EFF] animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
  </div>

  <div v-else-if="agent" class="max-w-[1240px] mx-auto text-[#0B1A40] pb-10">

    <!-- Success Toast -->
    <div v-if="saveSuccess" class="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3 text-emerald-700">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span class="text-[14px] font-bold">Profile updated successfully!</span>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between mb-8 mt-2 gap-4">
      <div class="flex items-start gap-4">
        <!-- Button back -->
        <button @click="router.push('/agents')" class="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm shrink-0 mt-1">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>

        <!-- Avatar -->
        <div class="relative shrink-0">
          <div v-if="agent.photo" class="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] rounded-[22px] overflow-hidden border border-slate-100 shadow-md">
            <img :src="agent.photo" :alt="agent.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] bg-gradient-to-br from-indigo-500 to-[#5B4EFF] text-white rounded-[22px] flex items-center justify-center text-[28px] font-black shadow-md">
            {{ agent.name ? agent.name.charAt(0).toUpperCase() : '?' }}
          </div>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h1 class="text-[22px] sm:text-[28px] font-black tracking-tight leading-tight">{{ agent.name }}</h1>
            <!-- Social links -->
            <a v-if="agent.instagram" :href="'https://instagram.com/' + agent.instagram" target="_blank"
               class="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
              <svg class="w-3.5 h-3.5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a v-if="agent.linkedin" :href="'https://linkedin.com/in/' + agent.linkedin" target="_blank"
               class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-400 font-medium">
            <span>{{ agent.email }}</span>
            <span v-if="agent.phone">• {{ agent.phone }}</span>
            <span v-if="agent.location">• {{ agent.location }}</span>
          </div>
          <p v-if="agent.bio" class="text-[12px] text-slate-500 font-medium mt-1.5 max-w-[500px] leading-relaxed">{{ agent.bio }}</p>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex items-center gap-3 shrink-0">
        <button v-if="!editMode && canEdit" @click="editMode = true; editData = { ...agent }"
                class="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-[13px] px-4 py-2.5 rounded-2xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          Edit Profile
        </button>
      </div>
    </div>

    <!-- Setup Progress Banner (shown if not 100%) -->
    <div v-if="setupProgress < 100" class="mb-6 bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center" :style="{ backgroundColor: progressColor + '15' }">
            <svg class="w-4 h-4" :style="{ color: progressColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div class="text-[14px] font-black text-[#0B1A40]">Profile Setup · <span :style="{ color: progressColor }">{{ setupProgress }}% Complete</span></div>
            <div class="text-[11px] text-slate-400 font-medium mt-0.5">
              Missing: {{ missingFields.slice(0, 4).join(', ') }}{{ missingFields.length > 4 ? '...' : '' }}
            </div>
          </div>
        </div>
        <button v-if="canEdit" @click="editMode = true; editData = { ...agent }"
                class="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">
          Complete Profile →
        </button>
      </div>
      <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700"
             :style="{ width: setupProgress + '%', backgroundColor: progressColor }"></div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
      <div class="bg-white rounded-[2rem] p-7 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] border border-slate-50">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full opacity-50 blur-2xl"></div>
        <div class="relative z-10">
          <h3 class="text-[#0B1A40] text-[11px] font-black uppercase tracking-widest leading-none">Personal Earnings</h3>
          <p class="text-slate-400 text-[11px] font-medium mt-1">YTD Commission</p>
        </div>
        <div class="relative z-10 text-[38px] font-black text-emerald-700 tracking-tight leading-none mt-4">
          {{ formatMoney(stats.pEarnings) }}
        </div>
      </div>

      <div class="bg-white rounded-[2rem] p-7 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] border border-slate-50">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 blur-2xl"></div>
        <div class="relative z-10">
          <h3 class="text-[#0B1A40] text-[11px] font-black uppercase tracking-widest leading-none">Agency Contribution</h3>
          <p class="text-slate-400 text-[11px] font-medium mt-1">Brokerage Share</p>
        </div>
        <div class="relative z-10 text-[38px] font-black text-[#4A3AFF] tracking-tight leading-none mt-4">
          {{ formatMoney(stats.aContribution) }}
        </div>
      </div>

      <div class="bg-white rounded-[2rem] p-7 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] border border-slate-50">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
        <div class="relative z-10">
          <h3 class="text-[#0B1A40] text-[11px] font-black uppercase tracking-widest leading-none">Deals Closed</h3>
          <p class="text-slate-400 text-[11px] font-medium mt-1">{{ stats.total }} total transactions</p>
        </div>
        <div class="mt-4 relative z-10">
          <div class="text-[38px] font-black text-indigo-700 tracking-tight leading-none">{{ stats.completed }}</div>
        </div>
      </div>
    </div>

    <!-- Edit Modal (Teleport to body) -->
    <Teleport to="body">
      <div v-if="editMode" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" @click="editMode = false; photoPreview = ''; photoFile = null"></div>
        <!-- Modal -->
        <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-[600px] mx-4 overflow-hidden max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-[20px] font-black text-[#0B1A40] tracking-tight">Edit Profile</h2>
                <p class="text-[12px] text-slate-400 font-medium mt-0.5">Update agent details below.</p>
              </div>
              <button @click="editMode = false; photoPreview = ''; photoFile = null" class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-8 py-6 overflow-y-auto flex-1 space-y-5">

            <!-- Photo Upload -->
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Profile Photo</label>
              <div class="flex items-center gap-4">
                <!-- Preview -->
                <div class="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center">
                  <img v-if="photoPreview || editData.photo" :src="photoPreview || editData.photo" class="w-full h-full object-cover" />
                  <svg v-else class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <!-- File input styled -->
                <label class="flex-1 cursor-pointer">
                  <div class="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-indigo-50/30">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-[12px] font-bold text-slate-500">{{ photoFile ? photoFile.name : 'Click to upload photo' }}</span>
                    <span class="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                  </div>
                  <input type="file" accept="image/*" class="hidden" @change="onPhotoChange" />
                </label>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input v-model="editData.name" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                <input v-model="editData.email" type="email" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                <input v-model="editData.phone" type="tel" placeholder="+1 555 000 0000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Location</label>
                <input v-model="editData.location" type="text" placeholder="Beverly Hills, CA" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bio</label>
                <textarea v-model="editData.bio" rows="2" placeholder="Short bio..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors resize-none"></textarea>
              </div>
              <!-- Social (optional) -->
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <svg class="w-3 h-3 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram <span class="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded ml-1">optional</span>
                </label>
                <input v-model="editData.instagram" type="text" placeholder="@username" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-200 transition-colors" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <svg class="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn <span class="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded ml-1">optional</span>
                </label>
                <input v-model="editData.linkedin" type="text" placeholder="profile-slug" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-colors" />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-8 pb-8 pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button @click="editMode = false; photoPreview = ''; photoFile = null" class="bg-slate-50 border border-slate-200 border-dashed text-slate-500 font-bold text-[13px] px-6 py-3 rounded-2xl transition-colors hover:bg-slate-100">
              Cancel
            </button>
            <button @click="saveEdit" :disabled="saveLoading" class="bg-[#5B4EFF] hover:bg-indigo-700 text-white font-bold text-[13px] px-6 py-3 rounded-2xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60">
              <svg v-if="saveLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              {{ saveLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bottom Area: Chart + Table -->
    <div class="grid grid-cols-12 gap-6">
      
      <!-- Earnings Trend Chart (Col 3) -->
      <div class="col-span-3 bg-white rounded-[2.5rem] py-6 px-7 shadow-sm flex flex-col border border-slate-50 h-fit self-start shrink-0">
         <div class="flex items-center justify-between mb-5">
           <h3 class="text-[17px] font-black">Earnings Trend</h3>
         </div>
         
         <div class="bg-slate-50/80 p-1.5 rounded-[14px] flex items-center mb-8 w-full">
           <button @click="trendFilter = 'Sales'" :class="['flex-1 text-[11px] font-bold py-2 rounded-[10px] transition-all', trendFilter === 'Sales' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">Sales</button>
           <button @click="trendFilter = 'Listings'" :class="['flex-1 text-[11px] font-bold py-2 rounded-[10px] transition-all', trendFilter === 'Listings' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">Listings</button>
         </div>

         <div class="flex-1 flex items-end justify-between gap-2 mt-12 pb-4 h-[250px]">
            <div v-for="item in chartData.list" :key="item.label" class="flex flex-col items-center gap-2">
               <div :class="['text-[10px] font-black h-3', trendFilter === 'Listings' ? 'text-indigo-600' : 'text-emerald-600']">
                 {{ formatShortMoney(item.value) }}
               </div>
               <div v-if="trendFilter === 'Sales'" :class="['w-[32px] rounded-t-[4px] transition-all duration-500', item.value === chartData.max && item.value > 0 ? 'bg-emerald-700' : (item.value > 0 ? 'bg-emerald-500/60' : 'bg-slate-100')]" 
                    :style="{ height: item.value > 0 ? Math.max((item.value / chartData.max) * 180, 20) + 'px' : '4px' }">
               </div>
               <div v-else :class="['w-[32px] rounded-t-[4px] transition-all duration-500', item.value === chartData.max && item.value > 0 ? 'bg-indigo-600' : (item.value > 0 ? 'bg-indigo-400/60' : 'bg-slate-100')]" 
                    :style="{ height: item.value > 0 ? Math.max((item.value / chartData.max) * 180, 20) + 'px' : '4px' }">
               </div>
               <span :class="['text-[10px] font-black uppercase tracking-wider', item.value > 0 ? 'text-[#0B1A40]' : 'text-slate-400']">{{ item.label }}</span>
            </div>
         </div>
      </div>

      <!-- Historical Transactions Table (Col 9) -->
      <div class="col-span-9 bg-white rounded-[2.5rem] p-8 shadow-sm flex flex-col border border-slate-50">
        <div class="flex items-center justify-between mb-8">
           <div>
             <h3 class="text-[18px] font-black text-[#0B1A40] pt-1.5">Historical Transactions</h3>
           </div>
           
           <div class="bg-slate-50/80 flex items-center rounded-xl p-1.5 shadow-inner h-12 shrink-0">
             <button @click="filter = 'All'" :class="['px-5 text-[12px] font-bold h-full rounded-[8px] transition-all', filter === 'All' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">All</button>
             <button @click="filter = 'Selling Agent'" :class="['px-4 text-[12px] font-bold h-full rounded-[8px] transition-all', filter === 'Selling Agent' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">Selling</button>
             <button @click="filter = 'Listing Agent'" :class="['px-4 text-[12px] font-bold h-full rounded-[8px] transition-all', filter === 'Listing Agent' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">Listing</button>
             <button @click="filter = 'Both'" :class="['px-5 text-[12px] font-bold h-full rounded-[8px] transition-all', filter === 'Both' ? 'bg-white text-[#0B1A40] shadow-sm' : 'text-slate-500 hover:text-[#0B1A40]']">Both</button>
           </div>
        </div>

        <div class="w-full flex-1 flex flex-col">
           <div class="border-y border-slate-100 py-3.5 grid grid-cols-12 gap-4 items-center">
             <div class="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100/40">Property Title</div>
             <div class="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100/40">Role</div>
             <div class="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100/40">Fee</div>
             <div class="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100/40">Status</div>
             <div class="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</div>
           </div>

           <div class="divide-y divide-slate-100/60 max-h-[420px] overflow-y-auto pr-2 custom-scroll">
             <div v-if="filteredTransactions.length === 0" class="py-12 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                </div>
                <div class="text-slate-400 font-bold text-[14px]">No transactions found</div>
                <div class="text-slate-400 font-medium text-[12px] mt-1">There are no transactions with this role yet.</div>
             </div>
             
             <div v-for="t in filteredTransactions" :key="t._id" @click="router.push('/transactions?view=' + t._id)" class="py-4 grid grid-cols-12 gap-4 items-center group cursor-pointer hover:bg-slate-50/50 rounded-2xl transition-all -mx-3 px-3 relative active:scale-[0.99]">
                <div class="absolute inset-y-2 -left-1 w-1 bg-indigo-500 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div class="col-span-5 flex items-center gap-4">
                  <div class="w-[46px] h-[46px] bg-[#16223B] rounded-[14px] overflow-hidden shrink-0 relative flex items-center justify-center shadow-sm">
                       <svg v-if="t._displayRole === 'Selling Agent'" class="w-5 h-5 text-indigo-300" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                       <svg v-else-if="t._displayRole === 'Listing Agent'" class="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 24 24"><path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2z"/></svg>
                       <svg v-else class="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.828l7 6.172v10h-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4H5v-10l7-6.172z"/></svg>
                  </div>
                  <div>
                    <div class="text-[14px] font-black text-[#0B1A40] group-hover:text-[#4A3AFF] transition-colors leading-tight line-clamp-1">{{ t.title }}</div>
                    <div class="text-[12px] font-medium text-slate-500 tracking-tight mt-1 truncate">{{ t._id.substring(0, 8) }}</div>
                  </div>
                </div>

                <div class="col-span-2 text-center">
                  <span class="text-[13px] font-bold text-slate-600">{{ t._displayRole }}</span>
                </div>

                <div class="col-span-2 text-center">
                  <span class="text-[14px] font-black text-[#0B1A40]">{{ formatMoney(t._displayFee) }}</span>
                </div>

                <div class="col-span-2 text-center">
                  <span :class="['inline-flex items-center justify-center px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md', 
                    t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#4A3AFF]/10 text-[#4A3AFF]']">
                    {{ t.status === 'completed' ? 'Completed' : 'In Progress' }}
                  </span>
                </div>

                <div class="col-span-1 text-center">
                  <span class="text-[13px] font-bold text-slate-500 whitespace-nowrap">{{ t._date }}</span>
                </div>

             </div>
           </div>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 20px;
}
</style>