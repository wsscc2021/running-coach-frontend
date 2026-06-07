<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import StatCard from '@/components/StatCard.vue'
import SensorChart from '@/components/SensorChart.vue'
import HeartRateZones from '@/components/HeartRateZones.vue'
import FootPressureMap from '@/components/FootPressureMap.vue'

const props = defineProps({ sessionId: { type: String, required: true } })

const store  = useSessionStore()
const router = useRouter()

const activeTab = ref('heartRate')

// sessionId가 바뀔 때마다 (최초 마운트 포함) 데이터 재요청
watch(
  () => props.sessionId,
  (id) => { activeTab.value = 'heartRate'; store.fetchEvents(id); store.fpEvents = null },
  { immediate: true }
)

// ─── 탭 정의 ────────────────────────────────────────────────────
const events = computed(() => store.currentEvents)

const tabs = computed(() => [
  { key: 'heartRate',   label: '심박수', count: events.value?.heartRate?.length ?? 0 },
  { key: 'speed',       label: '페이스', count: events.value?.speed?.length      ?? 0 },
  { key: 'distance',    label: '거리',   count: events.value?.speed?.length      ?? 0 },
  { key: 'footPressure', label: '발 압력', count: null },
])

// ─── 발 압력 세션 선택 ────────────────────────────────────────────
const fpSessions = computed(() =>
  store.sessions.filter(s => s.sessionType === 'foot_pressure')
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
)

const selectedFpId = ref(null)

function selectFpSession(session) {
  selectedFpId.value = session.sessionId
  store.fetchFpEvents(session.sessionId)
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const chartMeta = {
  heartRate: { title: '심박수 변화', subtitle: '실시간 심박수 모니터링' },
  speed:     { title: '페이스 변화', subtitle: '분당 페이스 (min/km)' },
  distance:  { title: '누적 거리',   subtitle: '시간에 따른 누적 이동 거리' }
}

// ─── 세션 메타데이터 (sessions 목록에서 조회) ─────────────────────
const sessionMeta = computed(() =>
  store.sessions.find(s => s.sessionId === props.sessionId)
)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return ''
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  return mins >= 60
    ? `${Math.floor(mins / 60)}시간 ${mins % 60}분`
    : `${mins}분`
}

// ─── 일시정지 필터링 ─────────────────────────────────────────────
// speed 이벤트 간 간격이 중앙값의 3배를 초과하면 해당 구간을 일시정지로 판단
const PAUSE_GAP_MS = 65_000  // 1분 5초 초과 공백이면 일시정지 구간

const pauseIntervals = computed(() => {
  const speedData = events.value?.speed ?? []
  if (speedData.length < 2) return []

  const intervals = []
  for (let i = 1; i < speedData.length; i++) {
    const start = new Date(speedData[i - 1].measuredAt).getTime()
    const end   = new Date(speedData[i].measuredAt).getTime()
    if (end - start > PAUSE_GAP_MS) intervals.push({ start, end })
  }
  return intervals
})

function isActive(iso) {
  const t = new Date(iso).getTime()
  return !pauseIntervals.value.some(({ start, end }) => t > start && t < end)
}

const activeHeartRate = computed(() => (events.value?.heartRate ?? []).filter(e => isActive(e.measuredAt)))
const activeSpeed     = computed(() => (events.value?.speed     ?? []).filter(e => isActive(e.measuredAt)))
const activeCadence   = computed(() => (events.value?.cadence   ?? []).filter(e => isActive(e.measuredAt)))

// ─── 통계 계산 ──────────────────────────────────────────────────
const avgHeartRate = computed(() => {
  const data = activeHeartRate.value
  if (!data.length) return '--'
  const avg = data.reduce((s, e) => s + e.bpm, 0) / data.length
  return `${Math.round(avg)} bpm`
})

