<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import SessionList from '@/components/SessionList.vue'

const store   = useSessionStore()
const router  = useRouter()
const inputId = ref(store.userId)

function search() {
  const id = inputId.value.trim()
  if (!id) return
  store.userId = id
  store.fetchSessions()
}

onMounted(() => store.fetchSessions())

// ── 세션 선택 ──────────────────────────────────────────────────
const selectedRunning = ref(null)  // 선택된 러닝 세션 객체
const selectedFp      = ref(null)  // 선택된 발 압력 세션 객체

function handleSelect(session) {
  if (session.sessionType === 'foot_pressure') {
    selectedFp.value = selectedFp.value?.sessionId === session.sessionId ? null : session
  } else {
    selectedRunning.value = selectedRunning.value?.sessionId === session.sessionId ? null : session
  }
}

const selectedIds = computed(() => {
  const ids = []
  if (selectedRunning.value) ids.push(selectedRunning.value.sessionId)
  if (selectedFp.value)      ids.push(selectedFp.value.sessionId)
  return ids
})

const canView = computed(() => selectedRunning.value && selectedFp.value)

function viewCombined() {
  router.push({
    name: 'combined',
    query: { running: selectedRunning.value.sessionId, fp: selectedFp.value.sessionId }
  })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="title-row">
        <h1 class="page-title">대시보드</h1>
        <div class="search-row">
          <input v-model="inputId" class="user-input" placeholder="사용자 ID" @keydown.enter="search"/>
          <button class="search-btn" @click="search">조회</button>
        </div>
      </div>
      <p class="page-sub">{{ store.userId }}님의 세션 목록 — 러닝과 발 압력 세션을 하나씩 선택하세요.</p>
    </div>

    <!-- 선택 패널 -->
    <div class="select-panel">
      <div class="select-slot" :class="{ filled: selectedRunning }">
        <span class="slot-icon">🏃</span>
        <div class="slot-info">
          <p class="slot-label">러닝 세션</p>
          <p class="slot-value">{{ selectedRunning ? formatDate(selectedRunning.startTime) : '선택 안됨' }}</p>
        </div>
        <button v-if="selectedRunning" class="slot-clear" @click="selectedRunning = null">✕</button>
      </div>

      <div class="select-arrow">+</div>

      <div class="select-slot" :class="{ filled: selectedFp }">
        <span class="slot-icon">👣</span>
        <div class="slot-info">
          <p class="slot-label">발 압력 세션</p>
          <p class="slot-value">{{ selectedFp ? formatDate(selectedFp.startTime) : '선택 안됨' }}</p>
        </div>
        <button v-if="selectedFp" class="slot-clear" @click="selectedFp = null">✕</button>
      </div>

      <button class="view-btn" :disabled="!canView" @click="viewCombined">
        조합 보기 →
      </button>
    </div>

    <!-- 세션 목록 -->
    <div v-if="store.loading" class="state-msg">불러오는 중...</div>
    <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>
    <div v-else-if="!store.sessions.length" class="state-msg">
      저장된 세션이 없습니다.<br/>사용자 ID를 확인해 주세요.
    </div>
    <SessionList
      v-else
      :sessions="store.sessions"
      :selected-ids="selectedIds"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 16px; }
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.page-title { font-size: 20px; font-weight: 700; color: #1e293b; }
.search-row { display: flex; gap: 8px; }
.user-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  width: 160px;
}
.user-input:focus { border-color: #3b82f6; }
.search-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
}
.search-btn:hover { background: #2563eb; }
.page-sub { font-size: 13px; color: #94a3b8; margin-top: 6px; }

/* ── 선택 패널 ── */
.select-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  flex-wrap: wrap;
}
.select-slot {
  flex: 1;
  min-width: 180px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px dashed #e2e8f0;
  background: #f8fafc;
  transition: border-color 0.15s, background 0.15s;
}
.select-slot.filled { border-style: solid; border-color: #3b82f6; background: #eff6ff; }
.select-slot.filled:has(.slot-icon:contains('👣')) { border-color: #a855f7; background: #faf5ff; }
.slot-icon { font-size: 22px; }
.slot-info { flex: 1; }
.slot-label { font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
.slot-value { font-size: 12px; color: #1e293b; font-weight: 500; }
.slot-clear {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  padding: 2px 4px;
  cursor: pointer;
  border-radius: 4px;
}
.slot-clear:hover { color: #64748b; background: #f1f5f9; }

.select-arrow { font-size: 20px; color: #cbd5e1; font-weight: 300; flex-shrink: 0; }

.view-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.view-btn:hover:not(:disabled) { background: #2563eb; }
.view-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

/* ── 상태 ── */
.state-msg { text-align: center; padding: 60px 0; color: #94a3b8; font-size: 14px; line-height: 1.8; }
.state-msg.error { color: #ef4444; }

@media (max-width: 640px) {
  .select-panel { flex-direction: column; align-items: stretch; }
  .select-arrow { text-align: center; }
  .view-btn { width: 100%; }
}
</style>
