<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionStore } from '~/stores/transactions'
import { useAgentStore } from '~/stores/agents'
import { useAuthStore } from '~/stores/auth'

const searchQuery = ref('')
const showAddModal = ref(false)
const authStore = useAuthStore()
const transStore = useTransactionStore()
const agentStore = useAgentStore()
const router = useRouter()

const newAgent = ref({
  name: '',
  email: '',
  phone: '',
  location: '',
  bio: '',
  instagram: '',
  linkedin: ''
})
    const addError = ref('')
    const addLoading = ref(false)
    const photoFile = ref(null)
    const photoPreview = ref('')
     
    const isAdmin = computed(() => authStore.user?.role === 'admin')

    const isMobile = ref(false)
if (process.client) {
  isMobile.value = window.innerWidth < 640
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 640
  })
}

const onPhotoChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  photoFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { photoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

const removePhoto = () => {
  photoFile.value = null
  photoPreview.value = ''
}


onMounted(async () => {
  try {
    // Both stores now have smart caching/background fetch
    await Promise.all([
      agentStore.fetchAgents(),
      transStore.fetchTransactions()
    ])
  } catch(e) {
    console.error(e)
  }
})

const users = computed(() => agentStore.agents)
const loading = computed(() => agentStore.loading || transStore.loading)

const agentsStats = computed(() => {
  const stats = {}
  users.value.forEach(u => {
    stats[u._id] = { activeSales: 0, totalEarnings: 0, completedSales: 0 }
  })
  
  transStore.transactions.forEach(t => {
    const isCompleted = t.status === 'completed'
    const total = t.totalServiceFee || 0
    
    const listId = typeof t.listingAgentId === 'object' ? t.listingAgentId?._id : t.listingAgentId
    const sellId = typeof t.sellingAgentId === 'object' ? t.sellingAgentId?._id : t.sellingAgentId
    
    const pool = total * 0.5
    let listShare = 0
    let sellShare = 0
    
    if (!sellId || listId === sellId) {
      listShare = pool
    } else {
      listShare = pool / 2
      sellShare = pool / 2
    }
    
    if (listId && stats[listId]) {
      if (!isCompleted) {
        stats[listId].activeSales++
      } else {
        stats[listId].completedSales++
        stats[listId].totalEarnings += listShare
      }
    }
    
    if (sellId && stats[sellId] && sellId !== listId) {
      if (!isCompleted) {
        stats[sellId].activeSales++
      } else {
        stats[sellId].completedSales++
        stats[sellId].totalEarnings += sellShare
      }
    }
  })
  
  return stats
})

const filteredAgents = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u => 
    (u.name && u.name.toLowerCase().includes(q)) || 
    (u.email && u.email.toLowerCase().includes(q))
  )
})

// Setup progress calc: name, email, phone, location, bio mandatory;
// instagram, linkedin optional (only contribute +5% each)
const getSetupProgress = (agent) => {
  let score = 0
  if (agent.name) score += 20
  if (agent.email) score += 20
  if (agent.phone) score += 20
  if (agent.photo) score += 10
  if (agent.location) score += 10
  if (agent.bio) score += 10
  if (agent.instagram) score += 5
  if (agent.linkedin) score += 5
  return score
}

const getProgressColor = (pct) => {
  if (pct >= 90) return '#10b981'   // emerald
  if (pct >= 60) return '#5B4EFF'   // indigo
  return '#f59e0b'                  // amber
}

