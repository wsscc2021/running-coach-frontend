<script setup>
import { onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import SessionList from '@/components/SessionList.vue'

const store = useSessionStore()
onMounted(() => store.fetchSessions())
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">대시보드</h1>
      <p class="page-sub">{{ store.userId }}님의 운동 세션 목록</p>
    </div>

    <div v-if="store.loading" class="state-msg">불러오는 중...</div>
    <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>
    <div v-else-if="!store.sessions.length" class="state-msg">
      저장된 세션이 없습니다.<br />Android 앱에서 데이터를 업로드해 주세요.
    </div>
    <SessionList v-else :sessions="store.sessions" />
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.page-sub {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
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
