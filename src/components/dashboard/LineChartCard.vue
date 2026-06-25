<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'

const props = defineProps<{
  title: string
  subtitle?: string
  labels: string[]
  data: number[]
  color?: string
  height?: number
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    data: props.data,
    borderColor: props.color || '#111827',
    backgroundColor: (props.color || '#111827') + '12',
    fill: true,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: props.color || '#111827',
    borderWidth: 2,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      padding: 12,
      cornerRadius: 10,
      titleFont: { size: 11 },
      bodyFont: { size: 13, weight: 'bold' as const },
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0 },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9', drawTicks: false },
      ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0, padding: 8 },
      border: { display: false },
    },
  },
}
</script>

<template>
  <div class="card p-5">
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
      <p v-if="subtitle" class="text-[11px] text-slate-500 mt-0.5">{{ subtitle }}</p>
    </div>
    <div :style="{ height: (height || 240) + 'px' }">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
