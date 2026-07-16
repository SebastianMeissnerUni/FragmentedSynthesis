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
  display: block;
  pointer-events: auto;
}


.upload-btn {
  background: #66a6d1;
  border: 1px solid #02376b;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  padding: 6px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  position: fixed;
  top: 110px;     /* Abstand nach unten */
  right: 10px;   /* Abstand vom rechten Rand (Profilbutton ist bei right:10px) */
  pointer-events: auto; /* Button bleibt klickbar */
  z-index: 1000;
}


.dropdown {
  position: fixed;
  top: 150px;   /* unter dem Button */
  right: 10px;  /* gleiche Position wie der Button */
  background: #66a6d1;
  border: 1px solid #02376b;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  min-width: 120px;
  z-index: 999999;
}

.file-option {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  cursor: pointer;
  color: black;
}

.file-option input {
  margin-top: 4px;
}

.dropdown button {
  background: #bce0f7;      /* gleiche Farbe wie Upload-Button */
  color: black;             /* Schriftfarbe */
  border: 1px solid #02376b;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
}

.dropdown button:hover {
  background: #006ab2;      /* Hover-Farbe */
  color: white;
}

.file-option input {
  background: #bce0f7;      /* Hintergrund */
  color: black;             /* Schriftfarbe */
  border: 1px solid #02376b;
  border-radius: 6px;
  padding: 6px;
}


</style>
