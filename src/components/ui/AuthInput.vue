<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  modelValue: string
  label: string
  type?: string
  placeholder?: string
  icon: Component
  required?: boolean
  autocomplete?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ label }}</label>
    <div class="relative">
      <component :is="icon" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        :value="modelValue"
        :type="type || 'text'"
        :placeholder="placeholder"
        :required="required"
        :autocomplete="autocomplete"
        class="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
