<script setup lang="ts">
import { ref } from "vue"

const showMenu = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function emitGitAction(action: string) {
  window.dispatchEvent(new CustomEvent("editor-git-action", { detail: action }))
  showMenu.value = false
}
</script>

<template>
  <div class="git-button-wrapper">
    <button class="git-icon" @click="toggleMenu">
      GIT
    </button>

    <div v-if="showMenu" class="git-dropdown">
      <button @click="emitGitAction('save-to-git')">💾 Änderungen in GIT speichern</button>
      <button @click="emitGitAction('refresh-from-git')">🔄 Änderungen aus GIT laden</button>
      <button @click="emitGitAction('create-repo')">📦 Neues Repository erstellen</button>
    </div>
  </div>
</template>

<style scoped>
.git-button-wrapper {
  position: relative;
  display: inline-block;
}

.git-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 20px;
}

.git-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 99999;
  width: 220px;
}

.git-dropdown button {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: #f8f8f8;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.git-dropdown button:hover {
  background: #eaeaea;
}
</style>
