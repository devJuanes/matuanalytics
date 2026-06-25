<script setup lang="ts">
import { ref } from 'vue'
import { X, Copy, Check, Code2 } from '@lucide/vue'

const props = defineProps<{
  trackingId: string
  trackingCode: string
  apiUrl?: string
}>()

defineEmits<{ close: [] }>()

const copied = ref(false)
const activeTab = ref<'simple' | 'async'>('simple')

const asyncCode = `(function(){
var script=document.createElement('script');
script.src='${props.apiUrl || window.location.origin.replace(':5173', ':3001').replace(':5174', ':3001')}/tracker.js';
script.setAttribute('data-site-id','${props.trackingId}');
document.head.appendChild(script);
})();`

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Code2 class="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Código de seguimiento</h2>
            <p class="text-sm text-slate-500">Instala en tu sitio web</p>
          </div>
        </div>
        <button class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" @click="$emit('close')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="p-6 space-y-5">
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
            Script simple
          </button>
          <button
            :class="['flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all', activeTab === 'async' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
            @click="activeTab = 'async'"
          >
            Carga asíncrona
          </button>
        </div>

        <div class="relative">
          <pre class="rounded-xl bg-slate-900 p-5 text-sm text-slate-100 overflow-x-auto leading-relaxed"><code>{{ activeTab === 'simple' ? trackingCode : `<script>\n${asyncCode}\n</script>` }}</code></pre>
          <button
            class="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
            @click="copyText(activeTab === 'simple' ? trackingCode : `<script>\n${asyncCode}\n</script>`)"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>

        <p class="text-sm text-slate-500">
          Pega este código antes de <code class="rounded bg-slate-100 px-1.5 py-0.5 text-primary-600 text-xs font-mono">&lt;/head&gt;</code> en tu sitio web.
        </p>
      </div>
    </div>
  </div>
</template>
