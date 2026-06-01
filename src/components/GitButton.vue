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
    <button class="git-button" @click="toggleMenu">
      GIT
    </button>

    <div v-if="showMenu" class="git-menu">
      <button @click="emitGitAction('save-to-git')">💾 Änderungen in GIT speichern</button>
      <button @click="emitGitAction('create-repo')">📦 Neues Repository erstellen</button>
    </div>
  </div>
</template>

<style scoped>
.git-button-wrapper {
  position: relative;
}

.git-button {
  background: #222;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.git-menu {
  position: absolute;
  right: 0;
  top: 40px;
  background: #1e1e1e;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 3000;
}

.git-menu button {
  background: #333;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
</style>
