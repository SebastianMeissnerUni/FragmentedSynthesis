<script setup lang="ts">
import { provide,ref } from 'vue'
import ProfileButton from '@/components/ProfileButton.vue'



provide('openInEditor', (file) => {
  console.log("Öffne Datei:", file)
})


</script>

<template>
  <div class="app-container">
    <header class="topbar">
      <ProfileButton @open-profile="showProfile = true" />
    </header>
    <router-view />
  </div>
</template>

<style>
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.topbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2000; /* damit es über Panels liegt */
}
</style>
