<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  label: string
}>()

const variants = {
  success: 'pill-success',
  warning: 'pill-warning',
  danger: 'pill-danger',
  neutral: 'pill-neutral',
  info: 'pill-info',
}
</script>

<template>
  <span :class="['pill', variants[variant || 'neutral']]">{{ label }}</span>
</template>
