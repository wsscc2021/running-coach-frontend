<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  color: { type: String, default: 'blue' }  // blue | green | red | purple
})
</script>

<template>
  <div class="card">
    <div class="info">
      <p class="label">{{ label }}</p>
      <p class="value">{{ value }}</p>
    </div>
    <div class="icon" :class="`icon--${color}`">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  flex: 1;
  min-width: 0;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
}

.value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.icon--blue   { background: #eff6ff; }
.icon--green  { background: #f0fdf4; }
.icon--red    { background: #fff1f2; }
.icon--purple { background: #faf5ff; }
</style>
