<script setup lang="ts">
import AppEditor from "@/components/AppEditor.vue"
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const token = localStorage.getItem("token")
const guest = localStorage.getItem("guest")

if (!token && !guest) {
  window.location.href = "/login"
}
</script>

<template>
  <AppEditor />
</template>
