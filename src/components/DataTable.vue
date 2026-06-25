<script setup lang="ts">
import StatusPill from '@/components/ui/StatusPill.vue'

type ColumnDef = {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: (val: unknown, row?: Record<string, unknown>) => string
  type?: 'text' | 'avatar' | 'status'
  statusFn?: (row: Record<string, unknown>) => { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }
}

defineProps<{
  title: string
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  emptyMessage?: string
  compact?: boolean
}>()

function avatarInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="card overflow-hidden">
    <div class="border-b border-slate-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100">
            <th
              v-for="col in columns"
              :key="col.key + col.label"
              :class="[
                'px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400',
                col.align === 'right' ? 'text-right' : '',
                compact ? 'py-2' : 'py-3',
              ]"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-xs text-slate-400">
              {{ emptyMessage || 'Sin datos disponibles' }}
            </td>
          </tr>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="hover:bg-slate-50/60 transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key + col.label"
              :class="[
                'px-4 text-slate-700',
                compact ? 'py-2' : 'py-3',
                col.align === 'right' ? 'text-right tabular-nums font-medium' : '',
              ]"
            >
              <template v-if="col.type === 'avatar'">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                    {{ avatarInitials(col.format ? col.format(row[col.key], row) : String(row[col.key] || '?')) }}
                  </div>
                  <span class="text-xs font-medium truncate max-w-[120px]">
                    {{ col.format ? col.format(row[col.key], row) : row[col.key] }}
                  </span>
                </div>
              </template>
              <template v-else-if="col.type === 'status' && col.statusFn">
                <StatusPill
                  :label="col.statusFn(row).label"
                  :variant="col.statusFn(row).variant"
                />
              </template>
              <template v-else>
                {{ col.format ? col.format(row[col.key], row) : row[col.key] }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
