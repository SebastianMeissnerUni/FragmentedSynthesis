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
