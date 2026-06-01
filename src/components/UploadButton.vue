<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"

const emit = defineEmits([
  "upload-json",
  "upload-zip",
  "start-empty",
  "start-demo"
])

const open = ref(false)
const wrapper = ref<HTMLElement | null>(null)
const jsonInput = ref<HTMLInputElement | null>(null)
const zipInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  console.log("UploadButton mounted")
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}


function handleClickOutside(event: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside)
})

function onJsonChange(e: Event) {
  emit("upload-json", e)   // Event weitergeben
  if (jsonInput.value) jsonInput.value.value = ""
  close()
}

function onZipChange(e: Event) {
  emit("upload-zip", e)    // Event weitergeben
  if (zipInput.value) zipInput.value.value = ""
  close()
}

function startEmpty() {
  emit("start-empty")
  close()
}

function startDemo() {
  emit("start-demo")
  close()
}
</script>

<template>
  <div class="upload-wrapper" ref="wrapper">
    <button class="upload-btn" @click.stop="toggle">📤</button>

    <div v-if="open" class="dropdown">
      <button @click="startEmpty">Neues Projekt</button>

      <label class="file-option">
        JSON laden
        <input
            ref="jsonInput"
            type="file"
            accept=".json"
            @change="onJsonChange"
        />
      </label>

      <label class="file-option">
        ZIP laden
        <input
            ref="zipInput"
            type="file"
            accept=".zip"
            @change="onZipChange"
        />
      </label>

      <button @click="startDemo">Demo starten</button>
    </div>
  </div>
</template>

<style scoped>
.upload-wrapper {
  position: relative;
  z-index: 2000;
  pointer-events: auto;
}

.upload-btn {
  background: white;
  border: 2px solid #ccc;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  cursor: pointer;
  font-size: 20px;
  position: relative;
  z-index: 9000;
}

.dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 2500;
}

.file-option {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  cursor: pointer;
}

.file-option input {
  margin-top: 4px;
}
</style>
