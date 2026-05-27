<template>
  <div class="placeholder">
    <span class="icon">📈</span>
    <p>진행 상황</p>
    <p class="sub">준비 중입니다.</p>
  </div>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  gap: 10px;
  color: #94a3b8;
}
.icon { font-size: 48px; }
p { font-size: 18px; font-weight: 600; color: #64748b; }
.sub { font-size: 13px; font-weight: 400; }
</style>
