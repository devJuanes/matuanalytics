<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthInput from '@/components/ui/AuthInput.vue'
import { Mail, Lock, User, Loader2, ArrowRight } from '@lucide/vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref<string | null>(null)

async function handleSubmit() {
  localError.value = null
  auth.clearError()

  if (password.value !== confirmPassword.value) {
    localError.value = 'Las contraseñas no coinciden'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  try {
    await auth.register(name.value, email.value, password.value)
    router.push({ name: 'projects' })
  } catch {
    // error in store
  }
}

const displayError = () => localError.value || auth.error
</script>

<template>
  <AuthLayout>
    <div>
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Crear cuenta</h2>
      <p class="mt-1.5 text-sm text-slate-500">Empieza a rastrear tu sitio en minutos</p>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <div
          v-if="displayError()"
          class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700"
        >
          {{ displayError() }}
        </div>

        <AuthInput
          v-model="name"
          label="Nombre completo"
          placeholder="Juan Pérez"
          :icon="User"
          autocomplete="name"
          required
        />

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
          placeholder="Mínimo 6 caracteres"
          :icon="Lock"
          autocomplete="new-password"
          required
        />

        <AuthInput
          v-model="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          placeholder="Repite tu contraseña"
          :icon="Lock"
          autocomplete="new-password"
          required
        />

        <button
          type="submit"
          :disabled="auth.loading"
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:opacity-60 transition-all"
        >
          <Loader2 v-if="auth.loading" class="h-4 w-4 animate-spin" />
          <template v-else>
            Crear cuenta
            <ArrowRight class="h-4 w-4" />
          </template>
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?
        <RouterLink
          to="/login"
          class="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          @click="auth.clearError()"
        >
          Iniciar sesión
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
