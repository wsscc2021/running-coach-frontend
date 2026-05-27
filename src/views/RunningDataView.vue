<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import StatCard from '@/components/StatCard.vue'
import SensorChart from '@/components/SensorChart.vue'
import HeartRateZones from '@/components/HeartRateZones.vue'

const props = defineProps({ sessionId: { type: String, required: true } })

const store  = useSessionStore()
const router = useRouter()

const activeTab = ref('heartRate')

const tabs = [
  { key: 'heartRate',       label: '심박수' },
  { key: 'cadence',         label: '호흡'   },
  { key: 'speed',           label: '페이스' },
  { key: 'distance',        label: '거리'   }
]

const chartMeta = {
  heartRate:       { title: '심박수 변화',   subtitle: '실시간 심박수 모니터링' },
  cadence:         { title: '케이던스 변화', subtitle: '분당 걸음 수 (spm)' },
  speed:           { title: '페이스 변화',   subtitle: '분당 페이스 (min/km)' },
  distance:        { title: '누적 거리',     subtitle: '시간에 따른 누적 이동 거리' },
  oxygenSaturation:{ title: '산소포화도',    subtitle: '혈중 산소포화도 (%)' }
}

onMounted(() => store.fetchEvents(props.sessionId))

// ─── 통계 계산 ──────────────────────────────────────────────────
const events = computed(() => store.currentEvents)

const avgHeartRate = computed(() => {
  const data = events.value?.heartRate ?? []
  if (!data.length) return '--'
  const avg = data.reduce((s, e) => s + e.bpm, 0) / data.length
  return `${Math.round(avg)} bpm`
})

const avgPace = computed(() => {
  const data = events.value?.speed ?? []
  if (!data.length) return '--:--'
  const avgMs = data.reduce((s, e) => s + e.metersPerSecond, 0) / data.length
  if (avgMs <= 0) return '--:--'
  const paceMin = 1000 / avgMs / 60
  const m = Math.floor(paceMin)
  const s = Math.round((paceMin - m) * 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
})

const avgCadence = computed(() => {
  const data = events.value?.cadence ?? []
  if (!data.length) return '--'
  const avg = data.reduce((s, e) => s + e.stepsPerMinute, 0) / data.length
  return `${Math.round(avg)} /분`
})

const totalDistance = computed(() => {
  const data = events.value?.speed ?? []
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
  if (activeTab.value === 'distance') return events.value.speed ?? []
  return events.value[activeTab.value] ?? []
})
</script>

<template>
  <div>
    <!-- 뒤로가기 -->
    <button class="back-btn" @click="router.push('/dashboard')">
      ‹ 세션 목록
    </button>

    <!-- 로딩 / 에러 -->
    <div v-if="store.loading" class="state-msg">데이터를 불러오는 중...</div>
    <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>

    <template v-else-if="events">
      <!-- ── 통계 카드 ── -->
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

      <!-- ── 차트 탭 ── -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ── 차트 ── -->
      <SensorChart
        :events="currentEvents"
        :type="activeTab"
        :title="chartMeta[activeTab].title"
        :subtitle="chartMeta[activeTab].subtitle"
      />

      <!-- 심박수 구간 범례 (심박수 탭에서만 표시) -->
      <HeartRateZones v-if="activeTab === 'heartRate'" />
    </template>
  </div>
</template>

<style scoped>
.back-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 20px;
  padding: 0;
}

.back-btn:hover { text-decoration: underline; }

/* ── Stats ─────────────────────────────────── */
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

/* ── Tab bar ────────────────────────────────── */
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
  padding: 9px 0;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  transition: background 0.15s, color 0.15s;
}

.tab-btn.active {
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 600;
}

.tab-btn:hover:not(.active) { background: #f8fafc; }

/* ── States ─────────────────────────────────── */
.state-msg {
  text-align: center;
  padding: 80px 0;
  color: #94a3b8;
  font-size: 14px;
}

.state-msg.error { color: #ef4444; }

/* ── Responsive ─────────────────────────────── */
@media (max-width: 640px) {
  .stats { flex-wrap: wrap; }
  .stats > * { flex: calc(50% - 8px); }
}
</style>
