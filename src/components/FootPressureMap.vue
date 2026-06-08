<script setup>
import { computed } from 'vue'

const props = defineProps({
  footPressure: { type: Object, default: () => ({}) }
})

const SENSOR_POS = [
  { x: 30, y: 52  },  // pin1 - 발가락 내측
  { x: 56, y: 44  },  // pin2 - 발가락 중앙
  { x: 82, y: 56  },  // pin3 - 전족부 외측
  { x: 26, y: 128 },  // pin4 - 중족부
  { x: 34, y: 222 },  // pin5 - 뒤꿈치 왼쪽
  { x: 68, y: 230 },  // pin6 - 뒤꿈치 오른쪽
]

const toPct = v => Math.round((v / 4095) * 100)

function pressureColor(pct) {
  if (pct < 20) return '#3b82f6'
  if (pct < 40) return '#22c55e'
  if (pct < 60) return '#eab308'
  if (pct < 80) return '#f97316'
  return '#ef4444'
}

function footData(side) {
  const vals = props.footPressure[side]
  if (!vals || vals.length < 6) return SENSOR_POS.map(() => ({ pct: 0, color: '#e2e8f0' }))
  return vals.map(v => { const pct = toPct(v); return { pct, color: pressureColor(pct) } })
}

function regionStats(side) {
  const vals = props.footPressure[side]
  if (!vals || vals.length < 6) return { toe: '--', fore: '--', mid: '--', heel: '--' }
  const p = vals.map(toPct)
  return {
    toe:  Math.round((p[0] + p[1]) / 2) + '%',
    fore: p[2] + '%',
    mid:  p[3] + '%',
    heel: Math.round((p[4] + p[5]) / 2) + '%',
  }
}

const leftData   = computed(() => footData('left'))
const rightData  = computed(() => footData('right'))
const leftStats  = computed(() => regionStats('left'))
const rightStats = computed(() => regionStats('right'))


const avgPressure = computed(() => {
  const all = [...(props.footPressure.left ?? []), ...(props.footPressure.right ?? [])]
  if (!all.length) return '--'
  return Math.round(all.reduce((s, v) => s + toPct(v), 0) / all.length) + '%'
})

const pressureDev = computed(() => {
  const all = [...(props.footPressure.left ?? []), ...(props.footPressure.right ?? [])]
  if (all.length < 2) return '--'
  const pcts = all.map(toPct)
  const avg  = pcts.reduce((s, v) => s + v, 0) / pcts.length
  const std  = Math.sqrt(pcts.reduce((s, v) => s + (v - avg) ** 2, 0) / pcts.length)
  return '±' + Math.round(std) + '%'
})

const FOOT_PATH = `M 54 22 C 84 18 103 35 98 58 C 92 80 84 85 87 100
  C 89 118 92 138 87 158 C 82 178 76 195 74 215
  C 71 232 67 248 61 260 C 55 270 42 272 34 268
  C 25 264 21 255 24 242 C 26 228 32 214 29 198
  C 26 178 18 160 16 142 C 13 122 13 102 16 82
  C 18 60 13 42 21 30 C 28 18 39 18 54 22 Z`
</script>

