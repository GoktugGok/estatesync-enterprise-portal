<script setup>
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const sidebarOpen = ref(false)

onMounted(() => {
  authStore.restoreFromStorage()
})

const handleSignOut = () => {
  authStore.logout()
  router.push('/login')
}

const closeSidebar = () => { sidebarOpen.value = false }
</script>

<template>
  <div class="flex min-h-screen bg-[#fcfcfc] text-slate-800 font-sans">

    <!-- Mobile overlay backdrop -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" @click="closeSidebar"></div>

    <!-- Sidebar -->
    <aside :class="[
      'fixed h-full flex flex-col z-40 bg-[#fcfcfc] border-r border-slate-100/60 shadow-[2px_0_15px_rgba(0,0,0,0.04)] w-64 transition-transform duration-300',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]">
      <!-- Logo -->
      <div class="px-5 py-8 flex items-center gap-3.5 mb-2">
        <div class="bg-indigo-600 text-white w-10 h-10 rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        </div>
        <div class="flex flex-col">
          <span class="text-[17px] font-black tracking-tight text-indigo-700 leading-none mb-1.5">EstateSync</span>
          <span class="text-[9px] font-bold text-slate-400/90 tracking-widest uppercase leading-none">Enterprise Portal</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 space-y-1 overflow-y-auto">
        <NuxtLink to="/" @click="closeSidebar" class="flex items-center gap-3.5 px-4 py-3 text-[13.5px] font-medium rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all" exact-active-class="!text-indigo-700 !bg-indigo-50/70 !font-semibold">
          <svg class="w-5 h-5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/></svg>
          Dashboard
        </NuxtLink>

        <NuxtLink to="/transactions" @click="closeSidebar" class="flex items-center gap-3.5 px-4 py-3 text-[13.5px] font-medium rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all" active-class="!text-indigo-700 !bg-indigo-50/70 !font-semibold">
          <svg class="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Transactions
        </NuxtLink>

        <NuxtLink to="/agents" @click="closeSidebar" class="flex items-center gap-3.5 px-4 py-3 text-[13.5px] font-medium rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all" active-class="!text-indigo-700 !bg-indigo-50/70 !font-semibold">
          <svg class="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          Agents
        </NuxtLink>
      </nav>

      <!-- Footer - User Info & Sign Out -->
      <div class="px-4 py-4 mt-auto mb-4 space-y-1">
        <div v-if="authStore.user" class="flex items-center gap-3 px-4 py-3 mb-1">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-[#5B4EFF] flex items-center justify-center text-white text-[12px] font-black shrink-0">
            {{ authStore.user.name ? authStore.user.name.charAt(0).toUpperCase() : '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[12px] font-bold text-slate-700 truncate">{{ authStore.user.name }}</div>
            <div class="text-[10px] font-medium text-slate-400 truncate">{{ authStore.user.role === 'admin' ? 'Administrator' : 'Agent' }}</div>
          </div>
        </div>

        <button @click="handleSignOut" class="w-full flex items-center gap-3.5 px-4 py-3 text-[13.5px] font-medium rounded-2xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all">
          <svg class="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 lg:ml-64 flex flex-col min-h-screen">
      <!-- Mobile top bar -->
      <div class="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-slate-100 bg-[#fcfcfc] sticky top-0 z-20">
        <button @click="sidebarOpen = !sidebarOpen" class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <span class="text-[15px] font-black text-indigo-700">EstateSync</span>
        </div>
      </div>

      <!-- Page content -->
      <div class="p-4 sm:p-8 pt-4 flex-1">
        <slot />
      </div>
    </main>
  </div>
</template>