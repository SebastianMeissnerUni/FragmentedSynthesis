<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goToProfile() {
  router.push('/profile')
}
</script>

<template>
  <button class="profile-btn" @click="goToProfile" aria-label="Profil öffnen">
    <span class="profile-icon" aria-hidden="true">👤</span>
    <span class="sr-only">Profil öffnen</span>
  </button>
</template>

<style scoped>
.profile-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.profile-icon {
  font-size: 20px; /* anpassen für gewünschte Größe */
  line-height: 1;
  display: inline-block;
  width: 28px;
  height: 28px;
  text-align: center;
  border-radius: 50%;
  /* optional: Hintergrund, um wie Avatar auszusehen */
  background: transparent;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
</style>