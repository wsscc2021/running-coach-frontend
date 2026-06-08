import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sessionsApi, analysisApi } from '@/api'

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

  const combinedAnalysis = ref(null)
  const analysisLoading  = ref(false)
  const analysisError    = ref(null)

  async function fetchCombinedAnalysis(runningSessionId, fpSessionId) {
    analysisLoading.value  = true
    analysisError.value    = null
    combinedAnalysis.value = null
    try {
      combinedAnalysis.value = await analysisApi.getCombined(runningSessionId, fpSessionId)
    } catch (e) {
      analysisError.value = e.message
    } finally {
      analysisLoading.value = false
    }
  }

  const analysisFeedback = ref(null)
  const feedbackLoading  = ref(false)
  const feedbackError    = ref(null)

  async function fetchAnalysisFeedback(runningSessionId, fpSessionId) {
    feedbackLoading.value  = true
    feedbackError.value    = null
    analysisFeedback.value = null
    try {
      const res = await analysisApi.getFeedback(runningSessionId, fpSessionId)
      analysisFeedback.value = res.feedback
    } catch (e) {
      feedbackError.value = e.message
    } finally {
      feedbackLoading.value = false
    }
  }

  function resetFeedback() {
    analysisFeedback.value = null
    feedbackError.value    = null
    feedbackLoading.value  = false
  }

  return {
    sessions, currentEvents, loading, error, userId,
    fetchSessions, fetchEvents,
    fpEvents, fpLoading, fetchFpEvents,
    combinedAnalysis, analysisLoading, analysisError, fetchCombinedAnalysis,
    analysisFeedback, feedbackLoading, feedbackError, fetchAnalysisFeedback, resetFeedback,
  }
})
