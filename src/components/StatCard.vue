<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  value: string | number
  icon: Component
  color?: 'blue' | 'green' | 'purple' | 'orange'
  trend?: string
}>()

const colorClasses = {
  blue: { bg: 'bg-primary-50', icon: 'text-primary-600', ring: 'ring-primary-100' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  purple: { bg: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100' },
  orange: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="text-3xl font-bold text-slate-900 tracking-tight">{{ value }}</p>
        <p v-if="trend" class="text-xs font-medium text-emerald-600">{{ trend }}</p>
      </div>
      <div
        :class="[
          'flex h-12 w-12 items-center justify-center rounded-xl ring-1',
          colorClasses[color || 'blue'].bg,
          colorClasses[color || 'blue'].ring,
        ]"
      >
        <component :is="icon" :class="['h-6 w-6', colorClasses[color || 'blue'].icon]" />
      </div>
    </div>
  </div>
</template>
