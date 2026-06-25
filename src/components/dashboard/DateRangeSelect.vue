<script setup lang="ts">
import { Calendar } from '@lucide/vue'

const model = defineModel<string>({ default: '7d' })

const options = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
]
</script>

<template>
  <div class="relative">
    <Calendar class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    <select
      v-model="model"
      class="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">▾</span>
  </div>
</template>
