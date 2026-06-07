<script setup>
defineProps({
  sessions:    { type: Array,  default: () => [] },
  selectedIds: { type: Array,  default: () => [] },
})

const emit = defineEmits(['select'])

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(startIso, endIso) {
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

function sessionIcon(session) {
  return session.sessionType === 'foot_pressure' ? '👣' : '🏃'
}

function sessionLabel(session) {
  return session.sessionType === 'foot_pressure' ? '발 압력' : '런닝'
}
</script>

<template>
  <div class="list">
    <div
      v-for="session in sessions"
      :key="session.sessionId"
      class="item"
      :class="{ selected: selectedIds.includes(session.sessionId) }"
      @click="emit('select', session)"
    >
      <div class="item-icon" :class="session.sessionType === 'foot_pressure' ? 'fp' : 'run'">
        {{ sessionIcon(session) }}
      </div>
      <div class="item-info">
        <p class="item-date">{{ formatDate(session.startTime) }}</p>
        <p class="item-meta">
          <span class="session-type-badge" :class="session.sessionType">{{ sessionLabel(session) }}</span>
          <span class="dot">·</span>
          {{ formatDuration(session.startTime, session.endTime) }}
          <span class="dot">·</span>
          {{ session.deviceId }}
        </p>
      </div>
      <span class="item-check" :class="{ visible: selectedIds.includes(session.sessionId) }">✓</span>
    </div>
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 8px; }

.item {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.1s, border-color 0.15s;
  border: 1.5px solid transparent;
}
.item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
.item.selected { border-color: #3b82f6; background: #f8fbff; }
.item.selected:has(.fp) { border-color: #a855f7; background: #fdf8ff; }

.item-icon {
  font-size: 22px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.item-icon.run { background: #eff6ff; }
.item-icon.fp  { background: #fdf4ff; }

.item-info { flex: 1; min-width: 0; }
.item-date { font-size: 14px; font-weight: 600; color: #1e293b; }
.item-meta { font-size: 12px; color: #94a3b8; margin-top: 3px; display: flex; align-items: center; gap: 0; flex-wrap: wrap; }
.dot { margin: 0 4px; }

.session-type-badge {
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  padding: 1px 6px;
}
.session-type-badge.running     { background: #eff6ff; color: #3b82f6; }
.session-type-badge.foot_pressure { background: #fdf4ff; color: #a855f7; }

.item-check {
  font-size: 18px;
  color: #3b82f6;
  font-weight: 700;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.item-check.visible { opacity: 1; }
</style>
