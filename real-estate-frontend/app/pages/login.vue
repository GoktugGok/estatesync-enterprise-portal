<script setup>
definePageMeta({ layout: false })

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isRegister = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const keepSignedIn = ref(false)
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const handleSubmit = async () => {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Email and password are required.'
    return
  }
  if (isRegister.value && !name.value) {
    error.value = 'Full name is required.'
    return
  }
  try {
    loading.value = true
    if (isRegister.value) {
      await authStore.register(name.value, email.value, password.value)
    } else {
      await authStore.login(email.value, password.value)
    }
    router.push('/')
  } catch (e) {
    error.value = isRegister.value
      ? 'Registration failed. Email might already exist.'
      : 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex bg-[#f8f9fb]">
    <!-- Left Panel - Hero -->
    <div class="hidden lg:flex w-[48%] relative overflow-hidden">
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0f1629] via-[#162040] to-[#1a2850]"></div>
      
      <!-- Subtle grid pattern -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;1&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"></div>
      
      <!-- Glass building shapes -->
      <div class="absolute bottom-0 left-[10%] w-[120px] h-[55%] bg-gradient-to-t from-[#1e2d55]/60 to-[#2a3d6b]/20 rounded-t-lg backdrop-blur-sm border border-white/[0.04]"></div>
      <div class="absolute bottom-0 left-[25%] w-[100px] h-[65%] bg-gradient-to-t from-[#1a2850]/70 to-[#283f6d]/15 rounded-t-lg backdrop-blur-sm border border-white/[0.04]"></div>
      <div class="absolute bottom-0 left-[40%] w-[140px] h-[72%] bg-gradient-to-t from-[#15203d]/80 to-[#253966]/20 rounded-t-lg backdrop-blur-sm border border-white/[0.05]"></div>
      <div class="absolute bottom-0 right-[15%] w-[110px] h-[50%] bg-gradient-to-t from-[#1c2b52]/60 to-[#2d4470]/15 rounded-t-lg backdrop-blur-sm border border-white/[0.04]"></div>
      <div class="absolute bottom-0 right-[5%] w-[90px] h-[42%] bg-gradient-to-t from-[#192645]/50 to-[#253966]/10 rounded-t-lg backdrop-blur-sm border border-white/[0.03]"></div>
      
      <!-- Window lights on buildings -->
      <div class="absolute bottom-[30%] left-[13%] w-[8px] h-[8px] bg-amber-300/30 rounded-sm"></div>
      <div class="absolute bottom-[35%] left-[15%] w-[8px] h-[8px] bg-blue-300/20 rounded-sm"></div>
      <div class="absolute bottom-[25%] left-[28%] w-[8px] h-[8px] bg-amber-200/25 rounded-sm"></div>
      <div class="absolute bottom-[40%] left-[44%] w-[8px] h-[8px] bg-blue-200/20 rounded-sm"></div>
      <div class="absolute bottom-[50%] left-[47%] w-[8px] h-[8px] bg-amber-300/30 rounded-sm"></div>
      <div class="absolute bottom-[45%] left-[50%] w-[8px] h-[8px] bg-blue-200/15 rounded-sm"></div>
      
      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-between p-12 w-full">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="bg-white/10 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center border border-white/10">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <span class="text-white/90 text-[18px] font-black tracking-tight">ESTATESYNC</span>
        </div>

        <!-- Headline -->
        <div class="mb-24">
          <p class="text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.25em] mb-6">Premium Asset Management</p>
          <h1 class="text-[46px] font-black text-white leading-[1.1] tracking-tight mb-6">
            Elevate your<br>
            <span class="bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text text-transparent">Real Estate</span><br>
            workflow.
          </h1>
          <p class="text-[15px] text-slate-400 font-medium leading-relaxed max-w-[380px]">
            Access your portfolio ledger with architectural precision and real-time market data.
          </p>
        </div>

        <!-- Bottom -->
        <div class="flex items-center gap-3">
          <div class="flex -space-x-2">
            <div class="w-8 h-8 rounded-full bg-indigo-500/40 border-2 border-[#162040] flex items-center justify-center text-[10px] text-white font-bold">A</div>
            <div class="w-8 h-8 rounded-full bg-emerald-500/40 border-2 border-[#162040] flex items-center justify-center text-[10px] text-white font-bold">B</div>
            <div class="w-8 h-8 rounded-full bg-amber-500/40 border-2 border-[#162040] flex items-center justify-center text-[10px] text-white font-bold">C</div>
          </div>
          <span class="text-[13px] text-slate-400 font-medium">Joined by 2,000+ top agents</span>
        </div>
      </div>
    </div>

    <!-- Right Panel - Form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-[420px]">
        <!-- Mobile Logo -->
        <div class="flex items-center gap-3 mb-10 lg:hidden">
          <div class="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <span class="text-[18px] font-black tracking-tight text-indigo-700">EstateSync</span>
        </div>

        <!-- Heading -->
        <div class="mb-8">
          <h2 class="text-[32px] font-black text-[#0B1A40] tracking-tight leading-tight mb-2">
            {{ isRegister ? 'Create Account' : 'Welcome Back' }}
          </h2>
          <p class="text-[14px] text-slate-400 font-medium">
            {{ isRegister ? 'Fill in your details to get started.' : 'Please enter your credentials to access your ledger.' }}
          </p>
        </div>

        <!-- Error -->
        <div v-if="error" class="mb-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[13px] text-red-600 font-medium flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Name (Register only) -->
          <div v-if="isRegister">
            <label class="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">Full Name</label>
            <div class="relative">
              <input v-model="name" type="text" placeholder="John Smith"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-11 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder-slate-300" />
              <div class="absolute right-4 top-1/2 -translate-y-1/2">
                <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">Email Address</label>
            <div class="relative">
              <input v-model="email" type="email" placeholder="agent@estatesync.com"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-11 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder-slate-300" />
              <div class="absolute right-4 top-1/2 -translate-y-1/2">
                <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
              </div>
            </div>
          </div>

          <!-- Password -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Password</label>
              <a v-if="!isRegister" href="#" class="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">Forgot Password?</a>
            </div>
            <div class="relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-11 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder-slate-300" />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2">
                <svg v-if="!showPassword" class="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <svg v-else class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          </div>

          <!-- Keep me signed in -->
          <div v-if="!isRegister" class="flex items-center gap-2.5">
            <input v-model="keepSignedIn" type="checkbox" id="keep-signed" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
            <label for="keep-signed" class="text-[13px] text-slate-500 font-medium cursor-pointer select-none">Keep me signed in</label>
          </div>

          <!-- Submit Button -->
          <button type="submit" :disabled="loading"
            class="w-full bg-gradient-to-r from-[#5B4EFF] to-[#4A3AFF] hover:from-[#4A3AFF] hover:to-[#3929EF] text-white font-bold text-[14px] py-4 rounded-xl transition-all shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]">
            <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            {{ loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In to Dashboard') }}
            <svg v-if="!loading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-4 my-7">
          <div class="flex-1 h-px bg-slate-200"></div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">or continue with</span>
          <div class="flex-1 h-px bg-slate-200"></div>
        </div>

        <!-- Social Buttons -->
        <div class="grid grid-cols-2 gap-3">
          <button class="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button class="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
            Microsoft
          </button>
        </div>

        <!-- Toggle Mode -->
        <p class="text-center text-[13px] text-slate-400 font-medium mt-8">
          {{ isRegister ? 'Already have an account?' : 'New to EstateSync?' }}
          <button @click="toggleMode" class="text-indigo-600 font-bold hover:text-indigo-800 transition-colors ml-1">
            {{ isRegister ? 'Sign in' : 'Create an account' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
