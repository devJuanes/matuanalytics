import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Project } from '@/types'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Project[]>('/projects')
      projects.value = data
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      error.value = err.response?.data?.error || 'Error al cargar proyectos'
    } finally {
      loading.value = false
    }
  }

  async function createProject(name: string, url: string) {
    const { data } = await api.post<Project>('/projects', { name, url })
    projects.value.unshift(data)
    return data
  }

  async function getProject(id: string) {
    const { data } = await api.get<Project>(`/projects/${id}`)
    return data
  }

  return { projects, loading, error, fetchProjects, createProject, getProject }
})
