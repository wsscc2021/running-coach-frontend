<script setup>
const zones = [
  { label: '휴식',   range: '60-100',  bg: '#eff6ff', color: '#2563eb' },
  { label: '워밍업', range: '100-120', bg: '#f0fdf4', color: '#16a34a' },
  { label: '유산소', range: '120-160', bg: '#fffbeb', color: '#d97706' },
  { label: '고강도', range: '160-180', bg: '#fff7ed', color: '#ea580c' },
  { label: '최대',   range: '180+',    bg: '#fff1f2', color: '#dc2626' }
]
</script>

<template>
  <div class="zones">
    <div
      v-for="zone in zones"
      :key="zone.label"
      class="zone"
      :style="{ background: zone.bg }"
    >
      <span class="zone-label" :style="{ color: '#64748b' }">{{ zone.label }}</span>
      <span class="zone-range" :style="{ color: zone.color }">{{ zone.range }}</span>
    </div>
  </div>
</template>

<style scoped>
.zones {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.zone {
  flex: 1;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.zone-label {
  font-size: 12px;
  font-weight: 500;
}

.zone-range {
  font-size: 14px;
  font-weight: 700;
}
</style>
