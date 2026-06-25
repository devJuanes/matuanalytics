<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  BarChart3,
  FolderKanban,
  X,
  LogOut,
  LayoutDashboard,
  Radio,
  LineChart,
  Globe,
  Users,
  ChevronLeft,
} from '@lucide/vue'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const projectId = computed(() => route.params.id as string | undefined)
const inProject = computed(() => !!projectId.value && route.path.startsWith(`/projects/${projectId.value}`))

const globalNav = [
  { to: '/projects', label: 'Proyectos', icon: FolderKanban, exact: false },
]

const projectNav = computed(() => {
  const id = projectId.value
  if (!id) return []
  return [
    { to: `/projects/${id}`, label: 'Resumen', icon: LayoutDashboard, exact: true },
    { to: `/projects/${id}/live`, label: 'Tiempo real', icon: Radio, exact: false },
    { to: `/projects/${id}/analytics`, label: 'Analítica', icon: LineChart, exact: false },
    { to: `/projects/${id}/geography`, label: 'Geografía', icon: Globe, exact: false },
    { to: `/projects/${id}/visitors`, label: 'Visitantes', icon: Users, exact: false },
  ]
})

function isActive(to: string, exact: boolean) {
  if (exact) return route.path === to
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-slate-200/60 transition-transform duration-200 ease-in-out lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex h-14 items-center justify-between px-5">
      <RouterLink to="/projects" class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
          <BarChart3 class="h-4 w-4 text-white" />
        </div>
        <span class="text-sm font-bold text-slate-900 tracking-tight">MatuAnalytics</span>
      </RouterLink>
      <button class="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="$emit('close')">
        <X class="h-5 w-5" />
      </button>
    </div>

    <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      <template v-if="inProject">
        <RouterLink
          to="/projects"
          class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 mb-1"
          @click="$emit('close')"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          Proyectos
        </RouterLink>
        <p class="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Menú</p>
        <RouterLink
          v-for="item in projectNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium transition-all',
            isActive(item.to, item.exact)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          ]"
          @click="$emit('close')"
        >
          <component :is="item.icon" :class="['h-4 w-4', isActive(item.to, item.exact) ? 'text-white' : 'text-slate-400']" />
          {{ item.label }}
        </RouterLink>
      </template>

      <template v-else>
        <p class="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">General</p>
        <RouterLink
          v-for="item in globalNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium transition-all',
            route.path.startsWith(item.to)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          ]"
          @click="$emit('close')"
        >
          <component :is="item.icon" :class="['h-4 w-4', route.path.startsWith(item.to) ? 'text-white' : 'text-slate-400']" />
          {{ item.label }}
        </RouterLink>
      </template>
    </nav>

    <div class="border-t border-slate-100 p-3">
      <div class="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold">
          {{ (auth.user?.name || auth.user?.email || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-900 truncate">{{ auth.user?.name }}</p>
          <p class="text-[10px] text-slate-400 truncate">{{ auth.user?.email }}</p>
        </div>
        <button
          class="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500 transition-colors"
          title="Cerrar sesión"
          @click="auth.logout(); router.push('/login')"
        >
          <LogOut class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </aside>
</template>
