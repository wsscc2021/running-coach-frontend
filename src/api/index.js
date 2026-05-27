const BASE = import.meta.env.VITE_API_BASE_URL ?? '/v1'

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const sessionsApi = {
  list: (userId) =>
    apiFetch(`/sessions?userId=${encodeURIComponent(userId)}`),
  getEvents: (sessionId) =>
    apiFetch(`/sessions/${encodeURIComponent(sessionId)}/events`)
}
