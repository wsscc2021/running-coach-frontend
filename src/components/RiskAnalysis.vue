<script setup>
import { computed } from 'vue'

const props = defineProps({
  footPressure:    { type: Object, default: () => ({}) }, // { left:[6], right:[6] } 0-4095
  heartRateEvents: { type: Array,  default: () => [] },   // [{ measuredAt, bpm }]
})

const toPct = v => (v / 4095) * 100

// ── 발 압력 지표 ─────────────────────────────────────────────────
const fpMetrics = computed(() => {
  const l = props.footPressure.left
  const r = props.footPressure.right
  if (!l?.length || !r?.length) return null

  const lPcts = l.map(toPct)
  const rPcts = r.map(toPct)

  // 좌우 불균형 %
  const lAvg = lPcts.reduce((s, v) => s + v, 0) / 6
  const rAvg = rPcts.reduce((s, v) => s + v, 0) / 6
  const tot  = lAvg + rAvg
  const lrImbalance = tot > 0 ? Math.abs(lAvg - rAvg) / tot * 100 : 0

  // 뒤꿈치 압력 비율 (pin5·pin6 = index 4·5)
  const heelAvg = [lPcts[4], lPcts[5], rPcts[4], rPcts[5]].reduce((s, v) => s + v, 0) / 4
  const allAvg  = [...lPcts, ...rPcts].reduce((s, v) => s + v, 0) / 12

  // 압력 표준편차 — CoP 이동 불안정 프록시
  const all = [...lPcts, ...rPcts]
  const std = Math.sqrt(all.reduce((s, v) => s + (v - allAvg) ** 2, 0) / all.length)

  return { lrImbalance, heelAvg, allAvg, pressureStd: std }
})

// ── 심박수 지표 ─────────────────────────────────────────────────
const hrMetrics = computed(() => {
  const evs = props.heartRateEvents
  if (evs.length < 2) return null

  const bpms   = evs.map(e => e.bpm)
  const avgBpm = bpms.reduce((s, v) => s + v, 0) / bpms.length

  // 급상승: 인접 이벤트 간 최대 증가량
  let maxSpike = 0
  for (let i = 1; i < bpms.length; i++) {
    maxSpike = Math.max(maxSpike, bpms[i] - bpms[i - 1])
  }

  // 회복 지연: 마지막 10% 구간 평균 BPM
  const tail    = Math.max(1, Math.floor(bpms.length * 0.1))
  const lastAvg = bpms.slice(-tail).reduce((s, v) => s + v, 0) / tail

  return { avgBpm, maxSpike, lastAvg }
})

// ── 위험 항목 정의 ───────────────────────────────────────────────
const RISKS = [
  {
    id:        'imbalance-spike',
    condition: '좌우 하중 불균형 + 심박수 급상승',
    result:    '피로로 인한 자세 불균형 가능성',
    level:     'warning',
    check:  (fp, hr) => fp.lrImbalance > 10 && hr.maxSpike > 20,
    detail: (fp, hr) => [
      { label: '좌우 압력 편차', value: `${fp.lrImbalance.toFixed(1)}%`, warn: fp.lrImbalance > 10 },
      { label: '최대 심박 급상승', value: `+${hr.maxSpike} bpm`,        warn: hr.maxSpike > 20    },
    ],
  },
  {
    id:        'heel-overload',
    condition: '뒤꿈치 압력 과다 + 높은 심박수 유지',
    result:    '충격 부담 증가 및 과부하 가능성',
    level:     'danger',
    check:  (fp, hr) => fp.heelAvg > fp.allAvg * 1.4 && hr.avgBpm > 150,
    detail: (fp, hr) => [
      { label: '뒤꿈치 압력',  value: `${fp.heelAvg.toFixed(1)}%`,      warn: fp.heelAvg > fp.allAvg * 1.4 },
      { label: '평균 심박수',  value: `${Math.round(hr.avgBpm)} bpm`,   warn: hr.avgBpm > 150              },
    ],
  },
  {
    id:        'fatigue-cop',
    condition: 'CoP 이동 불안정 + 심박수 회복 지연',
    result:    '신체 피로 누적 가능성',
    level:     'warning',
    check:  (fp, hr) => fp.pressureStd > 15 && hr.lastAvg > 140,
    detail: (fp, hr) => [
      { label: '압력 편차(σ)',    value: `±${fp.pressureStd.toFixed(1)}%`, warn: fp.pressureStd > 15 },
      { label: '세션 후반 심박', value: `${Math.round(hr.lastAvg)} bpm`,  warn: hr.lastAvg > 140    },
    ],
  },
]

