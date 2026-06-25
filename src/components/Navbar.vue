<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, Bell, Search } from '@lucide/vue'

defineEmits<{ toggleSidebar: [] }>()

const route = useRoute()

const pageTitle = computed(() => {
  if (route.name === 'projects') return 'Proyectos'
  if (route.name === 'project-overview') return 'Resumen'
  if (route.name === 'project-live') return 'Tiempo real'
  if (route.name === 'project-analytics') return 'Analítica'
  if (route.name === 'project-geography') return 'Geografía'
  if (route.name === 'project-visitors') return 'Visitantes'
  return 'Dashboard'
})

const breadcrumb = computed(() => {
  if (route.path.startsWith('/projects/') && route.params.id) {
    return 'Proyecto'
  }
  return 'MatuAnalytics'
})
</script>

<template>
  <header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200/60 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8">
    <div class="flex items-center gap-3 shrink-0">
      <button
        class="lg:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition-colors"
        @click="$emit('toggleSidebar')"
      >
        <Menu class="h-5 w-5" />
      </button>
      <div>
        <p class="text-[10px] font-medium text-slate-400">{{ breadcrumb }}</p>
        <h1 class="text-sm font-semibold text-slate-900 tracking-tight leading-tight">{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="hidden sm:flex flex-1 max-w-md mx-auto">
      <div class="relative w-full">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar páginas, visitantes..."
          class="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 transition-colors"
        />
      </div>
    </div>

    <div class="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
      <button class="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
        <Bell class="h-4 w-4" />
      </button>
    </div>
  </header>
</template>
