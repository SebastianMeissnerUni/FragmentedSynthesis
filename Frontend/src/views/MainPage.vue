<script setup lang="ts">
import { ref, provide } from 'vue'
import AppEditor from "@/components/AppEditor.vue"
import ProfilePage from "@/views/Profile.vue"
import ProfileButton from "@/components/ProfileButton.vue"
import UploadButton from "@/components/UploadButton.vue"
import GitButton from "@/components/GitButton.vue"


import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// Token check
const token = localStorage.getItem("token")
const guest = localStorage.getItem("guest")

if (!token && !guest) {
  window.location.href = "/login"
}

// Overlay‑State
const showProfile = ref(false)

function restoreFromFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const content = reader.result as string
    window.dispatchEvent(new CustomEvent("editor-load-json", { detail: content }))
  }
  reader.readAsText(file)
}

function importZip(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  window.dispatchEvent(new CustomEvent("editor-load-zip", { detail: file }))
}

function startEmpty() {
  window.dispatchEvent(new CustomEvent("editor-start-empty"))
}

function startDemo() {
  window.dispatchEvent(new CustomEvent("editor-start-demo"))
}

const editor = ref(null)

defineExpose({
  editor
})


</script>


<template>
  <div class="main-container">

    <header class="topbar">
      <ProfileButton @open-profile="showProfile = true" />
      <UploadButton
          @upload-json="restoreFromFile"
          @upload-zip="importZip"
          @start-empty="startEmpty"
          @start-demo="startDemo"
      />
      <GitButton />
    </header>


    <AppEditor ref="editor" />


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
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2000;
}

</style>
