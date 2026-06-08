<script setup>
import { computed } from 'vue'

const props = defineProps({
  heartRateEvents: { type: Array, default: () => [] }
})

const ZONES = [
  { label: '휴식',   min: 0,   max: 100, color: '#2563eb', bg: '#eff6ff', track: '#bfdbfe' },
  { label: '워밍업', min: 100, max: 120, color: '#16a34a', bg: '#f0fdf4', track: '#bbf7d0' },
  { label: '유산소', min: 120, max: 160, color: '#d97706', bg: '#fffbeb', track: '#fde68a' },
  { label: '고강도', min: 160, max: 180, color: '#ea580c', bg: '#fff7ed', track: '#fed7aa' },
  { label: '최대',   min: 180, max: Infinity, color: '#dc2626', bg: '#fff1f2', track: '#fecada' },
]

function zoneIndex(bpm) {
  return ZONES.findIndex(z => bpm >= z.min && bpm < z.max)
}

// 구간별 누적 시간(초) 계산: 인접 이벤트 평균 bpm으로 구간 판정
const zoneStats = computed(() => {
  const evs = props.heartRateEvents
  const secs = new Array(ZONES.length).fill(0)

  for (let i = 1; i < evs.length; i++) {
    const dt  = (new Date(evs[i].measuredAt) - new Date(evs[i - 1].measuredAt)) / 1000
    const avg = (evs[i].bpm + evs[i - 1].bpm) / 2
    const z   = zoneIndex(avg)
    if (z >= 0 && dt > 0 && dt < 300) secs[z] += dt  // 5분 초과 간격은 일시정지로 제외
  }

  const total = secs.reduce((s, v) => s + v, 0)
  return ZONES.map((zone, i) => ({
    ...zone,
    seconds: Math.round(secs[i]),
    pct:     total > 0 ? Math.round(secs[i] / total * 100) : 0,
  }))
})

const totalSeconds = computed(() => zoneStats.value.reduce((s, z) => s + z.seconds, 0))

const dominantIdx = computed(() =>
  zoneStats.value.reduce((mi, z, i) => z.pct > zoneStats.value[mi].pct ? i : mi, 0)
)

const avgBpm = computed(() => {
  const evs = props.heartRateEvents
  if (!evs.length) return null
  return Math.round(evs.reduce((s, e) => s + e.bpm, 0) / evs.length)
})

const avgZoneIdx = computed(() => avgBpm.value != null ? zoneIndex(avgBpm.value) : -1)

const intensityLabel = computed(() => {
  const s = zoneStats.value
  const high = (s[3]?.pct ?? 0) + (s[4]?.pct ?? 0)
  const aero = s[2]?.pct ?? 0
  const warm = s[1]?.pct ?? 0
  if (high >= 40)   return { text: '고강도 훈련',   color: '#ea580c' }
  if (aero >= 55)   return { text: '유산소 기초',   color: '#d97706' }
  return               { text: '가벼운 워밍업', color: '#16a34a' }
})

function fmtTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}초`
  return s === 0 ? `${m}분` : `${m}분 ${s}초`
}
</script>

<template>
  <div class="hr-analysis">

    <!-- 데이터 없음 -->
    <div v-if="!heartRateEvents.length" class="no-data">심박수 데이터가 없습니다.</div>

    <template v-else>
      <!-- 헤더 요약 -->
      <div class="summary-row">
        <div class="summary-item">
          <span class="sum-label">평균 심박수</span>
          <span class="sum-value" :style="{ color: avgZoneIdx >= 0 ? ZONES[avgZoneIdx].color : '#1e293b' }">
            {{ avgBpm }} <small>bpm</small>
          </span>
          <span class="sum-badge"
            v-if="avgZoneIdx >= 0"
            :style="{ background: ZONES[avgZoneIdx].bg, color: ZONES[avgZoneIdx].color }">
            {{ ZONES[avgZoneIdx].label }} 구간
          </span>
        </div>
        <div class="summary-item">
          <span class="sum-label">훈련 유형</span>
          <span class="sum-value" :style="{ color: intensityLabel.color }">
            {{ intensityLabel.text }}
          </span>
          <span class="sum-badge" :style="{ background: '#f1f5f9', color: '#64748b' }">
            총 {{ fmtTime(totalSeconds) }}
          </span>
        </div>
      </div>

      <!-- 구간별 분포 바 -->
      <div class="zone-list">
        <div
          v-for="(zone, i) in zoneStats"
          :key="zone.label"
          class="zone-row"
          :class="{ dominant: i === dominantIdx }"
          :style="{ background: i === dominantIdx ? zone.bg : 'transparent' }"
        >
          <span class="zone-label" :style="{ color: zone.color }">{{ zone.label }}</span>
          <span class="zone-range">{{ zone.min }}–{{ zone.max === Infinity ? '∞' : zone.max }}</span>

          <div class="bar-track">
            <div class="bar-fill"
              :style="{ width: zone.pct + '%', background: zone.color }"/>
          </div>

          <span class="zone-pct" :style="{ color: zone.color }">{{ zone.pct }}%</span>
          <span class="zone-time">{{ fmtTime(zone.seconds) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hr-analysis {
  margin-top: 16px;
}

.no-data {
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  padding: 24px 0;
}

/* 요약 */
.summary-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.sum-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.sum-value small {
  font-size: 13px;
  font-weight: 500;
}

.sum-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  width: fit-content;
}

/* 구간 바 */
.zone-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.zone-row {
  display: grid;
  grid-template-columns: 52px 72px 1fr 40px 64px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.15s;
}

.zone-row.dominant {
  border-radius: 10px;
}

.zone-label {
  font-size: 12px;
  font-weight: 700;
}

.zone-range {
  font-size: 11px;
  color: #94a3b8;
}

.bar-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 2px;
}

.zone-pct {
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.zone-time {
  font-size: 11px;
  color: #64748b;
  text-align: right;
}

@media (max-width: 640px) {
  .summary-row { flex-direction: column; }
  .zone-row { grid-template-columns: 48px 64px 1fr 36px 56px; gap: 6px; }
}
</style>
