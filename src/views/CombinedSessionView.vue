<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import StatCard from '@/components/StatCard.vue'
import SensorChart from '@/components/SensorChart.vue'
import HeartRateZones from '@/components/HeartRateZones.vue'
import FootPressureMap from '@/components/FootPressureMap.vue'
import RiskAnalysis   from '@/components/RiskAnalysis.vue'

const route  = useRoute()
const router = useRouter()
const store  = useSessionStore()

const runningId = computed(() => route.query.running)
const fpId      = computed(() => route.query.fp)

const activeTab = ref('running')

watch(runningId, id => { if (id) store.fetchEvents(id) },   { immediate: true })
watch(fpId,      id => { if (id) store.fetchFpEvents(id) }, { immediate: true })

const runningSess = computed(() => store.sessions.find(s => s.sessionId === runningId.value))
const fpSess      = computed(() => store.sessions.find(s => s.sessionId === fpId.value))

// ── 러닝 데이터 ─────────────────────────────────────────────────
const events = computed(() => store.currentEvents)

const PAUSE_GAP_MS = 65_000
const pauseIntervals = computed(() => {
  const data = events.value?.speed ?? []
  const intervals = []
  for (let i = 1; i < data.length; i++) {
    const s = new Date(data[i - 1].measuredAt).getTime()
    const e = new Date(data[i].measuredAt).getTime()
    if (e - s > PAUSE_GAP_MS) intervals.push({ start: s, end: e })
  }
  return intervals
})
const isActive = iso => {
  const t = new Date(iso).getTime()
  return !pauseIntervals.value.some(({ start, end }) => t > start && t < end)
}

const activeHeartRate = computed(() => (events.value?.heartRate ?? []).filter(e => isActive(e.measuredAt)))
const activeSpeed     = computed(() => (events.value?.speed     ?? []).filter(e => isActive(e.measuredAt)))
const activeCadence   = computed(() => (events.value?.cadence   ?? []).filter(e => isActive(e.measuredAt)))

const avgHeartRate = computed(() => {
  const d = activeHeartRate.value
  if (!d.length) return '--'
  return `${Math.round(d.reduce((s, e) => s + e.bpm, 0) / d.length)} bpm`
})
const avgPace = computed(() => {
  const d = activeSpeed.value
  if (!d.length) return '--:--'
  const ms = d.reduce((s, e) => s + e.metersPerSecond, 0) / d.length
  if (ms <= 0) return '--:--'
  const pm = 1000 / ms / 60
  return `${Math.floor(pm)}:${String(Math.round((pm % 1) * 60)).padStart(2, '0')} /km`
})
const avgCadence = computed(() => {
  const d = activeCadence.value
  if (!d.length) return '--'
  return `${(d.reduce((s, e) => s + e.stepsPerMinute, 0) / d.length).toFixed(1)} spm`
})
const totalDistance = computed(() => {
  const d = activeSpeed.value
  if (d.length < 2) return '--'
  let km = 0
  for (let i = 1; i < d.length; i++) {
    const dt = (new Date(d[i].measuredAt) - new Date(d[i - 1].measuredAt)) / 1000
    km += d[i].metersPerSecond * dt / 1000
  }
  return `${km.toFixed(2)} km`
})

const runningTabs = computed(() => [
  { key: 'heartRate', label: '심박수', count: events.value?.heartRate?.length ?? 0 },
  { key: 'speed',     label: '페이스', count: events.value?.speed?.length      ?? 0 },
  { key: 'distance',  label: '거리',   count: events.value?.speed?.length      ?? 0 },
])
const activeRunningTab = ref('heartRate')

const chartMeta = {
  heartRate: { title: '심박수 변화',  subtitle: '실시간 심박수 모니터링' },
  speed:     { title: '페이스 변화',  subtitle: '분당 페이스 (min/km)' },
  distance:  { title: '누적 거리',    subtitle: '시간에 따른 누적 이동 거리' },
}

const currentRunningEvents = computed(() => {
  if (!events.value) return []
  if (activeRunningTab.value === 'distance')  return activeSpeed.value
  if (activeRunningTab.value === 'heartRate') return activeHeartRate.value
  if (activeRunningTab.value === 'speed')     return activeSpeed.value
  return []
})

// ── 헬퍼 ────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function formatDuration(s, e) {
  if (!s || !e) return ''
  const m = Math.round((new Date(e) - new Date(s)) / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}
</script>

