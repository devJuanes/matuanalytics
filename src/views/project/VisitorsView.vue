<script setup lang="ts">
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import DataTable from '@/components/DataTable.vue'
import { formatDuration } from '@/utils/format'

const analytics = useAnalyticsStore()
const d = computed(() => analytics.dashboard)

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function visitorStatus(row: Record<string, unknown>) {
  const duration = Number(row.durationSeconds || 0)
  if (duration > 180) return { label: 'Engaged', variant: 'success' as const }
  if (duration > 30) return { label: 'Activo', variant: 'info' as const }
  if (duration > 0) return { label: 'Breve', variant: 'warning' as const }
  return { label: 'Rebote', variant: 'neutral' as const }
}

function visitorLabel(row: Record<string, unknown>) {
  const city = String(row.city || '')
  const country = String(row.country || '')
  return city || country || 'Anónimo'
}

function locationLabel(row: Record<string, unknown>) {
  const parts = [row.city, row.country].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
</script>

<template>
  <div v-if="d" class="space-y-5">
    <DataTable
      title="Historial de visitantes"
      :columns="[
        { key: 'city', label: 'Visitante', type: 'avatar', format: (_v, row) => visitorLabel(row!) },
        { key: 'city', label: 'Ubicación', format: (_v, row) => locationLabel(row!) },
        { key: 'browser', label: 'Navegador' },
        { key: 'device', label: 'Dispositivo' },
        { key: 'durationSeconds', label: 'Duración', format: (v) => formatDuration(Number(v)) },
        { key: 'lastSeen', label: 'Última visita', format: (v) => formatTime(Number(v)) },
        { key: 'durationSeconds', label: 'Estado', type: 'status', statusFn: visitorStatus },
      ]"
      :rows="d.recentVisitors"
      empty-message="Aún no hay visitantes registrados. Instala el código de tracking en tu sitio."
    />
  </div>
</template>
