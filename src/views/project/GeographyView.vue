<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import LiveMap from '@/components/dashboard/LiveMap.vue'
import CountryRankList from '@/components/dashboard/CountryRankList.vue'
import DataTable from '@/components/DataTable.vue'
import BarChartCard from '@/components/dashboard/BarChartCard.vue'
import { formatNumber } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

const countryLabels = computed(() => d.value?.countries.slice(0, 8).map((c) => c.code) || [])
const countryData = computed(() => d.value?.countries.slice(0, 8).map((c) => c.count) || [])

const totalCountryVisits = computed(() =>
  d.value?.countries.reduce((sum, c) => sum + c.count, 0) || 0,
)

const mapPoints = computed(() => {
  if (!d.value) return []
  return d.value.cities
    .filter((c) => c.lat && c.lng)
    .map((c) => ({
      lat: c.lat,
      lng: c.lng,
      city: c.name,
      country: c.country,
      pageTitle: `${c.count} visitas`,
      browser: '',
    }))
})
</script>

<template>
  <div v-if="d" class="space-y-5">
    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <LiveMap mode="historical" :points="mapPoints" />
      </div>
      <CountryRankList
        title="Top mercados"
        :items="d.countries"
        :max="8"
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <BarChartCard
        title="Visitas por país"
        subtitle="Top 8 países"
        :labels="countryLabels"
        :data="countryData"
        color="#111827"
        :height="240"
      />

      <DataTable
        title="Ciudades"
        compact
        :columns="[
          { key: 'name', label: 'Ciudad' },
          { key: 'country', label: 'País' },
          { key: 'count', label: 'Visitas', align: 'right' },
        ]"
        :rows="d.cities.slice(0, 10)"
        empty-message="Visita tu sitio para registrar ubicaciones"
      />
    </div>

    <DataTable
      title="Todos los países"
      :columns="[
        { key: 'name', label: 'País', type: 'avatar', format: (_v, row) => String(row?.code || row?.name || '?') },
        { key: 'name', label: 'Nombre' },
        { key: 'count', label: 'Visitas', align: 'right', format: (v) => formatNumber(Number(v)) },
        { key: 'count', label: 'Share', format: (v) => totalCountryVisits ? `${Math.round(Number(v) / totalCountryVisits * 100)}%` : '0%' },
      ]"
      :rows="d.countries"
      empty-message="Sin datos de geolocalización"
    />
  </div>
</template>
