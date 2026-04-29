<script setup lang="ts">
import ProfileButton from '@/components/ProfileButton.vue'
</script>

<template>
  <div class="app-container">
    <header class="topbar">
      <ProfileButton />
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
