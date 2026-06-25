<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import LineChartCard from '@/components/dashboard/LineChartCard.vue'
import BarChartCard from '@/components/dashboard/BarChartCard.vue'
import GaugeCard from '@/components/dashboard/GaugeCard.vue'
import DataTable from '@/components/DataTable.vue'
import { formatNumber } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

const dayLabels = computed(() => d.value?.visitsByDay.map((x) => x.date.slice(5)) || [])
const visitorData = computed(() => d.value?.visitsByDay.map((x) => x.visitors) || [])
const durationLabels = computed(() => d.value?.durationBuckets.map((x) => x.label) || [])
const durationData = computed(() => d.value?.durationBuckets.map((x) => x.count) || [])

const engagementScore = computed(() => {
  if (!d.value) return 0
  return Math.max(0, 100 - d.value.stats.bounceRate)
})
</script>

<template>
  <div v-if="d" class="space-y-5">
    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <LineChartCard
          title="Visitantes únicos"
          subtitle="Últimos 7 días"
          :labels="dayLabels"
          :data="visitorData"
          color="#10b981"
          :height="260"
        />
      </div>
      <GaugeCard
        title="Engagement"
        :value="engagementScore"
        :label="`${Math.round(100 - d.stats.bounceRate)}% no rebote`"
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <BarChartCard
        title="Duración de sesión"
        subtitle="Distribución por rangos"
        :labels="durationLabels"
        :data="durationData"
        color="#f59e0b"
        :height="220"
      />
      <DataTable
        title="Referrers"
        compact
        :columns="[
          { key: 'name', label: 'Fuente' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.referrers.slice(0, 8)"
      />
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-4">Resumen del periodo</h3>
        <dl class="space-y-3">
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Nuevos visitantes</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ formatNumber(d.stats.newVisitors) }}</dd>
          </div>
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Recurrentes</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ formatNumber(d.stats.returningVisitors) }}</dd>
          </div>
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Visitas esta semana</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ formatNumber(d.stats.visitsThisWeek) }}</dd>
          </div>
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Visitas este mes</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ formatNumber(d.stats.visitsThisMonth) }}</dd>
          </div>
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Tasa de rebote</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ d.stats.bounceRate }}%</dd>
          </div>
          <div class="flex justify-between items-center">
            <dt class="text-xs text-slate-500">Páginas vistas</dt>
            <dd class="text-sm font-bold text-slate-900 tabular-nums">{{ formatNumber(d.stats.totalPageviews) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <DataTable
        title="Navegadores"
        compact
        :columns="[
          { key: 'name', label: 'Navegador' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.browsers"
      />
      <DataTable
        title="Sistemas operativos"
        compact
        :columns="[
          { key: 'name', label: 'Sistema' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.operatingSystems"
      />
    </div>

    <DataTable
      title="Páginas más visitadas"
      :columns="[
        { key: 'title', label: 'Título' },
        { key: 'url', label: 'URL', format: (v) => String(v || '').slice(0, 50) },
        { key: 'count', label: 'Visitas', align: 'right' },
      ]"
      :rows="d.topPages"
    />
  </div>
</template>
