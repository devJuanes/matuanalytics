import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/projects' },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
        },
        {
          path: 'projects/:id',
          component: () => import('@/layouts/ProjectLayout.vue'),
          children: [
            { path: '', name: 'project-overview', component: () => import('@/views/project/OverviewView.vue') },
            { path: 'live', name: 'project-live', component: () => import('@/views/project/LiveView.vue') },
            { path: 'analytics', name: 'project-analytics', component: () => import('@/views/project/AnalyticsView.vue') },
            { path: 'geography', name: 'project-geography', component: () => import('@/views/project/GeographyView.vue') },
            { path: 'visitors', name: 'project-visitors', component: () => import('@/views/project/VisitorsView.vue') },
          ],
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'projects' }
  }
})

export default router
