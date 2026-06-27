<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = withDefaults(defineProps<{
  points: { lat: number; lng: number; city: string; country: string; pageTitle?: string; browser?: string }[]
  mode?: 'live' | 'historical'
  activeCount?: number
}>(), {
  mode: 'historical',
  activeCount: 0,
})

const mapEl = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null

function initMap() {
  if (!mapEl.value || map) return

  map = L.map(mapEl.value, { zoomControl: true, scrollWheelZoom: false }).setView([20, 0], 2)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)

  markers = L.layerGroup().addTo(map)
  updateMarkers()
}

function updateMarkers() {
  if (!map || !markers) return
  markers.clearLayers()

  const valid = props.points.filter((p) => p.lat && p.lng)
  for (const p of valid) {
    const color = props.mode === 'live' ? '#10b981' : '#111827'
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: props.mode === 'live' ? 8 : 7,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.92,
    })
    marker.bindPopup(
      `<strong>${p.city || p.country || 'Visitante'}</strong><br/>${p.pageTitle || ''}<br/><small>${p.browser || ''}</small>`,
    )
    markers.addLayer(marker)
  }

  if (valid.length === 1) {
    map.setView([valid[0].lat, valid[0].lng], 5)
  } else if (valid.length > 1) {
    const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 })
  }
}

onMounted(() => {
  setTimeout(initMap, 100)
})

watch(() => props.points, updateMarkers, { deep: true })
watch(() => props.mode, updateMarkers)

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="card overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          {{ mode === 'live' ? 'Mapa en vivo' : 'Mapa geográfico' }}
        </h3>
        <p class="text-[11px] text-slate-500 mt-0.5">
          <template v-if="mode === 'live'">
            {{ activeCount > 0 ? `${points.length} ubicaciones activas` : 'Solo usuarios conectados ahora' }}
          </template>
          <template v-else>
            {{ points.length }} ubicaciones registradas
          </template>
        </p>
      </div>
      <span
        v-if="mode === 'live'"
        class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        :class="activeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"
        />
        {{ activeCount > 0 ? 'Live' : 'Offline' }}
      </span>
    </div>

    <div v-if="mode === 'live' && activeCount === 0" class="flex flex-col items-center justify-center h-72 bg-slate-50 text-center px-6">
      <span class="h-3 w-3 rounded-full bg-slate-300 mb-3" />
      <p class="text-sm font-medium text-slate-600">Nadie conectado ahora</p>
      <p class="text-xs text-slate-400 mt-1 max-w-xs">
        Cuando alguien visite tu sitio con el script instalado, aparecerá aquí en tiempo real.
      </p>
    </div>
    <div v-else ref="mapEl" class="h-72 w-full z-0" />
  </div>
</template>

<style>
.leaflet-container { font-family: inherit; }
</style>
