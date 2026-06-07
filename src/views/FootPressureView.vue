<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import FootPressureMap from '@/components/FootPressureMap.vue'

const props = defineProps({ sessionId: { type: String, default: null } })
const store  = useSessionStore()
const router = useRouter()

watch(() => props.sessionId, id => { if (id) store.fetchEvents(id) }, { immediate: true })

const sessionMeta = () => store.sessions.find(s => s.sessionId === props.sessionId)
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
    <div class="spinner" /> 데이터를 불러오는 중...
  </div>

  <!-- 에러 -->
  <div v-else-if="store.error" class="state-msg error">
    {{ store.error }}
    <button class="retry-btn" @click="store.fetchEvents(sessionId)">다시 시도</button>
  </div>

  <!-- 데이터 없음 -->
  <div v-else-if="!store.currentEvents?.footPressure" class="state-msg">
    이 세션에 발 압력 데이터가 없습니다.
  </div>

  <template v-else>
    <!-- 헤더 -->
    <div class="view-head">
      <button class="back-btn" @click="router.push('/dashboard')">‹ 세션 목록</button>
      <div v-if="sessionMeta()" class="session-info">
        <span class="session-date">
          {{ new Date(sessionMeta().startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <span class="badge">발 압력</span>
      </div>
    </div>

    <!-- 발 압력 맵 카드 -->
    <div class="card">
      <div class="card-head">
        <p class="card-title">발 압력 맵</p>
        <p class="card-sub">세션 평균 발 압력 분포 시각화</p>
      </div>
      <FootPressureMap :foot-pressure="store.currentEvents.footPressure ?? {}" />
    </div>
  </template>
</template>

<style scoped>
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
.card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}
.card-head { margin-bottom: 24px; }
.card-title { font-size: 16px; font-weight: 700; color: #1e293b; }
.card-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
</style>
