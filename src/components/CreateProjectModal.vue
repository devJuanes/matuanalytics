<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AuthInput from '@/components/ui/AuthInput.vue'
import { X, FolderPlus, Globe, Link2, Loader2, Sparkles } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [payload: { name: string; url: string }]
}>()

const name = ref('')
const url = ref('')

function reset() {
  name.value = ''
  url.value = ''
}

function handleClose() {
  reset()
  emit('close')
}

function handleSubmit() {
  if (!name.value.trim() || props.loading) return
  emit('create', { name: name.value.trim(), url: url.value.trim() })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) handleClose()
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) reset()
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <div
          class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          @click="handleClose"
        />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
          appear
        >
          <div
            v-if="open"
            class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
          >
            <!-- Header con gradiente -->
            <div class="relative bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700 px-6 pt-6 pb-8">
              <div class="absolute inset-0 opacity-30">
                <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
                <div class="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-primary-300/30 blur-xl" />
              </div>

              <button
                class="absolute right-4 top-4 rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                @click="handleClose"
              >
                <X class="h-5 w-5" />
              </button>

              <div class="relative flex items-start gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                  <FolderPlus class="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 id="create-project-title" class="text-xl font-bold text-white tracking-tight">
                    Nuevo proyecto
                  </h2>
                  <p class="mt-1 text-sm text-primary-100">
                    Configura tu sitio y obtén el código de seguimiento al instante
                  </p>
                </div>
              </div>
            </div>

            <!-- Formulario -->
            <form class="px-6 py-6 space-y-5" @submit.prevent="handleSubmit">
              <AuthInput
                v-model="name"
                label="Nombre del proyecto"
                placeholder="Ej. Mi tienda online"
                :icon="Globe"
                required
              />

              <AuthInput
                v-model="url"
                label="URL del sitio (opcional)"
                type="url"
                placeholder="https://tusitio.com"
                :icon="Link2"
              />

              <div class="flex items-start gap-3 rounded-xl bg-primary-50/80 border border-primary-100 px-4 py-3">
                <Sparkles class="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                <p class="text-xs text-primary-800 leading-relaxed">
                  Al crear el proyecto recibirás un <strong>Tracking ID</strong> único y el script listo para pegar en tu web.
                </p>
              </div>

              <div class="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  @click="handleClose"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="loading || !name.trim()"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                  <FolderPlus v-else class="h-4 w-4" />
                  Crear proyecto
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
