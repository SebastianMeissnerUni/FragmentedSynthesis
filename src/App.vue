<script setup lang="ts">
import { provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { BibEntry } from '@/components/AppEditor.vue'
import LoadingOverlay from "@/components/LoadingOverlay.vue";


const route = useRoute()
const editorRef = ref(null)

const isLoading = ref(false)
provide("isLoading", isLoading)


const bibliography = ref<BibEntry[]>([])
provide('bibliography', bibliography)

const updateBibliography = (newBib: BibEntry[]) => {
  bibliography.value = newBib
}
provide('updateBibliography', updateBibliography)

provide('openInEditor', (file) => {
  console.log("[App] openInEditor:", file)
  console.log("[App] editorRef:", editorRef.value)

  if (file.type === "open-repo") {
    window.dispatchEvent(new CustomEvent("editor-load-repo", { detail: file.repo }))
    return
  }


  window.dispatchEvent(new CustomEvent("editor-open-file", { detail: file }))
})
</script>

<template>
  <LoadingOverlay />
  <div class="app-container">
    <router-view ref="editorRef" />
  </div>
</template>