<template>
  <div>
    <!-- 발 맵 -->
    <div class="feet-row">
      <div v-for="side in ['left', 'right']" :key="side" class="foot-col">
        <p class="foot-label">{{ side === 'left' ? '왼발' : '오른발' }}</p>

        <svg viewBox="0 0 110 285" class="foot-svg" :class="side">
          <defs>
            <radialGradient v-for="(s, i) in (side === 'left' ? leftData : rightData)"
              :id="`fpmap-grad-${side}-${i}`" :key="i" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   :stop-color="s.color" stop-opacity="0.55"/>
              <stop offset="100%" :stop-color="s.color" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <path class="foot-outline" :d="FOOT_PATH"/>

          <ellipse v-for="(s, i) in (side === 'left' ? leftData : rightData)"
            :key="`blob-${i}`"
            :cx="SENSOR_POS[i].x" :cy="SENSOR_POS[i].y"
            rx="26" ry="26"
            :fill="`url(#fpmap-grad-${side}-${i})`"/>

          <g v-for="(s, i) in (side === 'left' ? leftData : rightData)" :key="`dot-${i}`">
            <circle :cx="SENSOR_POS[i].x" :cy="SENSOR_POS[i].y" r="13"
              :fill="s.color" opacity="0.9"/>
            <text :x="SENSOR_POS[i].x" :y="SENSOR_POS[i].y + 4"
              class="dot-label" text-anchor="middle">{{ s.pct }}</text>
          </g>
        </svg>

        <!-- 지역별 통계 -->
        <div class="region-stats">
          <p class="region-title">센서 판독값</p>
          <div class="region-grid">
            <template v-for="row in [
              { key: 'toe',  label: '발가락 평균', val: side === 'left' ? leftStats.toe  : rightStats.toe  },
              { key: 'fore', label: '전족부',      val: side === 'left' ? leftStats.fore : rightStats.fore },
              { key: 'mid',  label: '중족부',      val: side === 'left' ? leftStats.mid  : rightStats.mid  },
              { key: 'heel', label: '뒤꿈치',      val: side === 'left' ? leftStats.heel : rightStats.heel },
            ]" :key="row.key">
              <span class="region-key">{{ row.label }}</span>
              <span class="region-val">
                <span class="color-dot" :style="{ background: pressureColor(parseInt(row.val)) }"/>
                {{ row.val }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 범례 -->
    <div class="legend">
      <span v-for="l in [
        { label: '낮음 (0-20%)',        color: '#3b82f6' },
        { label: '적정 (20-40%)',        color: '#22c55e' },
        { label: '보통 (40-60%)',        color: '#eab308' },
        { label: '높음 (60-80%)',        color: '#f97316' },
        { label: '매우 높음 (80-100%)', color: '#ef4444' },
      ]" :key="l.label" class="legend-item">
        <span class="legend-dot" :style="{ background: l.color }"/>
        {{ l.label }}
      </span>
    </div>

    <!-- 요약 카드 -->
    <div class="summary-row">
      <div class="summary-card green">
        <p class="sum-label">평균 압력</p>
        <p class="sum-value">{{ avgPressure }}</p>
        <p class="sum-sub">{{ avgPressure !== '--' && parseInt(avgPressure) < 70 ? '정상 범위' : '높은 압력' }}</p>
      </div>
      <div class="summary-card purple">
        <p class="sum-label">좌우 압력 편차(밸런스)</p>
        <p class="sum-value">{{ pressureDev }}</p>
        <p class="sum-sub">{{ pressureDev !== '--' && parseInt(pressureDev.replace('±','')) < 5 ? '안정적' : '불안정' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
.foot-label { font-size: 13px; font-weight: 600; color: #475569; }
.foot-svg { width: 130px; height: auto; }
.foot-svg.right { transform: scaleX(-1); }
.foot-outline {
  fill: #fff;
  stroke: #94a3b8;
  stroke-width: 1.5;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08));
}
.dot-label { font-size: 9px; font-weight: 700; fill: #fff; pointer-events: none; }

.region-stats { width: 130px; }
.region-title { font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
.region-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; }
.region-key { font-size: 11px; color: #64748b; }
.region-val { font-size: 11px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 4px; }
.color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #f1f5f9;
  margin-bottom: 20px;
}
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #64748b; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.summary-row { display: flex; gap: 16px; }
.summary-card { flex: 1; border-radius: 12px; padding: 18px 20px; }
.summary-card.blue   { background: #eff6ff; }
.summary-card.green  { background: #f0fdf4; }
.summary-card.purple { background: #faf5ff; }
.sum-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.sum-value { font-size: 24px; font-weight: 700; }
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
