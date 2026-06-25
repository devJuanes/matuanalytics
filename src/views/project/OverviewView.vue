<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import LineChartCard from '@/components/dashboard/LineChartCard.vue'
import BarChartCard from '@/components/dashboard/BarChartCard.vue'
import CountryRankList from '@/components/dashboard/CountryRankList.vue'
import DataTable from '@/components/DataTable.vue'
import { Eye, Users, Clock, MousePointerClick, FileText } from '@lucide/vue'
import { formatDuration, formatNumber, formatPercent } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

const periodLabel = computed(() => {
  const r = analytics.dateRange
  if (r === 'today') return 'Hoy'
  if (r === '30d') return '30 días'
  return '7 días'
})

const chartDayTitle = computed(() => {
  const r = analytics.dateRange
  if (r === 'today') return 'Visitas de hoy'
  if (r === '30d') return 'Visitas últimos 30 días'
  return 'Visitas últimos 7 días'
})

const hourSubtitle = computed(() =>
  analytics.dateRange === 'today' ? 'Distribución horaria de hoy' : 'Distribución horaria del período',
)

const dayLabels = computed(() => d.value?.visitsByDay.map((x) => x.date.slice(5)) || [])
const dayData = computed(() => d.value?.visitsByDay.map((x) => x.count) || [])
const hourLabels = computed(() => d.value?.visitsByHour.map((x) => `${x.hour}h`) || [])
const hourData = computed(() => d.value?.visitsByHour.map((x) => x.count) || [])

const pagesPerSession = computed(() => {
  if (!d.value) return '0'
  const { totalPageviews, uniqueVisitors } = d.value.stats
  return (totalPageviews / Math.max(uniqueVisitors, 1)).toFixed(1)
})

function truncate(s: string, max = 35) {
  if (!s) return '-'
  return s.length > max ? s.slice(0, max) + '...' : s
}

function visitorStatus(row: Record<string, unknown>) {
  const duration = Number(row.durationSeconds || 0)
  if (duration > 120) return { label: 'Engaged', variant: 'success' as const }
  if (duration > 30) return { label: 'Activo', variant: 'info' as const }
  return { label: 'Rebote', variant: 'warning' as const }
}
</script>

<template>
  <div v-if="d" class="space-y-5">
    <!-- Compact KPI row -->
    <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        :title="`Visitas (${periodLabel})`"
        :value="formatNumber(d.stats.totalPageviews)"
        :icon="Eye"
        :trend="d.stats.trends.visitsToday"
        accent="blue"
      />
      <KpiCard
        title="Visitantes únicos"
        :value="formatNumber(d.stats.uniqueVisitors)"
        :icon="Users"
        :trend="d.stats.trends.visitors"
        accent="green"
      />
      <KpiCard
        title="Duración media"
        :value="formatDuration(d.stats.avgSessionDuration)"
        :icon="Clock"
        :trend="d.stats.trends.duration"
        accent="purple"
      />
      <KpiCard
        title="Tasa de rebote"
        :value="formatPercent(d.stats.bounceRate)"
        :icon="MousePointerClick"
        accent="orange"
      />
      <KpiCard
        title="Págs / sesión"
        :value="pagesPerSession"
        :icon="FileText"
        :subtitle="`${formatNumber(d.stats.totalPageviews)} vistas`"
        accent="blue"
      />
    </div>

    <!-- Main chart + side widgets -->
    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <LineChartCard
          :title="chartDayTitle"
          subtitle="Tendencia diaria de sesiones"
          :labels="dayLabels"
          :data="dayData"
          color="#111827"
          :height="280"
        />
      </div>
      <CountryRankList
        title="Top países"
        :items="d.countries"
        :max="5"
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <BarChartCard
        title="Visitas por hora"
        :subtitle="hourSubtitle"
        :labels="hourLabels"
        :data="hourData"
        color="#6366f1"
        :height="220"
      />
      <DataTable
        title="Páginas más visitadas"
        compact
        :columns="[
          { key: 'title', label: 'Página', format: (v) => truncate(String(v || '')) },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.topPages.slice(0, 6)"
      />
      <DataTable
        title="Fuentes de tráfico"
        compact
        :columns="[
          { key: 'name', label: 'Referrer' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.referrers.slice(0, 6)"
      />
    </div>

    <!-- Active visitors + tech breakdown -->
    <div class="grid gap-5 lg:grid-cols-3">
      <DataTable
        title="Visitantes recientes"
        compact
        :columns="[
          { key: 'city', label: 'Visitante', type: 'avatar', format: (_v, row) => String(row?.city || row?.country || '?') },
          { key: 'browser', label: 'Navegador' },
          { key: 'durationSeconds', label: 'Duración', format: (v) => formatDuration(Number(v)) },
          { key: 'durationSeconds', label: 'Estado', type: 'status', statusFn: visitorStatus },
        ]"
        :rows="d.recentVisitors.slice(0, 8)"
        empty-message="Aún no hay visitantes"
      />
      <DataTable
        title="Navegadores"
        compact
        :columns="[
          { key: 'name', label: 'Navegador' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.browsers.slice(0, 6)"
      />
      <DataTable
        title="Sistemas operativos"
        compact
        :columns="[
          { key: 'name', label: 'Sistema' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.operatingSystems.slice(0, 6)"
      />
    </div>
  </div>
</template>
