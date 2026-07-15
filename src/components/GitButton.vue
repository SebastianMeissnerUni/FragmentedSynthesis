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
  display: block;
  pointer-events: auto;
}



.git-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;   /* <-- gleiche Rundung wie Profil */
    background: #99683A;
    border: 1px solid #4A2D11;
    padding: 6px 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white; /* optional */
    position: fixed;
    top: 160px;     /* Abstand nach unten */
    right: 10px;  /* Abstand vom rechten Rand */
    pointer-events: auto;
}



.git-dropdown {
  position: fixed;
  top: 200px;    /* unter dem Button */
  right: 10px;  /* gleiche Position wie der Button */
  background: #FCB465;
  border: 1px solid #CF9151;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 999999;
  width: 220px;
}


.git-dropdown button {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: #CF9151;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.git-dropdown button:hover {
  background: #F7D6BA;
}
</style>
