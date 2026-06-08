<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: { type: Object, default: null },  // backend /v1/analysis response
})

// ── 심박수 구간 색상 ─────────────────────────────────────────────
const ZONE_META = [
  { label: '매우 낮음', color: '#2563eb', bg: '#eff6ff' },
  { label: '낮음',     color: '#16a34a', bg: '#f0fdf4' },
  { label: '보통',     color: '#d97706', bg: '#fffbeb' },
  { label: '높음',     color: '#ea580c', bg: '#fff7ed' },
  { label: '최대',     color: '#dc2626', bg: '#fef2f2' },
]

const hrData = computed(() => props.analysis?.heartRate ?? null)
const fpData = computed(() => props.analysis?.footPressure ?? null)
const risks  = computed(() => props.analysis?.risks ?? [])
const feedback = computed(() => props.analysis?.feedback ?? null)

// 심박수 구간 배열 (zone 1~5 순서)
const zoneRows = computed(() => {
  if (!hrData.value?.available) return []
  return Object.entries(hrData.value.zones ?? {}).map(([key, pct], i) => ({
    key,
    pct,
    ...ZONE_META[i] ?? ZONE_META[4],
  }))
})

// 좌우 균형
const lrBalance = computed(() => fpData.value?.leftRightBalance ?? null)

// 발별 전후 균형
const leftFB  = computed(() => fpData.value?.footAnalysis?.left?.frontBackBalance  ?? null)
const rightFB = computed(() => fpData.value?.footAnalysis?.right?.frontBackBalance ?? null)
const leftCop  = computed(() => fpData.value?.footAnalysis?.left?.cop  ?? null)
const rightCop = computed(() => fpData.value?.footAnalysis?.right?.cop ?? null)

// CoP dot 위치: x는 발 너비 내 %, y는 발 길이 내 % (위=toe)
const copStyle = (cop) => ({
  left:   `${cop.x * 100}%`,
  bottom: `${cop.y * 100}%`,
})

const riskLevelColor = {
  heart_rate:    { border: '#fecaca', bg: '#fef2f2', icon: '#dc2626' },
  foot_pressure: { border: '#fed7aa', bg: '#fff7ed', icon: '#ea580c' },
}
</script>

