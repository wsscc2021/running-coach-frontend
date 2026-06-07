<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const props = defineProps({ sessionId: { type: String, default: null } })
const store  = useSessionStore()
const router = useRouter()

watch(() => props.sessionId, id => { if (id) store.fetchEvents(id) }, { immediate: true })

const fp = computed(() => store.currentEvents?.footPressure ?? {})

// 0-4095 → 0-100%
const toPct = v => Math.round((v / 4095) * 100)

function pressureColor(pct) {
  if (pct < 20) return '#3b82f6'
  if (pct < 40) return '#22c55e'
  if (pct < 60) return '#eab308'
  if (pct < 80) return '#f97316'
  return '#ef4444'
}

// 핀 위치 (viewBox "0 0 110 285", 위=발가락 아래=뒤꿈치)
const SENSOR_POS = [
  { x: 38, y: 52  },  // pin1 - 발가락 내측
  { x: 56, y: 44  },  // pin2 - 발가락 중앙
  { x: 73, y: 56  },  // pin3 - 전족부 외측
  { x: 36, y: 128 },  // pin4 - 중족부
  { x: 40, y: 222 },  // pin5 - 뒤꿈치 왼쪽
  { x: 64, y: 230 },  // pin6 - 뒤꿈치 오른쪽
]

function footData(side) {
  const vals = fp.value[side]
  if (!vals || vals.length < 6) return SENSOR_POS.map(() => ({ pct: 0, color: '#e2e8f0' }))
  return vals.map(v => {
    const pct = toPct(v)
    return { pct, color: pressureColor(pct) }
  })
}

// 통계: [발가락평균, 전족부, 중족부, 뒤꿈치]
function regionStats(side) {
  const vals = fp.value[side]
  if (!vals || vals.length < 6) return { toe: '--', fore: '--', mid: '--', heel: '--' }
  const p = vals.map(toPct)
  return {
    toe:  Math.round((p[0] + p[1]) / 2) + '%',
    fore: p[2] + '%',
    mid:  p[3] + '%',
    heel: Math.round((p[4] + p[5]) / 2) + '%',
  }
}

const leftData  = computed(() => footData('left'))
const rightData = computed(() => footData('right'))
const leftStats  = computed(() => regionStats('left'))
const rightStats = computed(() => regionStats('right'))

// 요약 카드
const balance = computed(() => {
  const l = fp.value.left, r = fp.value.right
  if (!l?.length || !r?.length) return '--'
  const lAvg = l.reduce((s, v) => s + toPct(v), 0) / l.length
  const rAvg = r.reduce((s, v) => s + toPct(v), 0) / r.length
  const total = lAvg + rAvg
  if (!total) return '--'
  return Math.round((1 - Math.abs(lAvg - rAvg) / total) * 100) + '%'
})

const avgPressure = computed(() => {
  const all = [...(fp.value.left ?? []), ...(fp.value.right ?? [])]
  if (!all.length) return '--'
  return Math.round(all.reduce((s, v) => s + toPct(v), 0) / all.length) + '%'
})

const pressureDev = computed(() => {
  const all = [...(fp.value.left ?? []), ...(fp.value.right ?? [])]
  if (all.length < 2) return '--'
  const pcts = all.map(toPct)
  const avg  = pcts.reduce((s, v) => s + v, 0) / pcts.length
  const std  = Math.sqrt(pcts.reduce((s, v) => s + (v - avg) ** 2, 0) / pcts.length)
  return '±' + Math.round(std) + '%'
})

const sessionMeta = computed(() => store.sessions.find(s => s.sessionId === props.sessionId))
</script>

