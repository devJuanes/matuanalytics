<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Copy, Check, Code2, ClipboardPaste, Rocket, BarChart3 } from '@lucide/vue'
import { TRACKER_URL } from '@/config/app'

const props = defineProps<{
  trackingId: string
  trackingCode: string
  apiUrl?: string
}>()

defineEmits<{ close: [] }>()

const copied = ref(false)
const activeTab = ref<'simple' | 'async'>('simple')

const trackerBase = computed(() => props.apiUrl || TRACKER_URL)

const simpleCode = computed(
  () => `<script src="${trackerBase.value}/tracker.js" data-site-id="${props.trackingId}" async><\/script>`,
)

const asyncCode = computed(() => `(function(){
var s=document.createElement('script');
s.src='${trackerBase.value}/tracker.js';
s.setAttribute('data-site-id','${props.trackingId}');
s.async=true;
document.head.appendChild(s);
})();`)

const displayCode = computed(() =>
  activeTab.value === 'simple' ? simpleCode.value : `<script>\n${asyncCode.value}\n<\/script>`,
)

const steps = [
  {
    icon: ClipboardPaste,
    title: 'Copia el script',
    text: 'Usa el botón Copiar. Es tu ID de seguimiento único, como el Measurement ID de Google Analytics.',
  },
  {
    icon: Code2,
    title: 'Pégalo en tu sitio',
    text: 'Abre el HTML principal (index.html, layout o _document) y pega el código justo antes de </head>. Funciona en sitios estáticos, WordPress, React, Vue y Next.js.',
  },
  {
    icon: Rocket,
    title: 'Publica y verifica',
    text: 'Despliega tu sitio y ábrelo en otra pestaña. En segundos verás usuarios en vivo en la pestaña Live del dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Rastreo automático',
    text: 'El script registra páginas vistas, sesiones, país y dispositivo. En SPAs detecta cambios de ruta sin configuración extra.',
  },
]

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5 sticky top-0 bg-white z-10">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Code2 class="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Instalar seguimiento</h2>
            <p class="text-sm text-slate-500">Como Google Analytics — un script, todo automático</p>
          </div>
        </div>
        <button class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" @click="$emit('close')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="(step, i) in steps"
            :key="step.title"
            class="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
          >
            <div class="flex items-start gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                <component :is="step.icon" class="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paso {{ i + 1 }}</p>
                <p class="text-sm font-semibold text-slate-900 mt-0.5">{{ step.title }}</p>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ step.text }}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tracking ID</p>
          <code class="block rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-mono font-medium text-primary-700">
            {{ trackingId }}
          </code>
        </div>

        <div class="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            :class="['flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all', activeTab === 'simple' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
            @click="activeTab = 'simple'"
          >
            Script simple (recomendado)
          </button>
          <button
            :class="['flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all', activeTab === 'async' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
            @click="activeTab = 'async'"
          >
            Carga asíncrona
          </button>
        </div>

        <div class="relative">
          <pre class="rounded-xl bg-slate-900 p-5 text-sm text-slate-100 overflow-x-auto leading-relaxed"><code>{{ displayCode }}</code></pre>
          <button
            class="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
            @click="copyText(displayCode)"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>

        <div class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
          <strong>Dónde pegarlo:</strong> en el <code class="font-mono bg-amber-100/80 px-1 rounded">&lt;head&gt;</code>
          de tu app — por ejemplo
          <code class="font-mono bg-amber-100/80 px-1 rounded">public/index.html</code>,
          <code class="font-mono bg-amber-100/80 px-1 rounded">index.html</code> en la raíz, o el layout principal de tu framework.
        </div>
      </div>
    </div>
  </div>
</template>
