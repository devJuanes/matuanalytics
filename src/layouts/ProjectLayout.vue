<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { useAnalyticsStore } from '@/stores/analytics'
import { useProjectsStore } from '@/stores/projects'
import ProjectHeader from '@/components/dashboard/ProjectHeader.vue'
import TrackingCodeModal from '@/components/TrackingCodeModal.vue'
import { Loader2 } from '@lucide/vue'

const route = useRoute()
const analytics = useAnalyticsStore()
const projectsStore = useProjectsStore()

const showTracking = ref(false)
const trackingCode = ref('')
const trackingId = ref('')

const projectId = computed(() => route.params.id as string)

provide('projectId', projectId)

onMounted(async () => {
  await analytics.fetchDashboard(projectId.value)
  analytics.subscribeRealtime(projectId.value)

  try {
    const project = await projectsStore.getProject(projectId.value)
    trackingId.value = project.trackingId
    trackingCode.value = project.trackingCode || ''
  } catch {
    // optional
  }
})

watch(
  () => analytics.dateRange,
  () => {
    if (projectId.value) analytics.fetchDashboard(projectId.value)
  },
)

onUnmounted(() => {
  analytics.unsubscribe()
})

function openTracking() {
  showTracking.value = true
}
</script>

<template>
  <div>
    <ProjectHeader
      v-model:date-range="analytics.dateRange"
      :project-name="analytics.dashboard?.project.name || 'Proyecto'"
      :active-users="analytics.activeUsers"
      @tracking="openTracking"
    />

    <div v-if="analytics.loading && !analytics.dashboard" class="flex justify-center py-24">
      <Loader2 class="h-8 w-8 animate-spin text-slate-400" />
    </div>

    <RouterView v-else />
  </div>

  <TrackingCodeModal
    v-if="showTracking && trackingId"
    :tracking-id="trackingId"
    :tracking-code="trackingCode"
    @close="showTracking = false"
  />
</template>