<template>
  <!-- 세션 미선택 -->
  <div v-if="!sessionId" class="empty-state">
    <span class="empty-icon">👣</span>
    <p>대시보드에서 <strong>발 압력</strong> 세션을 선택하세요.</p>
    <button class="go-btn" @click="router.push('/dashboard')">대시보드로</button>
  </div>

  <!-- 로딩 -->
  <div v-else-if="store.loading" class="state-msg">
    <div class="spinner" />
    데이터를 불러오는 중...
  </div>

  <!-- 에러 -->
  <div v-else-if="store.error" class="state-msg error">
    {{ store.error }}
    <button class="retry-btn" @click="store.fetchEvents(sessionId)">다시 시도</button>
  </div>

  <!-- 데이터 없음 -->
  <div v-else-if="!fp.left && !fp.right" class="state-msg">
    이 세션에 발 압력 데이터가 없습니다.
  </div>

  <template v-else>
    <!-- 헤더 -->
    <div class="view-head">
      <button class="back-btn" @click="router.push('/dashboard')">‹ 세션 목록</button>
      <div v-if="sessionMeta" class="session-info">
        <span class="session-date">
          {{ new Date(sessionMeta.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <span class="badge">발 압력</span>
      </div>
    </div>

    <!-- 발 압력 맵 카드 -->
    <div class="card map-card">
      <div class="card-head">
        <p class="card-title">발 압력 맵</p>
        <p class="card-sub">세션 평균 발 압력 분포 시각화</p>
      </div>

      <div class="feet-row">
        <!-- 왼발 / 오른발 -->
        <div v-for="side in ['left', 'right']" :key="side" class="foot-col">
          <p class="foot-label">{{ side === 'left' ? '왼발' : '오른발' }}</p>

          <svg viewBox="0 0 110 285" class="foot-svg" :class="side">
            <defs>
              <radialGradient v-for="(s, i) in (side === 'left' ? leftData : rightData)"
                :id="`grad-${side}-${i}`" :key="i"
                cx="50%" cy="50%" r="50%">
                <stop offset="0%" :stop-color="s.color" stop-opacity="0.55"/>
                <stop offset="100%" :stop-color="s.color" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- 발 외곽선 -->
            <path class="foot-outline"
              d="M 55 22 C 78 18 92 35 88 58 C 84 80 78 85 80 100
                 C 82 118 84 138 80 158 C 76 178 72 195 70 215
                 C 68 232 65 248 60 260 C 56 270 46 272 40 268
                 C 33 264 30 255 32 242 C 34 228 38 214 36 198
                 C 34 178 28 160 26 142 C 24 122 24 102 26 82
                 C 28 60 24 42 30 30 C 35 18 44 18 55 22 Z"/>

            <!-- 히트맵 블롭 -->
            <ellipse
              v-for="(s, i) in (side === 'left' ? leftData : rightData)"
              :key="`blob-${i}`"
              :cx="SENSOR_POS[i].x" :cy="SENSOR_POS[i].y"
              rx="26" ry="26"
              :fill="`url(#grad-${side}-${i})`"
            />

            <!-- 센서 원 -->
            <g v-for="(s, i) in (side === 'left' ? leftData : rightData)" :key="`dot-${i}`">
              <circle
                :cx="SENSOR_POS[i].x" :cy="SENSOR_POS[i].y" r="13"
                :fill="s.color" opacity="0.9"/>
              <text
                :x="SENSOR_POS[i].x" :y="SENSOR_POS[i].y + 4"
                class="dot-label" text-anchor="middle">{{ s.pct }}</text>
            </g>
          </svg>

          <!-- 지역별 통계 -->
          <div class="region-stats">
            <p class="region-title">센서 판독값</p>
            <div class="region-grid">
              <span class="region-key">발가락 평균</span>
              <span class="region-val">
                <span class="color-dot" :style="{ background: pressureColor(parseInt(side === 'left' ? leftStats.toe : rightStats.toe)) }"/>
                {{ side === 'left' ? leftStats.toe : rightStats.toe }}
              </span>
              <span class="region-key">전족부</span>
              <span class="region-val">
                <span class="color-dot" :style="{ background: pressureColor(parseInt(side === 'left' ? leftStats.fore : rightStats.fore)) }"/>
                {{ side === 'left' ? leftStats.fore : rightStats.fore }}
              </span>
              <span class="region-key">중족부</span>
              <span class="region-val">
                <span class="color-dot" :style="{ background: pressureColor(parseInt(side === 'left' ? leftStats.mid : rightStats.mid)) }"/>
                {{ side === 'left' ? leftStats.mid : rightStats.mid }}
              </span>
              <span class="region-key">뒤꿈치</span>
              <span class="region-val">
                <span class="color-dot" :style="{ background: pressureColor(parseInt(side === 'left' ? leftStats.heel : rightStats.heel)) }"/>
                {{ side === 'left' ? leftStats.heel : rightStats.heel }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 범례 -->
      <div class="legend">
        <span v-for="l in [
          { label: '낮음 (0-20%)',    color: '#3b82f6' },
          { label: '적정 (20-40%)',   color: '#22c55e' },
          { label: '보통 (40-60%)',   color: '#eab308' },
          { label: '높음 (60-80%)',   color: '#f97316' },
          { label: '매우 높음 (80-100%)', color: '#ef4444' },
        ]" :key="l.label" class="legend-item">
          <span class="legend-dot" :style="{ background: l.color }"/>
          {{ l.label }}
        </span>
      </div>
    </div>

    <!-- 요약 카드 -->
    <div class="summary-row">
      <div class="summary-card blue">
        <p class="sum-label">좌우 균형도</p>
        <p class="sum-value">{{ balance }}</p>
        <p class="sum-sub">{{ balance !== '--' && parseInt(balance) >= 90 ? '매우 우수' : '불균형' }}</p>
      </div>
      <div class="summary-card green">
        <p class="sum-label">평균 압력</p>
        <p class="sum-value">{{ avgPressure }}</p>
        <p class="sum-sub">{{ avgPressure !== '--' && parseInt(avgPressure) < 70 ? '정상 범위' : '높은 압력' }}</p>
      </div>
      <div class="summary-card purple">
        <p class="sum-label">압력 편차</p>
        <p class="sum-value">{{ pressureDev }}</p>
        <p class="sum-sub">{{ pressureDev !== '--' && parseInt(pressureDev.replace('±','')) < 20 ? '안정적' : '불안정' }}</p>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* ── 상태 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 100px 0;
}
.empty-icon { font-size: 52px; }
.empty-state p { font-size: 15px; color: #64748b; }
.go-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 600;
}

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
  width: 28px; height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
}
.back-btn:hover { text-decoration: underline; }
.session-info { display: flex; align-items: center; gap: 10px; }
.session-date { font-size: 14px; font-weight: 600; color: #1e293b; }
.badge {
  background: #fdf4ff;
  color: #a855f7;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 2px 8px;
}

/* ── 카드 ── */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  margin-bottom: 20px;
}
.card-head { margin-bottom: 24px; }
.card-title { font-size: 16px; font-weight: 700; color: #1e293b; }
.card-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }

/* ── 발 맵 ── */
.feet-row {
  display: flex;
  justify-content: center;
  gap: 60px;
  margin-bottom: 24px;
}
.foot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.foot-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}
.foot-svg {
  width: 130px;
  height: auto;
}
.foot-svg.right {
  transform: scaleX(-1);
}
.foot-outline {
  fill: #fff;
  stroke: #94a3b8;
  stroke-width: 1.5;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08));
}
.dot-label {
  font-size: 9px;
  font-weight: 700;
  fill: #fff;
  pointer-events: none;
}

/* ── 지역 통계 ── */
.region-stats { width: 130px; }
.region-title { font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
.region-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}
.region-key { font-size: 11px; color: #64748b; }
.region-val {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 4px;
}
.color-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── 범례 ── */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #64748b; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* ── 요약 카드 ── */
.summary-row {
  display: flex;
  gap: 16px;
}
.summary-card {
  flex: 1;
  border-radius: 12px;
  padding: 18px 20px;
}
.summary-card.blue  { background: #eff6ff; }
.summary-card.green { background: #f0fdf4; }
.summary-card.purple { background: #faf5ff; }
.sum-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.sum-value {
  font-size: 24px;
  font-weight: 700;
}
.summary-card.blue   .sum-value { color: #2563eb; }
.summary-card.green  .sum-value { color: #16a34a; }
.summary-card.purple .sum-value { color: #9333ea; }
.sum-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }

@media (max-width: 640px) {
  .feet-row { gap: 24px; }
  .foot-svg { width: 100px; }
  .region-stats { width: 100px; }
  .summary-row { flex-wrap: wrap; }
  .summary-card { flex: calc(50% - 8px); }
}
</style>