const avgPace = computed(() => {
  const data = activeSpeed.value
  if (!data.length) return '--:--'
  const avgMs = data.reduce((s, e) => s + e.metersPerSecond, 0) / data.length
  if (avgMs <= 0) return '--:--'
  const paceMin = 1000 / avgMs / 60
  const m = Math.floor(paceMin)
  const s = Math.round((paceMin - m) * 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
})

const avgCadence = computed(() => {
  const data = activeCadence.value
  if (!data.length) return '--'
  const avg = data.reduce((s, e) => s + e.stepsPerMinute, 0) / data.length
  return `${avg.toFixed(1)} spm`
})

const totalDistance = computed(() => {
  const data = activeSpeed.value
  if (data.length < 2) return '--'
  let km = 0
  for (let i = 1; i < data.length; i++) {
    const dt = (new Date(data[i].measuredAt) - new Date(data[i - 1].measuredAt)) / 1000
    km += data[i].metersPerSecond * dt / 1000
  }
  return `${km.toFixed(2)} km`
})

const currentEvents = computed(() => {
  if (!events.value) return []
  if (activeTab.value === 'distance') return activeSpeed.value
  if (activeTab.value === 'heartRate') return activeHeartRate.value
  if (activeTab.value === 'cadence')   return activeCadence.value
  if (activeTab.value === 'speed')     return activeSpeed.value
  return (events.value[activeTab.value] ?? []).filter(e => isActive(e.measuredAt))
})
</script>

<template>
  <div>
    <!-- ── 헤더 ── -->
    <div class="view-head">
      <button class="back-btn" @click="router.push('/dashboard')">‹ 세션 목록</button>
      <div v-if="sessionMeta" class="session-info">
        <span class="session-date">{{ formatDate(sessionMeta.startTime) }}</span>
        <span class="session-dur">{{ formatDuration(sessionMeta.startTime, sessionMeta.endTime) }}</span>
      </div>
    </div>

    <!-- ── 로딩 ── -->
    <div v-if="store.loading" class="state-msg">
      <div class="spinner" />
      데이터를 불러오는 중...
    </div>

    <!-- ── 에러 ── -->
    <div v-else-if="store.error" class="state-msg error">
      {{ store.error }}
      <button class="retry-btn" @click="store.fetchEvents(props.sessionId)">다시 시도</button>
    </div>

    <!-- ── 데이터 없음 ── -->
    <div v-else-if="events && !events.heartRate?.length && !events.speed?.length" class="state-msg">
      이 세션에 저장된 데이터가 없습니다.
    </div>

    <!-- ── 콘텐츠 ── -->
    <template v-else-if="events">
      <!-- 통계 카드 -->
      <div class="stats">
        <StatCard label="총 거리" :value="totalDistance" color="blue">
          <svg width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 12h18M12 3l9 9-9 9"/>
          </svg>
        </StatCard>
        <StatCard label="평균 페이스" :value="avgPace" color="green">
          <svg width="20" height="20" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        </StatCard>
        <StatCard label="평균 심박수" :value="avgHeartRate" color="red">
          <svg width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </StatCard>
        <StatCard label="평균 케이던스" :value="avgCadence" color="purple">
          <svg width="20" height="20" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
        </StatCard>
      </div>

      <!-- 탭 (샘플 수 뱃지 포함) -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 차트 (발 압력 탭 아닐 때) -->
      <template v-if="activeTab !== 'footPressure'">
        <SensorChart
          :events="currentEvents"
          :type="activeTab"
          :title="chartMeta[activeTab]?.title ?? ''"
          :subtitle="chartMeta[activeTab]?.subtitle ?? ''"
        />
        <HeartRateZones v-if="activeTab === 'heartRate'" />
      </template>

      <!-- 발 압력 탭 -->
      <template v-else>
        <div class="fp-section">
          <div class="fp-section-head">
            <p class="fp-section-title">발 압력 세션 선택</p>
            <p class="fp-section-sub">연결할 발 압력 세션을 선택하세요.</p>
          </div>

          <!-- 세션 없음 -->
          <div v-if="!fpSessions.length" class="fp-empty">
            저장된 발 압력 세션이 없습니다.
          </div>

          <!-- 세션 목록 -->
          <div v-else class="fp-list">
            <div
              v-for="s in fpSessions"
              :key="s.sessionId"
              class="fp-item"
              :class="{ selected: selectedFpId === s.sessionId }"
              @click="selectFpSession(s)"
            >
              <span class="fp-item-icon">👣</span>
              <div class="fp-item-info">
                <p class="fp-item-date">{{ formatDate(s.startTime) }}</p>
                <p class="fp-item-id">{{ s.deviceId }}</p>
              </div>
              <span v-if="selectedFpId === s.sessionId" class="fp-check">✓</span>
            </div>
          </div>

          <!-- 발 압력 맵 -->
          <template v-if="selectedFpId">
            <div v-if="store.fpLoading" class="fp-loading">
              <div class="spinner"/> 발 압력 데이터 로딩 중...
            </div>
            <div v-else-if="store.fpEvents" class="fp-map-wrap">
              <div class="fp-map-head">
                <p class="fp-map-title">발 압력 맵</p>
                <p class="fp-map-sub">{{ formatDate(fpSessions.find(s => s.sessionId === selectedFpId)?.startTime) }}</p>
              </div>
              <FootPressureMap :foot-pressure="store.fpEvents.footPressure ?? {}" />
            </div>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* ── 헤더 ── */
.view-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  padding: 0;
  flex-shrink: 0;
}
.back-btn:hover { text-decoration: underline; }

.session-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.session-date {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.session-dur {
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px 8px;
}

/* ── 통계 카드 ── */
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

/* ── 탭 ── */
.tab-bar {
  display: flex;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  gap: 4px;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 9px 4px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tab-btn.active {
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 600;
}

.tab-btn:hover:not(.active) { background: #f8fafc; }

.tab-count {
  font-size: 11px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 10px;
  padding: 1px 6px;
  font-weight: 600;
}

.tab-btn.active .tab-count {
  background: #3b82f6;
  color: #fff;
}

/* ── 상태 ── */
.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: #94a3b8;
  font-size: 14px;
}

.state-msg.error { color: #ef4444; }

.retry-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── 발 압력 탭 ── */
.fp-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.fp-section-head { margin-bottom: 16px; }
.fp-section-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.fp-section-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }

.fp-empty { text-align: center; padding: 32px 0; color: #94a3b8; font-size: 13px; }

.fp-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }

.fp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.fp-item:hover { border-color: #a855f7; background: #faf5ff; }
.fp-item.selected { border-color: #a855f7; background: #faf5ff; }
.fp-item-icon { font-size: 20px; }
.fp-item-info { flex: 1; }
.fp-item-date { font-size: 13px; font-weight: 600; color: #1e293b; }
.fp-item-id { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.fp-check { font-size: 16px; color: #a855f7; font-weight: 700; }

.fp-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  color: #94a3b8;
  font-size: 13px;
}
.fp-map-wrap { border-top: 1px solid #f1f5f9; padding-top: 20px; }
.fp-map-head { margin-bottom: 20px; }
.fp-map-title { font-size: 14px; font-weight: 700; color: #1e293b; }
.fp-map-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }

/* ── 반응형 ── */
@media (max-width: 640px) {
  .stats { flex-wrap: wrap; }
  .stats > * { flex: calc(50% - 8px); }
}
</style>
