<template>
  <div v-if="active" class="overlay">
    <div class="spinner">
      FS
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue"

const active = inject("isLoading")
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner {
  font-size: 4rem;
  font-weight: bold;
  color: white;
  animation: spin 1.4s linear infinite;
  border-radius: 50%;
  padding: 1.5rem 2.5rem;
  border: 3px solid rgba(255,255,255,0.4);
  text-shadow: 0 0 10px rgba(255,255,255,0.8);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
