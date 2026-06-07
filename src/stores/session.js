import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sessionsApi } from '@/api'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref([])
  const currentEvents = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const userId = ref(import.meta.env.VITE_DEFAULT_USER_ID ?? 'U123')

  async function fetchSessions() {
    loading.value = true
    error.value = null
    try {
      const data = await sessionsApi.list(userId.value)
      sessions.value = data.sessions ?? []
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchEvents(sessionId) {
    loading.value = true
    error.value = null
    currentEvents.value = null
    try {
      currentEvents.value = await sessionsApi.getEvents(sessionId)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const fpEvents  = ref(null)
  const fpLoading = ref(false)

  async function fetchFpEvents(sessionId) {
    fpLoading.value = true
    fpEvents.value  = null
    try {
      fpEvents.value = await sessionsApi.getEvents(sessionId)
    } catch (e) {
      error.value = e.message
    } finally {
      fpLoading.value = false
    }
  }

  return { sessions, currentEvents, loading, error, userId, fetchSessions, fetchEvents, fpEvents, fpLoading, fetchFpEvents }
})
