<script setup lang="ts">
import { Code, Radio, Download } from '@lucide/vue'
import DateRangeSelect from '@/components/dashboard/DateRangeSelect.vue'

defineProps<{
  projectName: string
  activeUsers: number
}>()

const dateRange = defineModel<string>('dateRange', { default: '7d' })

defineEmits<{ tracking: [] }>()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
    <div>
      <h2 class="text-lg font-bold text-slate-900 tracking-tight">{{ projectName }}</h2>
      <p class="text-xs text-slate-500 mt-0.5">Panel de analítica</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <DateRangeSelect v-model="dateRange" />

      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors"
        :class="activeUsers > 0
          ? 'bg-emerald-50 ring-emerald-200 text-emerald-700'
          : 'bg-slate-100 ring-slate-200 text-slate-500'"
      >
        <span
          class="relative flex h-2 w-2"
          :class="activeUsers > 0 ? '' : 'opacity-40'"
        >
          <span
            v-if="activeUsers > 0"
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
          />
          <span
            class="relative inline-flex h-2 w-2 rounded-full"
            :class="activeUsers > 0 ? 'bg-emerald-500' : 'bg-slate-400'"
          />
        </span>
        <Radio class="h-3 w-3" :class="activeUsers > 0 ? 'text-emerald-600' : 'text-slate-400'" />
        {{ activeUsers }} en vivo
      </div>

      <button
        class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        title="Exportar"
      >
        <Download class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">Exportar</span>
      </button>

      <button
        class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
        @click="$emit('tracking')"
      >
        <Code class="h-3.5 w-3.5" />
        Tracking
      </button>
    </div>
  </div>
</template>