const riskItems = computed(() => {
  const fp = fpMetrics.value
  const hr = hrMetrics.value
  if (!fp || !hr) return null
  return RISKS.map(r => ({
    ...r,
    detected:   r.check(fp, hr),
    detailRows: r.detail(fp, hr),
  }))
})

const detectedCount = computed(() => riskItems.value?.filter(r => r.detected).length ?? 0)
</script>

<template>
  <div class="risk-wrap">

    <div v-if="!riskItems" class="no-data">
      발 압력 및 심박수 데이터가 모두 필요합니다.
    </div>

    <template v-else>
      <!-- 요약 헤더 -->
      <div class="summary-bar">
        <span class="summary-badge" :class="detectedCount > 0 ? 'has-risk' : 'safe'">
          {{ detectedCount > 0 ? `위험 신호 ${detectedCount}건 감지` : '이상 신호 없음' }}
        </span>
      </div>

      <!-- 위험 항목 -->
      <div class="risk-list">
        <div
          v-for="item in riskItems"
          :key="item.id"
          class="risk-item"
          :class="item.detected ? item.level : 'ok'"
        >
          <!-- 아이콘 -->
          <div class="risk-icon">
            <svg v-if="item.detected" width="20" height="20" viewBox="0 0 24 24" fill="none"
              :stroke="item.level === 'danger' ? '#dc2626' : '#d97706'" stroke-width="2.2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#16a34a" stroke-width="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>

          <!-- 본문 -->
          <div class="risk-body">
            <p class="risk-condition">{{ item.condition }}</p>
            <p v-if="item.detected" class="risk-result">→ {{ item.result }}</p>
            <div class="risk-metrics">
              <span
                v-for="row in item.detailRows"
                :key="row.label"
                class="metric-chip"
                :class="{ active: row.warn }"
              >
                {{ row.label }}&nbsp;<strong>{{ row.value }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.risk-wrap { display: flex; flex-direction: column; gap: 12px; }

.no-data { text-align: center; color: #94a3b8; font-size: 13px; padding: 24px 0; }

/* 요약 */
.summary-bar { display: flex; justify-content: flex-end; }

.summary-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
}
.summary-badge.has-risk { background: #fef2f2; color: #dc2626; }
.summary-badge.safe     { background: #f0fdf4; color: #16a34a; }

/* 항목 */
.risk-list { display: flex; flex-direction: column; gap: 8px; }

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid transparent;
}
.risk-item.ok      { background: #f0fdf4; border-color: #bbf7d0; }
.risk-item.warning { background: #fffbeb; border-color: #fde68a; }
.risk-item.danger  { background: #fef2f2; border-color: #fecaca; }

.risk-icon { flex-shrink: 0; margin-top: 1px; }

.risk-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.risk-condition {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.risk-result {
  font-size: 12px;
  font-weight: 600;
  color: #dc2626;
}
.risk-item.warning .risk-result { color: #d97706; }

.risk-metrics { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }

.metric-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
}
.metric-chip.active {
  background: #fee2e2;
  color: #b91c1c;
}
.risk-item.warning .metric-chip.active {
  background: #fef3c7;
  color: #92400e;
}
.metric-chip strong { font-weight: 700; }
</style>
