<script setup>
import { ref, onMounted } from 'vue'
import { collectionApi } from '@/api/index.js'

const collecting = ref(false)
const loading    = ref(false)
const error      = ref(null)

async function fetchState() {
  try {
    const data = await collectionApi.getState()
    collecting.value = data.collecting
  } catch (e) {
    error.value = e.message
  }
}

async function toggle() {
  if (loading.value) return
  loading.value = true
  error.value   = null
  try {
    const data = await collectionApi.setState(!collecting.value)
    collecting.value = data.collecting
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchState)
</script>

<template>
  <div class="toggle-wrap">
    <button
      class="toggle-btn"
      :class="{ on: collecting, loading }"
      :disabled="loading"
      @click="toggle"
      :title="error ?? undefined"
    >
      <span class="dot" />
      <span class="label">{{ loading ? '...' : collecting ? '수집 중' : '수집 중지' }}</span>
    </button>
  </div>
</template>

<style scoped>
.toggle-wrap {
  display: flex;
  align-items: center;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
  background: #f1f5f9;
  color: #64748b;
}

.toggle-btn.on {
  background: #dcfce7;
  color: #16a34a;
}

.toggle-btn.loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-btn:hover:not(:disabled):not(.on) {
  background: #e2e8f0;
}

.toggle-btn.on:hover:not(:disabled) {
  background: #bbf7d0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
  transition: background 0.2s;
}

.toggle-btn.on .dot {
  background: #16a34a;
  box-shadow: 0 0 0 2px #bbf7d0;
}
</style>
