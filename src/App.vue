<script setup lang="ts">
import { provide } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

provide('openInEditor', (file) => {
  console.log("Öffne Datei:", file)
})
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
