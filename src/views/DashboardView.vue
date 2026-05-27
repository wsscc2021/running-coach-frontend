<script setup>
import { ref, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import SessionList from '@/components/SessionList.vue'

const store = useSessionStore()
const inputId = ref(store.userId)

function search() {
  const id = inputId.value.trim()
  if (!id) return
  store.userId = id
  store.fetchSessions()
}

onMounted(() => store.fetchSessions())
</script>

<template>
  <div>
    <div class="page-head">
      <div class="title-row">
        <h1 class="page-title">대시보드</h1>
        <div class="search-row">
          <input
            v-model="inputId"
            class="user-input"
            placeholder="사용자 ID"
            @keydown.enter="search"
          />
          <button class="search-btn" @click="search">조회</button>
        </div>
      </div>
      <p class="page-sub">{{ store.userId }}님의 운동 세션 목록</p>
    </div>

    <div v-if="store.loading" class="state-msg">불러오는 중...</div>
    <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>
    <div v-else-if="!store.sessions.length" class="state-msg">
      저장된 세션이 없습니다.<br />Android 앱에서 데이터를 업로드하거나 사용자 ID를 확인해 주세요.
    </div>
    <SessionList v-else :sessions="store.sessions" />
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 20px; }

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.search-row {
  display: flex;
  gap: 8px;
}

.user-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  width: 160px;
  transition: border-color 0.15s;
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
  transition: background 0.15s;
}

.search-btn:hover { background: #2563eb; }

.page-sub {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 6px;
}

.state-msg {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.8;
}

.state-msg.error { color: #ef4444; }
</style>
