const BASE = import.meta.env.VITE_API_BASE_URL ?? '/v1'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function jsonPut(path, data) {
  return apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const sessionsApi = {
  list: (userId) =>
    apiFetch(`/sessions?userId=${encodeURIComponent(userId)}`),
  getEvents: (sessionId) =>
    apiFetch(`/sessions/${encodeURIComponent(sessionId)}/events`)
}

export const analysisApi = {
  getCombined: (runningSessionId, fpSessionId) => {
    const params = new URLSearchParams()
    if (runningSessionId) params.set('runningSessionId', runningSessionId)
    if (fpSessionId) params.set('fpSessionId', fpSessionId)
    return apiFetch(`/analysis?${params}`)
  },
  getFeedback: (runningSessionId, fpSessionId) => {
    const params = new URLSearchParams()
    if (runningSessionId) params.set('runningSessionId', runningSessionId)
    if (fpSessionId) params.set('fpSessionId', fpSessionId)
    return apiFetch(`/analysis/feedback?${params}`)
  },
}

export const collectionApi = {
  getState: () => apiFetch('/collection'),
  setState: (collecting) => jsonPut('/collection', { collecting }),
}
