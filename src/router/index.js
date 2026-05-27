import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import RunningDataView from '@/views/RunningDataView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    {
      path: '/session/:sessionId',
      name: 'running-data',
      component: RunningDataView,
      props: true
    },
    {
      path: '/foot-pressure',
      name: 'foot-pressure',
      component: () => import('@/views/FootPressureView.vue')
    },
    {
      path: '/progress',
      name: 'progress',
      component: () => import('@/views/ProgressView.vue')
    }
  ]
})

export default router
