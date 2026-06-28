import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { joinDashboard } from '@/services/socket'
import type { DashboardData, ActiveUsersUpdate } from '@/types'

export type DateRange = 'today' | '7d' | '30d'

function hasCoords(lat?: number, lng?: number): boolean {
  return lat != null && lng != null && !(lat === 0 && lng === 0)
}

function mapVisitorsToLivePoints(visitors: ActiveUsersUpdate['visitors']) {
  return (visitors || [])
    .filter((v) => hasCoords(v.lat, v.lng))
    .map((v) => ({
      lat: v.lat!,
      lng: v.lng!,
      city: v.city || '',
      country: v.country || '',
      pageTitle: v.pageTitle,
      browser: v.browser,
    }))
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const dashboard = ref<DashboardData | null>(null)
  const loading = ref(false)
  const activeUsers = ref(0)
  const dateRange = ref<DateRange>('7d')
  let cleanupSocket: (() => void) | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let currentProjectId: string | null = null

  function applyLiveUpdate(data: ActiveUsersUpdate) {
    activeUsers.value = data.activeUsers
    if (dashboard.value) {
      dashboard.value.stats.activeUsers = data.activeUsers
      if (data.visitors) {
        dashboard.value.activeVisitors = data.visitors
        dashboard.value.liveMapPoints = mapVisitorsToLivePoints(data.visitors)
      } else if (data.activeUsers === 0) {
        dashboard.value.activeVisitors = []
        dashboard.value.liveMapPoints = []
      }
    }
  }

  async function fetchLive(projectId: string) {
    try {
      const { data } = await api.get<ActiveUsersUpdate>(`/dashboard/${projectId}/live`)
      applyLiveUpdate(data)
    } catch {
      // ignore polling errors
    }
  }

  async function fetchDashboard(projectId: string) {
    loading.value = true
    try {
      const { data } = await api.get<DashboardData>(`/dashboard/${projectId}`, {
        params: { range: dateRange.value },
      })
      dashboard.value = data
      activeUsers.value = data.stats.activeUsers
    } finally {
      loading.value = false
    }
  }

  function setDateRange(range: DateRange) {
    dateRange.value = range
    if (currentProjectId) {
      fetchDashboard(currentProjectId)
    }
  }

  function subscribeRealtime(projectId: string) {
    if (currentProjectId === projectId && cleanupSocket) return

    if (cleanupSocket) cleanupSocket()
    if (pollInterval) clearInterval(pollInterval)
    currentProjectId = projectId

    fetchLive(projectId)

    cleanupSocket = joinDashboard(projectId, applyLiveUpdate)

    pollInterval = setInterval(() => {
      if (currentProjectId) fetchLive(currentProjectId)
    }, 8000)
  }

  function unsubscribe() {
    if (cleanupSocket) {
      cleanupSocket()
      cleanupSocket = null
    }
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    currentProjectId = null
  }

  return {
    dashboard,
    loading,
    activeUsers,
    dateRange,
    fetchDashboard,
    setDateRange,
    subscribeRealtime,
    unsubscribe,
  }
})
