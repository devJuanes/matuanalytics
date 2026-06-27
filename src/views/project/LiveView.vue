<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import LiveMap from '@/components/dashboard/LiveMap.vue'
import DataTable from '@/components/DataTable.vue'
import { Activity, Users, Globe, Clock } from '@lucide/vue'
import { formatNumber, formatDuration } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

const livePoints = computed(() => d.value?.liveMapPoints || [])
const activeCountries = computed(() => {
  const codes = new Set<string>()
  for (const v of d.value?.activeVisitors || []) {
    if (v.countryCode) codes.add(v.countryCode)
    else if (v.country) codes.add(v.country)
  }
  return codes.size
})

function truncate(s: string, max = 30) {
  if (!s) return '/'
  return s.length > max ? s.slice(0, max) + '...' : s
}

function pageLabel(row: Record<string, unknown>) {
  const title = String(row.pageTitle || '')
  const url = String(row.pageUrl || '')
  if (title) return truncate(title, 28)
  try {
    return truncate(new URL(url).pathname || url, 28)
  } catch {
    return truncate(url, 28)
  }
}

function liveStatus(row: Record<string, unknown>) {
  const duration = Number(row.durationSeconds || 0)
  if (duration > 120) return { label: 'Engaged', variant: 'success' as const }
  if (duration > 30) return { label: 'Activo', variant: 'info' as const }
  return { label: 'En línea', variant: 'success' as const }
}

function visitorLabel(row: Record<string, unknown>) {
  const parts = [row.city, row.country].filter(Boolean)
  if (parts.length) return String(parts.join(', '))
  return `${row.browser || 'Visitante'} · ${row.device || 'Web'}`
}
</script>

<template>
  <div v-if="d" class="space-y-5">
    <div
      class="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-white transition-colors"
      :class="analytics.activeUsers > 0 ? 'bg-emerald-700' : 'bg-slate-800'"
    >
      <span class="relative flex h-2.5 w-2.5">
        <span
          v-if="analytics.activeUsers > 0"
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"
        />
        <span
          class="relative inline-flex h-2.5 w-2.5 rounded-full"
          :class="analytics.activeUsers > 0 ? 'bg-emerald-300' : 'bg-slate-500'"
        />
      </span>
      <span class="text-xs font-semibold">
        {{ analytics.activeUsers > 0 ? 'Visitantes conectados ahora' : 'Sin visitantes en vivo' }}
      </span>
      <span class="text-xs ml-auto opacity-80">
        {{ analytics.activeUsers }} {{ analytics.activeUsers === 1 ? 'usuario' : 'usuarios' }} activos
      </span>
    </div>

    <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <KpiCard title="Usuarios activos" :value="analytics.activeUsers" :icon="Activity" accent="green" />
      <KpiCard title="Sesiones hoy" :value="formatNumber(d.stats.visitsToday)" :icon="Users" accent="blue" />
      <KpiCard title="Países en vivo" :value="activeCountries" :icon="Globe" accent="purple" />
      <KpiCard
        title="Tiempo medio en vivo"
        :value="d.activeVisitors.length
          ? formatDuration(Math.round(d.activeVisitors.reduce((s, v) => s + (v.durationSeconds || 0), 0) / d.activeVisitors.length))
          : '0s'"
        :icon="Clock"
        accent="orange"
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-5">
      <div class="lg:col-span-3">
        <LiveMap
          mode="live"
          :points="livePoints"
          :active-count="analytics.activeUsers"
        />
      </div>
      <div class="lg:col-span-2">
        <DataTable
          title="Usuarios activos ahora"
          compact
          :columns="[
            { key: 'city', label: 'Visitante', type: 'avatar', format: (_v, row) => visitorLabel(row || {}) },
            { key: 'pageUrl', label: 'Página actual', format: (_v, row) => pageLabel(row || {}) },
            { key: 'durationSeconds', label: 'Estado', type: 'status', statusFn: liveStatus },
          ]"
          :rows="d.activeVisitors"
          empty-message="No hay visitantes activos en este momento"
        />
      </div>
    </div>
  </div>
</template>