const addAgent = async () => {
  if (!isAdmin.value) return
  try {
    addLoading.value = true
    const config = useRuntimeConfig()
    const payload = { ...newAgent.value, role: 'agent' }
    if (photoPreview.value) {
      payload.photo = photoPreview.value
    }
    const created = await $fetch(`${config.public.apiBase}/users`, {
      method: 'POST',
      body: payload
    })
    users.value.push(created)
    showAddModal.value = false
    newAgent.value = { name: '', email: '', phone: '', location: '', bio: '', instagram: '', linkedin: '' }
    photoPreview.value = ''
    photoFile.value = null
  } catch(e) {
    addError.value = 'Failed to create agent. Email might already exist.'
  } finally {
    addLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-[1300px] w-full text-[#0B1A40]">
    
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-2">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="text-[28px] sm:text-[36px] font-black tracking-tight leading-tight">Agent Directory</h1>
          <span class="bg-indigo-50 text-indigo-600 text-[10px] sm:text-[11px] font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest">
            {{ users.length }} Agents
          </span>
        </div>
        <p class="text-[13px] sm:text-[14px] text-slate-400 font-medium">Manage your licensed agents and their performance.</p>
      </div>
      <button v-if="isAdmin" @click="showAddModal = true" class="bg-[#5B4EFF] hover:bg-indigo-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-[13px] font-black shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-indigo-200 hover:shadow-lg w-full sm:w-fit shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
        Add Agent
      </button>
    </div>

    <!-- Search Bar -->
    <div class="relative w-full max-w-[480px] mb-10">
      <div class="absolute left-4 top-1/2 -translate-y-1/2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <input v-model="searchQuery" type="text" placeholder="Search by name or email..." 
             class="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-6 py-3.5 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-indigo-200 focus:shadow-[0_0_0_4px_rgba(91,78,255,0.06)] transition-all placeholder-slate-400 shadow-sm" />
    </div>

    <!-- Grid -->
    <div v-if="loading" class="flex justify-center p-12">
      <svg class="w-8 h-8 text-[#5B4EFF] animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      <div v-for="agent in filteredAgents" :key="agent._id" 
           @click="router.push(`/agents/${agent._id}`)"
           class="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all duration-300 group overflow-hidden flex flex-col cursor-pointer active:scale-[0.99]">
        
        <!-- Card Top: Avatar + Name -->
        <div class="p-4 sm:p-6 pb-0 flex items-start gap-3 sm:gap-4">
          <!-- Avatar -->
          <div class="relative shrink-0">
            <div v-if="agent.photo" class="w-[48px] h-[48px] sm:w-[60px] sm:h-[60px] rounded-[14px] sm:rounded-[18px] overflow-hidden border border-slate-100 shadow-sm">
              <img :src="agent.photo" :alt="agent.name" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-[48px] h-[48px] sm:w-[60px] sm:h-[60px] rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-indigo-500 to-[#5B4EFF] flex items-center justify-center text-white text-[18px] sm:text-[22px] font-black shadow-sm">
              {{ agent.name ? agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?' }}
            </div>
          </div>
 
          <!-- Agent info -->
          <div class="flex-1 min-w-0">
            <h3 class="text-[14px] sm:text-[16px] font-black text-[#0B1A40] leading-tight truncate">{{ agent.name }}</h3>
            <p class="text-[11px] sm:text-[12px] text-slate-400 font-medium truncate mt-0.5">{{ agent.email }}</p>
          </div>
 
          <!-- Social icons -->
          <div class="hidden sm:flex items-center gap-2 shrink-0">
            <a v-if="agent.instagram" :href="'https://instagram.com/' + agent.instagram" target="_blank" @click.stop
               class="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
              <svg class="w-3.5 h-3.5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a v-if="agent.linkedin" :href="'https://linkedin.com/in/' + agent.linkedin" target="_blank" @click.stop
               class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
 
        <!-- Metrics -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 gap-2 sm:gap-3">
          <div class="bg-slate-50/60 rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-3.5">
            <div class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Active</div>
            <div class="text-[15px] sm:text-[18px] font-black text-[#0B1A40]">{{ agentsStats[agent._id]?.activeSales || 0 }}</div>
          </div>
          <div class="bg-emerald-50/60 rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-3.5">
            <div class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Earnings</div>
            <div class="text-[13px] sm:text-[15px] font-black text-emerald-700">${{ (agentsStats[agent._id]?.totalEarnings || 0).toLocaleString('en-US') }}</div>
          </div>
        </div>
 
        <!-- Compact Setup Progress -->
        <div v-if="authStore.user?._id === agent._id" class="px-4 sm:px-6 pb-4 sm:pb-6 mt-auto">
          <div class="flex items-center justify-between mb-1.5 sm:mb-2">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Setup</span>
            <span class="text-[10px] sm:text-[11px] font-black" :style="{ color: getProgressColor(getSetupProgress(agent)) }">
              {{ getSetupProgress(agent) }}%
            </span>
          </div>
          <div class="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500"
                 :style="{ width: getSetupProgress(agent) + '%', backgroundColor: getProgressColor(getSetupProgress(agent)) }">
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredAgents.length === 0 && !loading" class="col-span-3 py-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
          <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
        <p class="text-[15px] font-bold text-slate-500">No agents found</p>
        <p class="text-[13px] text-slate-400 mt-1">Try a different search or add a new agent.</p>
      </div>
    </div>

    <!-- Add Agent Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/20 transition-opacity" @click="showAddModal = false"></div>
        
        <!-- Modal -->
        <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden">
          <!-- Modal Header -->
          <div class="px-8 pt-8 pb-6 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-[22px] font-black text-[#0B1A40] tracking-tight">Add New Agent</h2>
                <p class="text-[13px] text-slate-400 font-medium mt-0.5">Fill in the agent's details below.</p>
              </div>
              <button @click="showAddModal = false" class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="px-8 py-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <!-- Error -->
            <div v-if="addError" class="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[13px] text-red-600 font-medium">{{ addError }}</div>

            <!-- Profile Photo Upload -->
            <div>
              <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Profile Photo (Optional)</label>
              <div class="flex items-center gap-4">
                <div class="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm bg-indigo-500 flex items-center justify-center text-white text-[18px] font-black group/photo">
                  <img v-if="photoPreview" :src="photoPreview" class="w-full h-full object-cover" />
                  <span v-else>{{ newAgent.name ? newAgent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?' }}</span>
                  <button v-if="photoPreview" @click="removePhoto" 
                          class="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <label class="flex-1 cursor-pointer">
                  <div class="border-2 border-dashed border-slate-100 rounded-2xl p-4 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                    <span class="text-[12px] font-bold text-slate-500">Click to upload photo</span>
                    <input type="file" @change="onPhotoChange" class="hidden" accept="image/*" />
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Required Fields -->
            <div class="mb-2">
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Required Information</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name *</label>
                  <input v-model="newAgent.name" type="text" placeholder="John Smith"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
                </div>
                <div>
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Email *</label>
                  <input v-model="newAgent.email" type="email" placeholder="agent@email.com"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
                </div>
                <div>
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input v-model="newAgent.phone" type="tel" placeholder="+1 555 000 0000"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
                </div>
                <div class="col-span-2">
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Location</label>
                  <input v-model="newAgent.location" type="text" placeholder="Beverly Hills, CA"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors" />
                </div>
                <div class="col-span-2">
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Bio</label>
                  <textarea v-model="newAgent.bio" rows="2" placeholder="Short bio about the agent..."
                            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors resize-none"></textarea>
                </div>
              </div>
            </div>

            <!-- Optional Social (clearly labeled optional) -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Social Media</div>
                <span class="bg-slate-100 text-slate-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Optional</span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <svg class="w-3 h-3 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </label>
                  <input v-model="newAgent.instagram" type="text" placeholder="@username"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-200 transition-colors" />
                </div>
                <div>
                  <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <svg class="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </label>
                  <input v-model="newAgent.linkedin" type="text" placeholder="profile-url"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-8 pb-8 pt-4 border-t border-slate-100 flex justify-between gap-3">
            <button @click="showAddModal = false" class="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed text-slate-500 font-bold text-[13px] rounded-2xl py-3.5 transition-colors">
              Cancel
            </button>
            <button @click="addAgent" :disabled="addLoading" 
                    class="flex-1 bg-[#5B4EFF] hover:bg-indigo-700 text-white font-bold text-[13px] rounded-2xl py-3.5 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <svg v-if="addLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              {{ addLoading ? 'Creating...' : 'Add Agent' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>