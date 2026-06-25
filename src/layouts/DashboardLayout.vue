<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-[#f5f6f8]">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
      @click="sidebarOpen = false"
    />

    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="lg:pl-64">
      <Navbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="p-4 sm:p-6 lg:p-8 max-w-7xl">
        <RouterView />
      </main>
    </div>
  </div>
</template>
