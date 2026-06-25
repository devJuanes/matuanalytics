<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  data: { label: string; value: number }[]
  color?: string
}>()

const maxValue = computed(() => Math.max(...props.data.map((d) => d.value), 1))
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6">
    <h3 class="text-sm font-semibold text-slate-900 mb-5">{{ title }}</h3>
    <div class="flex items-end gap-1.5 h-44">
      <div
        v-for="(item, i) in data"
        :key="i"
        class="flex-1 flex flex-col items-center gap-1.5 group"
      >
        <span class="text-[10px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{{ item.value }}</span>
        <div
          class="w-full rounded-t-md transition-all duration-500 ease-out group-hover:opacity-80"
          :style="{
            height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`,
            backgroundColor: color || '#3b82f6',
          }"
        />
        <span class="text-[10px] text-slate-400 truncate w-full text-center font-medium">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>
