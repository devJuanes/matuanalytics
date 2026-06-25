import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { joinDashboard } from '@/services/socket'
import type { DashboardData, ActiveUsersUpdate } from '@/types'

export type DateRange = 'today' | '7d' | '30d'

export const useAnalyticsStore = defineStore('analytics', () => {
  const dashboard = ref<DashboardData | null>(null)
  const loading = ref(false)
  const activeUsers = ref(0)
  const dateRange = ref<DateRange>('7d')
  let cleanupSocket: (() => void) | null = null
  let currentProjectId: string | null = null

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
    currentProjectId = projectId

    cleanupSocket = joinDashboard(projectId, (data: ActiveUsersUpdate) => {
      activeUsers.value = data.activeUsers
      if (dashboard.value) {
        dashboard.value.stats.activeUsers = data.activeUsers
        if (data.visitors) {
          dashboard.value.activeVisitors = data.visitors
          dashboard.value.liveMapPoints = data.visitors
            .filter((v) => v.lat && v.lng)
            .map((v) => ({
              lat: v.lat!,
              lng: v.lng!,
              city: v.city || '',
              country: v.country || '',
              pageTitle: v.pageTitle,
              browser: v.browser,
            }))
        }
      }
    })
  }

  function unsubscribe() {
    if (cleanupSocket) {
      cleanupSocket()
      cleanupSocket = null
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
