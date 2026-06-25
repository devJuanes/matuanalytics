<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthInput from '@/components/ui/AuthInput.vue'
import { Mail, Lock, Loader2, ArrowRight } from '@lucide/vue'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')

async function handleSubmit() {
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'projects' })
  } catch {
    // error in store
  }
}
</script>

<template>
  <AuthLayout>
    <div>
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Bienvenido de nuevo</h2>
      <p class="mt-1.5 text-sm text-slate-500">Ingresa a tu panel de analítica</p>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <div
          v-if="auth.error"
          class="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700"
        >
          {{ auth.error }}
        </div>

        <AuthInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="tu@empresa.com"
          :icon="Mail"
          autocomplete="email"
          required
        />

        <AuthInput
          v-model="password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          :icon="Lock"
          autocomplete="current-password"
          required
        />

        <button
          type="submit"
          :disabled="auth.loading"
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:opacity-60 transition-all"
        >
          <Loader2 v-if="auth.loading" class="h-4 w-4 animate-spin" />
          <template v-else>
            Iniciar sesión
            <ArrowRight class="h-4 w-4" />
          </template>
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?
        <RouterLink
          to="/register"
          class="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          @click="auth.clearError()"
        >
          Crear cuenta
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
