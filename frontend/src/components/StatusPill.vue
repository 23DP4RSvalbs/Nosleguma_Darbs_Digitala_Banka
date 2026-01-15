<script setup lang="ts">
defineProps<{
  ok: boolean
  label: string
  detail?: string
}>()
</script>

<template>
  <div class="pill" :class="{ ok }">
    <span class="dot" />
    <div class="meta">
      <div class="label">{{ label }}</div>
      <div v-if="detail" class="detail">{{ detail }}</div>
    </div>
  </div>
</template>

<style scoped>
.pill{
  display:flex;
  gap:.75rem;
  align-items:center;
  padding:.85rem 1rem;
  border:1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  box-shadow: 0 10px 22px rgba(15,23,42,.08);
}
.dot{
  width:10px; height:10px;
  border-radius:999px;
  background: #ef4444; /* red */
  box-shadow: 0 0 0 6px rgba(239,68,68,.12);
}
.pill.ok .dot{
  background:#22c55e; /* green */
  box-shadow: 0 0 0 6px rgba(34,197,94,.14);
}
.label{ font-weight: 600; }
.detail{ font-size:.85rem; color: rgba(15,23,42,.60); margin-top:.1rem; }
</style>
