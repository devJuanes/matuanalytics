<script setup lang="ts">
import { markRaw } from 'vue'
import { BarChart3, Activity, Shield, Zap } from '@lucide/vue'

const features = [
  { icon: markRaw(Activity), title: 'Tiempo real', desc: 'Usuarios activos al instante vía WebSocket' },
  { icon: markRaw(BarChart3), title: 'Métricas claras', desc: 'Visitas, páginas y dispositivos en un panel' },
  { icon: markRaw(Zap), title: 'Instalación rápida', desc: 'Un script y listo para rastrear' },
  { icon: markRaw(Shield), title: 'Datos seguros', desc: 'Cada proyecto con su propio tracking ID' },
]
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Panel izquierdo -->
    <div class="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
      <div class="absolute inset-0 opacity-20">
        <div class="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
        <div class="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-300/40 blur-3xl" />
      </div>

      <div class="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <BarChart3 class="h-6 w-6 text-white" />
          </div>
          <span class="text-2xl font-bold text-white tracking-tight">MatuAnalytics</span>
        </div>

        <div class="max-w-lg">
          <h1 class="text-4xl font-bold text-white leading-tight tracking-tight">
            Analítica web profesional en tiempo real
          </h1>
          <p class="mt-4 text-lg text-primary-100 leading-relaxed">
            Monitorea visitantes, páginas vistas y eventos en vivo. Diseñado para equipos que necesitan datos al instante.
          </p>

          <ul class="mt-10 space-y-5">
            <li v-for="feature in features" :key="feature.title" class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <component :is="feature.icon" class="h-5 w-5 text-white" />
              </div>
              <div>
                <p class="font-semibold text-white">{{ feature.title }}</p>
                <p class="text-sm text-primary-100/90 mt-0.5">{{ feature.desc }}</p>
              </div>
            </li>
          </ul>
        </div>

        <p class="text-sm text-primary-200/70">
          MatuAnalytics &copy; {{ new Date().getFullYear() }}
        </p>
      </div>
    </div>

    <!-- Panel derecho -->
    <div class="flex flex-1 items-center justify-center p-6 sm:p-10 bg-slate-50">
      <div class="w-full max-w-md">
        <div class="lg:hidden flex items-center gap-2.5 mb-10">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <BarChart3 class="h-5 w-5 text-white" />
          </div>
          <span class="text-xl font-bold text-slate-900">MatuAnalytics</span>
        </div>

        <div class="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
