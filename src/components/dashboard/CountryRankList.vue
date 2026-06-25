<script setup lang="ts">
import { computed } from 'vue'
import { Globe } from '@lucide/vue'
import { formatNumber } from '@/utils/format'

const props = defineProps<{
  title: string
  items: { name: string; code?: string; count: number }[]
  max?: number
}>()

const topItems = computed(() => {
  const list = props.items.slice(0, props.max || 5)
  const maxCount = Math.max(...list.map((i) => i.count), 1)
  return list.map((item) => ({
    ...item,
    pct: Math.round((item.count / maxCount) * 100),
  }))
})
</script>

<template>
  <div class="card p-5 h-full">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
      <Globe class="h-4 w-4 text-slate-400" />
    </div>

    <div v-if="topItems.length === 0" class="py-8 text-center text-sm text-slate-400">
      Sin datos geográficos aún
    </div>

    <ul v-else class="space-y-3">
      <li v-for="item in topItems" :key="item.name" class="flex items-center gap-3">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
          {{ item.code || item.name.slice(0, 2) }}
        </span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-medium text-slate-700 truncate">{{ item.name }}</span>
            <span class="text-xs font-semibold text-slate-900 tabular-nums">{{ formatNumber(item.count) }}</span>
          </div>
          <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full bg-slate-900 transition-all duration-500"
              :style="{ width: item.pct + '%' }"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