<template>
  <div class="ca-wrap">

    <!-- 로딩/에러는 부모가 처리, analysis가 null이면 빈 상태 -->
    <div v-if="!analysis" class="no-data">분석 결과가 없습니다.</div>

    <template v-else>

      <!-- ① Claude AI 피드백 ─────────────────────────────────── -->
      <section class="section feedback-section">
        <div class="section-head">
          <span class="section-icon">✦</span>
          <div>
            <p class="section-title">AI 코치 피드백</p>
            <p class="section-sub">Claude가 분석한 오늘의 러닝 종합 평가</p>
          </div>
        </div>
        <div v-if="feedback" class="feedback-body">
          <p v-for="(para, i) in feedback.split('\n\n').filter(p => p.trim())" :key="i"
             class="feedback-para">{{ para.trim() }}</p>
        </div>
        <div v-else class="feedback-unavail">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          AI 피드백을 가져올 수 없습니다.
        </div>
      </section>

      <!-- ② 심박수 분석 ─────────────────────────────────────── -->
      <section v-if="hrData?.available" class="section">
        <div class="section-head">
          <span class="section-icon hr-icon">♥</span>
          <div>
            <p class="section-title">심박수 분석</p>
            <p class="section-sub">세션 심박수 통계 및 구간 분포</p>
          </div>
        </div>

        <!-- 통계 칩 -->
        <div class="stat-chips">
          <div class="stat-chip">
            <span class="chip-label">평균</span>
            <span class="chip-val red">{{ hrData.avg }} <small>bpm</small></span>
          </div>
          <div class="stat-chip">
            <span class="chip-label">최고</span>
            <span class="chip-val red">{{ hrData.max }} <small>bpm</small></span>
          </div>
          <div class="stat-chip">
            <span class="chip-label">최저</span>
            <span class="chip-val">{{ hrData.min }} <small>bpm</small></span>
          </div>
          <div class="stat-chip">
            <span class="chip-label">표준편차</span>
            <span class="chip-val">± {{ hrData.std }}</span>
          </div>
        </div>

        <!-- 구간 분포 바 -->
        <div class="zone-list">
          <div v-for="z in zoneRows" :key="z.key" class="zone-row">
            <span class="zone-label" :style="{ color: z.color }">{{ z.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: z.pct + '%', background: z.color }" />
            </div>
            <span class="zone-pct" :style="{ color: z.color }">{{ z.pct }}%</span>
          </div>
        </div>
      </section>

      <!-- ③ 발 압력 균형 ───────────────────────────────────── -->
      <section v-if="fpData?.available" class="section">
        <div class="section-head">
          <span class="section-icon fp-icon">👣</span>
          <div>
            <p class="section-title">발 압력 균형</p>
            <p class="section-sub">좌우·전후 하중 분포 및 압력 중심(CoP)</p>
          </div>
        </div>

        <!-- 좌우 균형 -->
        <div v-if="lrBalance" class="balance-block">
          <p class="balance-label">좌우 균형</p>
          <div class="lr-bar-wrap">
            <span class="lr-side left">왼발 {{ lrBalance.left }}%</span>
            <div class="lr-track">
              <div class="lr-left"  :style="{ width: lrBalance.left  + '%' }" />
              <div class="lr-right" :style="{ width: lrBalance.right + '%' }" />
            </div>
            <span class="lr-side right">{{ lrBalance.right }}% 오른발</span>
          </div>
          <p class="balance-hint" :class="{ warn: Math.abs(lrBalance.left - 50) > 10 }">
            {{ Math.abs(lrBalance.left - 50) <= 5 ? '균형 양호' :
               Math.abs(lrBalance.left - 50) <= 10 ? '약간 불균형' : '불균형 — 교정 필요' }}
          </p>
        </div>

        <!-- 발별 전후 균형 + CoP -->
        <div class="feet-row">
          <div v-for="side in ['left', 'right']" :key="side" class="foot-block">
            <p class="foot-side-label">{{ side === 'left' ? '왼발' : '오른발' }}</p>

            <!-- 전후 균형 바 -->
            <template v-if="side === 'left' ? leftFB : rightFB">
              <div class="fb-bar-wrap">
                <div class="fb-track">
                  <div class="fb-front"
                    :style="{ width: (side === 'left' ? leftFB : rightFB).front + '%' }" />
                </div>
                <div class="fb-labels">
                  <span>앞발 {{ (side === 'left' ? leftFB : rightFB).front }}%</span>
                  <span>뒤꿈치 {{ (side === 'left' ? leftFB : rightFB).rear }}%</span>
                </div>
              </div>
            </template>

            <!-- CoP 맵 -->
            <div class="cop-wrap">
              <div class="foot-outline">
                <div class="foot-label-toe">앞</div>
                <div class="foot-label-heel">뒤</div>
                <div v-if="side === 'left' ? leftCop : rightCop"
                     class="cop-dot"
                     :style="copStyle(side === 'left' ? leftCop : rightCop)" />
              </div>
              <p class="cop-caption">
                압력 중심 (CoP)
                <span v-if="side === 'left' ? leftCop : rightCop">
                  x={{ (side === 'left' ? leftCop : rightCop).x.toFixed(2) }},
                  y={{ (side === 'left' ? leftCop : rightCop).y.toFixed(2) }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 위험 감지 ──────────────────────────────────────── -->
      <section class="section">
        <div class="section-head">
          <span class="section-icon risk-icon">⚠</span>
          <div>
            <p class="section-title">위험 감지</p>
            <p class="section-sub">심박수 + 발 압력 통합 분석 결과</p>
          </div>
          <span class="risk-badge" :class="risks.length ? 'has' : 'safe'">
            {{ risks.length ? `${risks.length}건 감지` : '이상 없음' }}
          </span>
        </div>

        <div v-if="!risks.length" class="no-risk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          위험 신호가 감지되지 않았습니다.
        </div>

        <div v-else class="risk-list">
          <div v-for="r in risks" :key="r.code" class="risk-card"
               :style="{ borderColor: riskLevelColor[r.type]?.border, background: riskLevelColor[r.type]?.bg }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 :stroke="riskLevelColor[r.type]?.icon" stroke-width="2.2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p class="risk-label">{{ r.label }}</p>
              <p class="risk-desc">{{ r.description }}</p>
            </div>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>

<style scoped>
.ca-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.no-data {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  padding: 60px 0;
}

/* ── 섹션 공통 ── */
.section {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: #64748b;
  line-height: 36px;
  text-align: center;
}
.hr-icon   { background: #fef2f2; color: #dc2626; }
.fp-icon   { background: #faf5ff; color: #9333ea; }
.risk-icon { background: #fffbeb; color: #d97706; }

.section-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.section-sub   { font-size: 12px; color: #94a3b8; margin-top: 2px; }

/* ── AI 피드백 ── */
.feedback-section { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; }
.feedback-section .section-icon { background: #0ea5e9; color: #fff; }

.feedback-body {
  background: rgba(255,255,255,0.7);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  backdrop-filter: blur(4px);
}

.feedback-para {
  font-size: 14px;
  line-height: 1.75;
  color: #1e293b;
}

.feedback-unavail {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 13px;
  padding: 8px 0;
}

/* ── 심박수 ── */
.stat-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.stat-chip {
  flex: 1;
  min-width: 80px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chip-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
.chip-val   { font-size: 20px; font-weight: 700; color: #1e293b; }
.chip-val small { font-size: 12px; font-weight: 500; }
.chip-val.red { color: #dc2626; }

.zone-list { display: flex; flex-direction: column; gap: 8px; }

.zone-row {
  display: grid;
  grid-template-columns: 72px 1fr 44px;
  align-items: center;
  gap: 10px;
}

.zone-label { font-size: 12px; font-weight: 600; }

.bar-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.zone-pct { font-size: 12px; font-weight: 700; text-align: right; }

/* ── 발 압력 ── */
.balance-block { margin-bottom: 24px; }

.balance-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 10px;
}

.lr-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.lr-side {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.lr-side.left  { color: #7c3aed; }
.lr-side.right { color: #0ea5e9; }

.lr-track {
  flex: 1;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
}

.lr-left  { background: #a78bfa; height: 100%; transition: width 0.4s ease; }
.lr-right { background: #38bdf8; height: 100%; flex: 1; transition: width 0.4s ease; }

.balance-hint {
  font-size: 12px;
  color: #16a34a;
  font-weight: 600;
  text-align: center;
}
.balance-hint.warn { color: #d97706; }

.feet-row {
  display: flex;
  gap: 16px;
}

.foot-block {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
}

.foot-side-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 10px;
}

/* 전후 균형 바 */
.fb-bar-wrap { margin-bottom: 12px; }

.fb-track {
  height: 10px;
  background: #e2e8f0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 4px;
}

.fb-front {
  height: 100%;
  background: #f97316;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.fb-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
}

/* CoP 발 모양 */
.cop-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }

.foot-outline {
  position: relative;
  width: 60px;
  height: 100px;
  background: #e2e8f0;
  border-radius: 30px 30px 20px 20px;
  overflow: hidden;
}

.foot-label-toe,
.foot-label-heel {
  position: absolute;
  font-size: 9px;
  color: #94a3b8;
  left: 50%;
  transform: translateX(-50%);
}
.foot-label-toe  { top: 4px; }
.foot-label-heel { bottom: 4px; }

.cop-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #dc2626;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.25);
  transition: left 0.4s ease, bottom 0.4s ease;
}

.cop-caption {
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}

/* ── 위험 감지 ── */
.section-head { position: relative; }

.risk-badge {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
}
.risk-badge.has  { background: #fef2f2; color: #dc2626; }
.risk-badge.safe { background: #f0fdf4; color: #16a34a; }

.no-risk {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
}

.risk-list { display: flex; flex-direction: column; gap: 8px; }

.risk-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid;
}

.risk-label { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
.risk-desc  { font-size: 12px; color: #64748b; }

/* ── 반응형 ── */
@media (max-width: 640px) {
  .section { padding: 16px; }
  .stat-chips { gap: 8px; }
  .stat-chip { min-width: calc(50% - 4px); }
  .feet-row { flex-direction: column; }
  .lr-bar-wrap { flex-direction: column; align-items: stretch; gap: 6px; }
  .lr-side { text-align: center; }
}
</style>
