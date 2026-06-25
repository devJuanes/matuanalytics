<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  points: { lat: number; lng: number; city: string; country: string; pageTitle?: string; browser?: string }[]
}>()

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

  for (const p of props.points) {
    if (!p.lat || !p.lng) continue
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 7,
      fillColor: '#111827',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    })
    marker.bindPopup(
      `<strong>${p.city || p.country}</strong><br/>${p.pageTitle || ''}<br/><small>${p.browser || ''}</small>`,
    )
    markers.addLayer(marker)
  }

  if (props.points.length === 1) {
    map.setView([props.points[0].lat, props.points[0].lng], 5)
  }
}

onMounted(() => {
  setTimeout(initMap, 100)
})

watch(() => props.points, updateMarkers, { deep: true })

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="card overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Mapa en vivo</h3>
        <p class="text-[11px] text-slate-500 mt-0.5">{{ points.length }} ubicaciones</p>
      </div>
      <span class="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    </div>
    <div ref="mapEl" class="h-72 w-full z-0" />
  </div>
</template>

<style>
.leaflet-container { font-family: inherit; }
</style>
