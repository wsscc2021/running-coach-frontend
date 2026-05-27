<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Filler, Tooltip
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps({
  events:   { type: Array,  default: () => [] },
  type:     { type: String, default: 'heartRate' },
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' }
})

// ─── 센서 타입별 설정 ─────────────────────────────────────────
const CONFIGS = {
  heartRate: {
    borderColor:     '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.22)',
    label: '심박수 (bpm)',
    getValue: (e) => e.bpm,
    yMax: 200, stepSize: 45
  },
  cadence: {
    borderColor:     '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    label: '케이던스 (spm)',
    getValue: (e) => e.stepsPerMinute,
    yMax: 250, stepSize: 50
  },
  speed: {
    borderColor:     '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    label: '페이스 (min/km)',
    // 속도(m/s) → 페이스(min/km): 1000 / v / 60
    getValue: (e) => e.metersPerSecond > 0
      ? parseFloat((1000 / e.metersPerSecond / 60).toFixed(2))
      : null,
    yMax: 20, stepSize: 4
  },
  distance: {
    borderColor:     '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    label: '누적 거리 (km)',
    getValue: null,   // computed below
    yMax: null, stepSize: 1
  },
  oxygenSaturation: {
    borderColor:     '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.22)',
    label: '산소포화도 (%)',
    getValue: (e) => e.percentage,
    yMax: 100, stepSize: 5
  }
}

function buildDistanceValues(events) {
  let cumKm = 0
  return events.map((e, i) => {
    if (i === 0) return 0
    const dt = (new Date(e.measuredAt) - new Date(events[i - 1].measuredAt)) / 1000
    cumKm += (e.metersPerSecond * dt) / 1000
    return parseFloat(cumKm.toFixed(3))
  })
}

function minuteLabel(startMs, currentMs) {
  const mins = Math.round((currentMs - startMs) / 60000)
  return `${mins}분`
}

// ─── Chart.js data / options ──────────────────────────────────
const chartData = computed(() => {
  const cfg = CONFIGS[props.type]
  if (!props.events.length || !cfg) return { labels: [], datasets: [] }

  const startMs = new Date(props.events[0].measuredAt).getTime()
  const labels  = props.events.map(e => minuteLabel(startMs, new Date(e.measuredAt).getTime()))

  const values = props.type === 'distance'
    ? buildDistanceValues(props.events)
    : props.events.map(e => cfg.getValue(e))

  return {
    labels,
    datasets: [{
      label:           cfg.label,
      data:            values,
      borderColor:     cfg.borderColor,
      backgroundColor: cfg.backgroundColor,
      fill:            true,
      tension:         0.4,
      pointRadius:     0,
      pointHoverRadius: 4,
      borderWidth:     2
    }]
  }
})

const chartOptions = computed(() => {
  const cfg = CONFIGS[props.type] ?? {}
  return {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.85)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont:  { size: 13, weight: 'bold' }
      }
    },
    scales: {
      x: {
        grid:  { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
        ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 9 },
        border: { display: false }
      },
      y: {
        min:  0,
        ...(cfg.yMax ? { suggestedMax: cfg.yMax } : {}),
        grid:  { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          ...(cfg.stepSize ? { stepSize: cfg.stepSize } : {})
        },
        border: { display: false }
      }
    }
  }
})
</script>

<template>
  <div class="card">
    <div class="card-head">
      <p class="card-title">{{ title }}</p>
      <p class="card-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="events.length" class="chart-area">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="empty">
      데이터가 없습니다.
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.card-head {
  margin-bottom: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.card-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.chart-area {
  height: 300px;
  position: relative;
}

.empty {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  font-size: 14px;
}
</style>
