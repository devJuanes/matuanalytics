<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import TrackingCodeModal from '@/components/TrackingCodeModal.vue'
import CreateProjectModal from '@/components/CreateProjectModal.vue'
import type { Project } from '@/types'
import {
  Plus,
  Globe,
  Code,
  ExternalLink,
  BarChart3,
  Loader2,
  ArrowUpRight,
} from '@lucide/vue'

const projectsStore = useProjectsStore()
const router = useRouter()

const showCreate = ref(false)
const creating = ref(false)
const selectedProject = ref<Project | null>(null)

onMounted(() => {
  projectsStore.fetchProjects()
})

async function handleCreate(payload: { name: string; url: string }) {
  creating.value = true
  try {
    const project = await projectsStore.createProject(payload.name, payload.url)
    showCreate.value = false
    selectedProject.value = project
  } finally {
    creating.value = false
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function openTrackingCode(project: Project) {
  const full = await projectsStore.getProject(project.id)
  selectedProject.value = full
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 class="text-lg font-bold text-slate-900 tracking-tight">Tus proyectos</h2>
        <p class="mt-0.5 text-xs text-slate-500">Gestiona sitios web y códigos de seguimiento</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all"
        @click="showCreate = true"
      >
        <Plus class="h-3.5 w-3.5" />
        Nuevo proyecto
      </button>
    </div>

    <div v-if="projectsStore.loading" class="flex justify-center py-20">
      <Loader2 class="h-7 w-7 animate-spin text-slate-400" />
    </div>

    <div
      v-else-if="projectsStore.projects.length === 0"
      class="card py-16 text-center border-dashed"
    >
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Globe class="h-6 w-6 text-slate-400" />
      </div>
      <h3 class="mt-4 text-base font-semibold text-slate-900">Sin proyectos aún</h3>
      <p class="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
        Crea tu primer proyecto para obtener un código de seguimiento y empezar a analizar visitantes.
      </p>
      <button
        class="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        @click="showCreate = true"
      >
        <Plus class="h-3.5 w-3.5" />
        Crear primer proyecto
      </button>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="card card-hover p-4 group"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Globe class="h-4 w-4 text-slate-600" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-slate-900 truncate">{{ project.name }}</h3>
              <p v-if="project.url" class="text-[11px] text-slate-400 truncate mt-0.5">{{ project.url }}</p>
            </div>
          </div>
          <ArrowUpRight class="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>

        <div class="mt-3 rounded-xl bg-slate-50 px-3 py-2">
          <p class="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Tracking ID</p>
          <code class="text-[11px] font-mono font-medium text-slate-700">{{ project.trackingId }}</code>
        </div>

        <p class="mt-2 text-[10px] text-slate-400">Creado {{ formatDate(project.createdAt) }}</p>

        <div class="mt-3 flex gap-2 pt-3 border-t border-slate-100">
          <button
            class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
            @click="router.push(`/projects/${project.id}`)"
          >
            <BarChart3 class="h-3 w-3" />
            Dashboard
          </button>
          <button
            class="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            @click="openTrackingCode(project)"
          >
            <Code class="h-3 w-3" />
          </button>
          <a
            v-if="project.url"
            :href="project.url"
            target="_blank"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink class="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>

    <CreateProjectModal
      :open="showCreate"
      :loading="creating"
      @close="showCreate = false"
      @create="handleCreate"
    />

    <TrackingCodeModal
      v-if="selectedProject"
      :tracking-id="selectedProject.trackingId"
      :tracking-code="selectedProject.trackingCode || `<script src=&quot;http://localhost:3001/tracker.js&quot; data-site-id=&quot;${selectedProject.trackingId}&quot;></script>`"
      @close="selectedProject = null"
    />
  </div>
</template>
