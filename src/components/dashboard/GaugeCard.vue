<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'

const props = defineProps<{
  title: string
  value: number
  label?: string
  color?: string
}>()

const pct = computed(() => Math.min(100, Math.max(0, props.value)))

const chartData = computed(() => ({
  labels: ['Value', 'Remaining'],
  datasets: [{
    data: [pct.value, 100 - pct.value],
    backgroundColor: [props.color || '#10b981', '#f1f5f9'],
    borderWidth: 0,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  rotation: -90,
  circumference: 180,
  cutout: '78%',
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
}))
</script>

<template>
  <div class="card p-5">
    <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
    <div class="relative mx-auto mt-2 h-36 w-full max-w-[220px]">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="absolute inset-x-0 bottom-2 text-center">
        <p class="text-2xl font-bold text-slate-900 tracking-tight">{{ Math.round(pct) }}%</p>
        <p v-if="label" class="text-[11px] text-slate-500 mt-0.5">{{ label }}</p>
      </div>
    </div>
  </div>
</template>
