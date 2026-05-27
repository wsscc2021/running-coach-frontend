<script setup>
import { useRouter } from 'vue-router'

defineProps({
  sessions: { type: Array, default: () => [] }
})

const router = useRouter()

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
</script>

<template>
  <div class="list">
    <div
      v-for="session in sessions"
      :key="session.sessionId"
      class="item"
      @click="router.push(`/session/${session.sessionId}`)"
    >
      <div class="item-icon">🏃</div>
      <div class="item-info">
        <p class="item-date">{{ formatDate(session.startTime) }}</p>
        <p class="item-meta">
          {{ formatDuration(session.startTime, session.endTime) }}
          <span class="dot">·</span>
          {{ session.deviceId }}
        </p>
      </div>
      <span class="item-arrow">›</span>
    </div>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.1s;
}

.item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.item-icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  background: #eff6ff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-date {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.item-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 3px;
}

.dot {
  margin: 0 4px;
}

.item-arrow {
  font-size: 20px;
  color: #cbd5e1;
  font-weight: 300;
}
</style>
