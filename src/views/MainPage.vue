<script setup lang="ts">
import AppEditor from "@/components/AppEditor.vue"
import StartupPanelContent from "../Panels/StartupPanelContent.vue";

const token = localStorage.getItem("token");
const isLoggedIn = !!token;
// Token-Check
if (!localStorage.getItem("token")) {
  window.location.href = "/login";
}
</script>

<template>
  <AppEditor />
  <StartupPanelContent v-if="showIntro" />
</template>

<style scoped>

</style>