<script setup lang="ts">
import type { Component } from 'vue'
import { TrendingUp, TrendingDown, Minus } from '@lucide/vue'

defineProps<{
  title: string
  value: string | number
  icon: Component
  trend?: number
  subtitle?: string
  accent?: 'blue' | 'green' | 'purple' | 'orange' | 'rose'
}>()

const accents = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  orange: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
}
</script>

<template>
  <div class="card card-hover px-3.5 py-3">
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-2 min-w-0">
        <div :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accents[accent || 'blue']]">
          <component :is="icon" class="h-3.5 w-3.5" />
        </div>
        <p class="text-[11px] font-medium text-slate-500 truncate">{{ title }}</p>
      </div>
      <span
        v-if="trend !== undefined"
        :class="[
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0',
          trend > 0 ? 'bg-emerald-50 text-emerald-700' : trend < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500',
        ]"
      >
        <TrendingUp v-if="trend > 0" class="h-2.5 w-2.5" />
        <TrendingDown v-else-if="trend < 0" class="h-2.5 w-2.5" />
        <Minus v-else class="h-2.5 w-2.5" />
        {{ Math.abs(trend) }}%
      </span>
    </div>
    <p class="text-xl font-bold text-slate-900 tracking-tight leading-none pl-9">{{ value }}</p>
    <p v-if="subtitle" class="text-[10px] text-slate-400 mt-1 pl-9">{{ subtitle }}</p>
  </div>
</template>
