<script setup lang="ts">
import { ref, provide } from 'vue'
import AppEditor from "@/components/AppEditor.vue"
import ProfilePage from "@/views/Profile.vue"
import ProfileButton from "@/components/ProfileButton.vue"

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// Token check
const token = localStorage.getItem("token")
const guest = localStorage.getItem("guest")

if (!token && !guest) {
  window.location.href = "/login"
}

provide("openInEditor", (file) => {
  console.log('[MainPage] openInEditor called with:', file)
  window.dispatchEvent(new CustomEvent("editor-open-file", { detail: file }))
})
// Overlay‑State
const showProfile = ref(false)
</script>


<template>
  <div class="main-container">

    <header class="topbar">
      <ProfileButton @open-profile="showProfile = true" />
    </header>

    <AppEditor />

    <ProfilePage v-if="showProfile" @close="showProfile = false" />

  </div>
</template>

<style scoped>
.main-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.topbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2000;
}
</style>