<template>
  <div>
    <!-- 헤더 -->
    <div class="view-head">
      <button class="back-btn" @click="router.push('/dashboard')">‹ 세션 목록</button>
      <div class="session-badges">
        <span v-if="runningSess" class="badge running">
          🏃 {{ formatDate(runningSess.startTime) }}
          <span class="dur">{{ formatDuration(runningSess.startTime, runningSess.endTime) }}</span>
        </span>
        <span v-if="fpSess" class="badge fp">
          👣 {{ formatDate(fpSess.startTime) }}
        </span>
      </div>
    </div>

    <!-- 주 탭 -->
    <div class="main-tab-bar">
      <button class="main-tab running" :class="{ active: activeTab === 'running' }"
        @click="activeTab = 'running'">
        🏃 러닝 데이터
      </button>
      <button class="main-tab fp" :class="{ active: activeTab === 'footPressure' }"
        @click="activeTab = 'footPressure'">
        👣 발 압력
      </button>
      <button class="main-tab risk" :class="{ active: activeTab === 'risk' }"
        @click="activeTab = 'risk'">
        ⚠ 위험 감지
      </button>
    </div>

    <!-- ── 러닝 탭 ── -->
    <template v-if="activeTab === 'running'">
      <div v-if="store.loading" class="state-msg"><div class="spinner"/>데이터를 불러오는 중...</div>
      <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>
      <div v-else-if="!events?.heartRate?.length && !events?.speed?.length" class="state-msg">
        이 세션에 저장된 러닝 데이터가 없습니다.
      </div>
      <template v-else-if="events">
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
        <div class="tab-bar">
          <button v-for="tab in runningTabs" :key="tab.key"
            class="tab-btn" :class="{ active: activeRunningTab === tab.key }"
            @click="activeRunningTab = tab.key">
            {{ tab.label }}
            <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
        <SensorChart
          :events="currentRunningEvents"
          :type="activeRunningTab"
          :title="chartMeta[activeRunningTab]?.title ?? ''"
          :subtitle="chartMeta[activeRunningTab]?.subtitle ?? ''"
        />
        <HeartRateZones v-if="activeRunningTab === 'heartRate'" :heartRateEvents="activeHeartRate" />
      </template>
    </template>

    <!-- ── 발 압력 탭 ── -->
    <template v-else-if="activeTab === 'footPressure'">
      <div v-if="store.fpLoading" class="state-msg"><div class="spinner"/>발 압력 데이터 로딩 중...</div>
      <div v-else-if="!store.fpEvents?.footPressure" class="state-msg">
        발 압력 데이터가 없습니다.
      </div>
      <template v-else>
        <div class="card">
          <div class="card-head">
            <p class="card-title">발 압력 맵</p>
            <p class="card-sub">세션 평균 발 압력 분포 시각화</p>
          </div>
          <FootPressureMap :foot-pressure="store.fpEvents.footPressure" />
        </div>
      </template>
    </template>

    <!-- ── 위험 감지 탭 ── -->
    <template v-else-if="activeTab === 'risk'">
      <div class="card">
        <div class="card-head">
          <p class="card-title">위험 감지 분석</p>
          <p class="card-sub">러닝 데이터 + 발 압력 융합 분석</p>
        </div>
        <RiskAnalysis
          :foot-pressure="store.fpEvents?.footPressure ?? {}"
          :heart-rate-events="activeHeartRate"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.view-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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
.session-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.badge {
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.badge.running { background: #eff6ff; color: #2563eb; }
.badge.fp      { background: #fdf4ff; color: #a855f7; }
.dur { font-weight: 400; color: #93c5fd; }

/* ── 주 탭 ── */
.main-tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.main-tab {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.main-tab:hover { border-color: #cbd5e1; color: #334155; }
.main-tab.running.active { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
.main-tab.fp.active      { border-color: #a855f7; color: #9333ea; background: #faf5ff; }
.main-tab.risk.active    { border-color: #dc2626; color: #dc2626; background: #fef2f2; }

/* ── 러닝 탭 공통 ── */
.stats { display: flex; gap: 16px; margin-bottom: 20px; }
.tab-bar {
  display: flex;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.tab-btn.active { background: #f1f5f9; color: #1e293b; font-weight: 600; }
.tab-btn:hover:not(.active) { background: #f8fafc; }
.tab-count {
  font-size: 11px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 10px;
  padding: 1px 6px;
  font-weight: 600;
}
.tab-btn.active .tab-count { background: #3b82f6; color: #fff; }

/* ── 발 압력 탭 ── */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}
.card-head  { margin-bottom: 24px; }
.card-title { font-size: 16px; font-weight: 700; color: #1e293b; }
.card-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }

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
.spinner {
  width: 28px; height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .stats { flex-wrap: wrap; }
  .stats > * { flex: calc(50% - 8px); }
  .main-tab-bar { flex-direction: column; }
}
</style>
