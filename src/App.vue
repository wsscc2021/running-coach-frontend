<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CollectionToggle from '@/components/CollectionToggle.vue'

const router = useRouter()
const route  = useRoute()

const navItems = [
  { label: '대시보드',     icon: '⊞', to: '/dashboard',     active: (p) => p === '/dashboard' },
  { label: '런닝 데이터',  icon: '∿', to: null,              active: (p) => p.startsWith('/session') },
  { label: '발 압력 분석', icon: '👣', to: '/foot-pressure',  active: (p) => p === '/foot-pressure' },
  { label: '진행 상황',   icon: '↗', to: '/progress',       active: (p) => p === '/progress' }
]

function navigate(item) {
  if (item.to) router.push(item.to)
}
</script>

<template>
  <div class="shell">
    <header class="header">
      <div class="header-inner">
        <div class="header-top">
          <div class="brand">
            <span class="brand-icon">👟</span>
            <span class="brand-name">발걸음 분석 시스템</span>
          </div>
          <CollectionToggle />
        </div>
        <nav class="nav">
          <button
            v-for="item in navItems"
            :key="item.label"
            class="nav-btn"
            :class="{ active: item.active(route.path) }"
            @click="navigate(item)"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────── */
.header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 8px;
}

.brand-icon { font-size: 22px; }

.brand-name {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
}

/* ── Nav ───────────────────────────────────── */
.nav {
  display: flex;
  border-top: 1px solid #f1f5f9;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.nav-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}

.nav-btn:hover:not(.active) { color: #334155; }

.nav-icon { font-size: 14px; }

/* ── Main ──────────────────────────────────── */
.main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
}
</style>
