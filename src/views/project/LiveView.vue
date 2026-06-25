<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import LiveMap from '@/components/dashboard/LiveMap.vue'
import DataTable from '@/components/DataTable.vue'
import { Activity, Users, Globe, Zap } from '@lucide/vue'
import { formatNumber } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

function truncate(s: string, max = 30) {
  if (!s) return '/'
  return s.length > max ? s.slice(0, max) + '...' : s
}

function liveStatus(row: Record<string, unknown>) {
  const duration = Number(row.durationSeconds || 0)
  if (duration > 60) return { label: 'Engaged', variant: 'success' as const }
  return { label: 'Activo', variant: 'info' as const }
}
</script>

<template>
  <div v-if="d" class="space-y-5">
    <!-- Live pulse banner -->
    <div class="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-white">
      <span class="relative flex h-2 w-2">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span class="text-xs font-medium">Datos en tiempo real</span>
      <span class="text-xs text-slate-400 ml-auto">{{ analytics.activeUsers }} usuarios activos ahora</span>
    </div>

    <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <KpiCard title="Usuarios activos" :value="analytics.activeUsers" :icon="Activity" accent="green" />
      <KpiCard title="Sesiones hoy" :value="formatNumber(d.stats.visitsToday)" :icon="Users" accent="blue" />
      <KpiCard
        title="Países activos"
        :value="d.liveMapPoints.length || d.countries.length"
        :icon="Globe"
        accent="purple"
      />
      <KpiCard
        title="Eventos/min"
        :value="Math.max(analytics.activeUsers, 0)"
        :icon="Zap"
        :subtitle="'Estimado en vivo'"
        accent="orange"
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-5">
      <div class="lg:col-span-3">
        <LiveMap :points="d.liveMapPoints.length ? d.liveMapPoints : d.cities.map(c => ({ lat: c.lat, lng: c.lng, city: c.name, country: c.country, pageTitle: '', browser: '' }))" />
      </div>
      <div class="lg:col-span-2">
        <DataTable
          title="Usuarios activos ahora"
          compact
          :columns="[
            { key: 'pageTitle', label: 'Visitante', type: 'avatar', format: (_v, row) => String(row?.city || row?.country || 'Anónimo') },
            { key: 'pageTitle', label: 'Página', format: (v) => truncate(String(v || '')) },
            { key: 'durationSeconds', label: 'Estado', type: 'status', statusFn: liveStatus },
          ]"
          :rows="d.activeVisitors"
          empty-message="No hay visitantes activos en este momento"
        />
      </div>
    </div>
  </div>
</template>
