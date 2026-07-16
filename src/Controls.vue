<script lang="ts" setup>
import {computed, ref, watch, inject, nextTick, provide, type Ref} from 'vue'
import {Panel, useVueFlow} from '@vue-flow/core'
import {nodeTemplates} from './nodes/templates'
import {onMounted, onUnmounted} from 'vue'


import {useLoadAndSave} from './api/LoadAndSave.ts'
import {applyDagreLayout} from './api/layouts.ts'
import {useDemo} from './api/demo.ts'
import {useSnapshots} from '@/api/Snapshots'


import FigurePanelContent from "@/Panels/FigurePanelContent.vue";
import ReferencePanelContent from "@/Panels/ReferencePanelContent.vue";
import StylePanelContent from "@/Panels/StylePanelContent.vue";
import SnapshotsPanelContent from "@/Panels/SnapshotsPanelContent.vue";
import StartupPanelContent from "@/Panels/StartupPanelContent.vue";
import LlmQueuePanelContent from "@/Panels/LlmQueuePanelContent.vue";
import {llmBusy} from "@/api/llmQueue.ts";
import ProfileButton from './components/ProfileButton.vue';


const demoActive = inject<Ref<boolean>>('demoActive', ref(false))!
const availableTemplates = computed(() => nodeTemplates)
const TLDR = inject<Ref<boolean>>('TLDR')!
const activeSidebar = ref<null | '📚 bibliography' | '🖼️ figures' | '✏️ style' | '📸 snapshots'>(null)
const language = inject<Ref<'en' | 'de'>>('language')!
const languageLabel = computed(() => language.value.toUpperCase())
const designMode = inject<Ref<'standard' | 'disco'>>('designMode')!

let chaosClickCount = 0
let chaosClickTimer: number | undefined
let discoTimeout: number | undefined


const {
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  createAutosaveSnapshot,
} = useSnapshots()


const {
  nodes,
  edges,
  setNodes,
  setEdges,
  screenToFlowCoordinate,
  addNodes,
  dimensions,
  toObject,
  fromObject
} = useVueFlow()

const {startDemo, skipDemo, nextStep} = useDemo({
  demoActive,
  nodes,
  setNodes,
  setEdges,
  addNodes,
  screenToFlowCoordinate,
  dimensions
})

const {saveToFile,
  restoreFromFile
} = useLoadAndSave()



const showTools = ref(false)

const showContent = ref(false)

const circlePos = ref({ x: 300, y: 200 }) // Startposition
const isDraggingCircle = ref(false)
let dragOffset = { x: 0, y: 0 }

function startDragCircle(event: MouseEvent) {
  isDraggingCircle.value = true
  dragOffset.x = event.clientX - circlePos.value.x
  dragOffset.y = event.clientY - circlePos.value.y
}

function stopDragCircle() {
  isDraggingCircle.value = false
}

function onDragCircle(event: MouseEvent) {
  if (!isDraggingCircle.value) return
  circlePos.value = {
    x: event.clientX - dragOffset.x,
    y: event.clientY - dragOffset.y
  }
}

window.addEventListener("mousemove", onDragCircle)
window.addEventListener("mouseup", stopDragCircle)


function spawnNodeFromTemplate(type: string) {
  const template = availableTemplates.value.find(t => t.type === type)
  if (!template) {
    console.warn("Template not found for type:", type)
    return
  }

  const center = {
    x: dimensions.value.width / 2,
    y: dimensions.value.height / 2
  }

  const pos = screenToFlowCoordinate(center)

  addNodes([{
    id: `${type}-${Date.now()}`,
    type: template.type,
    position: pos,
    data: structuredClone(template.data ?? {}),
    width: template.width,
    height: template.height,
    style: structuredClone(template.style ?? {}),
    class: template.class,
    draggable: template.draggable,
    selectable: template.selectable,
    connectable: template.connectable
  }])
}


function addParagraph() {
  spawnNodeFromTemplate('textArea')
}

function addLatex() {
  spawnNodeFromTemplate('magicLatex')
}

function addImage() {
  spawnNodeFromTemplate('figureNode')
}

function addTitle() {
  spawnNodeFromTemplate('compose')
}

function spawnStickyNode() {
  spawnNodeFromTemplate('stickyNote')
}

function spawnDocOutput() {
  spawnNodeFromTemplate('docOutput')
}

function registerChaosClick() {
  if (designMode.value === 'disco') return

  chaosClickCount++

  clearTimeout(chaosClickTimer)
  chaosClickTimer = window.setTimeout(() => {
    chaosClickCount = 0
  }, 1500)

  if (chaosClickCount === 5) {
    triggerDiscoMode()
    chaosClickCount = 0
  }
}


function triggerDiscoMode() {
  if (designMode.value === 'disco') return
  console.log('🪩 Disco Mode unlocked')
  designMode.value = 'disco'
  clearTimeout(discoTimeout)
  discoTimeout = window.setTimeout(() => {
    designMode.value = 'standard'
  }, 5000)
}


function onDragStart(type: string, event: DragEvent) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('node/type', type)
  event.dataTransfer.effectAllowed = 'move'
}


function onDeleteSelected() {
  const remainingEdges = edges.value.filter(edge => !edge.selected)
  setEdges(remainingEdges)
  const remainingNodes = nodes.value.filter(node => !node.selected)
  setNodes(remainingNodes)
}


function onAutoLayout() {
  const newNodes = applyDagreLayout(nodes.value, edges.value, 'LR')
  setNodes(newNodes)
  // Easter Egg Logic
  registerChaosClick()
}

function toggleLanguage() {
  language.value = language.value === 'en' ? 'de' : 'en'
}

function togglePanel(panel: '📚 bibliography' | '🖼️ figures' | '✏️ style' | '📸 snapshots') {
  if (activeSidebar.value === panel) {
    activeSidebar.value = null // Schaltet aus, wenn nochmal geklickt
  } else {
    activeSidebar.value = panel
  }
}

function reloadApp() {
  window.location.reload()
}


let autosaveInterval: number | undefined

onMounted(() => {
  autosaveInterval = window.setInterval(() => {
    createAutosaveSnapshot()
  }, 60_000) // 60 Sekunden
})

onUnmounted(() => {
  if (autosaveInterval) {
    clearInterval(autosaveInterval)
  }
  if (chaosClickTimer) clearTimeout(chaosClickTimer)
  if (discoTimeout) clearTimeout(discoTimeout)
})

const showLLM = ref(false)
const activeLLMButton = ref<string | null>(null)


const llmPos = ref({ x: 500, y: 200 }) // Startposition
const isDraggingLLM = ref(false)
let llmDragOffset = { x: 0, y: 0 }

function startDragLLM(event: MouseEvent) {
  isDraggingLLM.value = true
  llmDragOffset.x = event.clientX - llmPos.value.x
  llmDragOffset.y = event.clientY - llmPos.value.y
}

function stopDragLLM() {
  isDraggingLLM.value = false
}

function onDragLLM(event: MouseEvent) {
  if (!isDraggingLLM.value) return
  llmPos.value = {
    x: event.clientX - llmDragOffset.x,
    y: event.clientY - llmDragOffset.y
  }
}

window.addEventListener("mousemove", onDragLLM)
window.addEventListener("mouseup", stopDragLLM)


</script>


<template>

  <!-- LLM Queue Panel -->
  <Panel
      v-if="llmBusy"
      position="bottom-center"
      class="llm-queue-panel"
  >
    <LlmQueuePanelContent />
  </Panel>

  <!-- LEFT PANEL: Topbar + Dropdowns -->
  <Panel position="top-left">

    <div class="topbar">

      <!-- Tools -->
      <div
          class="topbar-item tools-wrapper"
          :class="{ active: showTools }"
          @click.self="showTools = !showTools"
      >
        Tools

        <div v-if="showTools" class="tools-dropdown" @click.stop>
          <div class="tools-row">
            <button title="Reload WebApp" @click="reloadApp">⭯</button>
            <button title="Download" @click="saveToFile">💾</button>

            <label class="upload-label" title="Upload">
              📂
              <input accept=".json" type="file" @change="restoreFromFile"/>
            </label>
          </div>

          <div class="tools-row">
            <button @click="onDeleteSelected">🗑️</button>
            <button @click="onAutoLayout">🔮</button>
            <button @click="createSnapshot">🕙</button>
          </div>
        </div>
      </div>

      <!-- Content Button -->
      <div
          class="topbar-item content-wrapper"
          :class="{ active: showContent }"
          @click.self="showContent = !showContent"
      >
        Content

        <!-- Content Dropdown INSIDE the button -->
        <div v-if="showContent" class="dropdown content-dropdown" @click.stop>
          <button @click="addParagraph">Paragraph</button>
          <button @click="addLatex">Latex Code</button>
          <button @click="addImage">Image</button>
          <button @click="addTitle">Title</button>
        </div>
      </div>

      <!-- LLM Button -->
      <div
          class="topbar-item llm-wrapper"
          :class="{ active: showLLM }"
          @click.self="showLLM = !showLLM"
      >
        LLM

        <!-- LLM Dropdown INSIDE the button -->
        <div v-if="showLLM" class="dropdown llm-dropdown" @click.stop>
          <button @click="spawnNodeFromTemplate('edit')">Edit</button>
          <button @click="spawnNodeFromTemplate('paraphrase')">Paraphrase</button>
          <button @click="spawnNodeFromTemplate('grammar')">Grammar</button>
          <button @click="togglePanel('✏️ style')">AI Settings</button>

          <button
              :class="{ active: activeLLMButton === 'tldr' }"
              @click="
                activeLLMButton === 'tldr'
                  ? activeLLMButton = null
                  : activeLLMButton = 'tldr';
                TLDR = !TLDR
              "
          >
            TLDR
          </button>
        </div>
      </div>

      <!-- Sticky -->
      <div class="topbar-item" @click="spawnStickyNode">
        Stickynode
      </div>

      <!-- Right Panel Buttons -->
      <div
          class="topbar-item"
          :class="{ active: activeSidebar === '📚 bibliography' }"
          @click="togglePanel('📚 bibliography')"
      >
        Bibliography
      </div>

      <div
          class="topbar-item"
          :class="{ active: activeSidebar === '🖼️ figures' }"
          @click="togglePanel('🖼️ figures')"
      >
        Images
      </div>

      <div
          class="topbar-item"
          :class="{ active: activeSidebar === '📸 snapshots' }"
          @click="togglePanel('📸 snapshots')"
      >
        Time machine
      </div>

      <div class="topbar-item" @click="spawnDocOutput">
        Document Output
      </div>

      <!-- Language -->
      <div class="topbar-item" @click="toggleLanguage">
        {{ language === 'de' ? 'DE' : 'EN' }}
      </div>

    </div>

    <!-- Minimal Panel Content -->
    <div class="panel-content" style="min-height: 40px;"></div>

  </Panel>

  <!-- RIGHT PANELS -->
  <Panel v-if="activeSidebar === '📚 bibliography'" position="top-right">
    <div class="side-panel">
      <h4>Reference Tracker</h4>
      <ReferencePanelContent/>
    </div>
  </Panel>

  <Panel v-if="activeSidebar === '🖼️ figures'" position="top-right">
    <div class="side-panel">
      <h4>Figure Tracker</h4>
      <FigurePanelContent/>
    </div>
  </Panel>

  <Panel v-if="activeSidebar === '✏️ style'" position="top-right">
    <div class="side-panel">
      <h4>Style Specifications</h4>
      <StylePanelContent/>
    </div>
  </Panel>

  <Panel v-if="activeSidebar === '📸 snapshots'" position="top-right">
    <div class="side-panel">
      <h4>Snapshots</h4>
      <SnapshotsPanelContent/>
    </div>
  </Panel>

</template>




<style scoped>
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.buttons button {
  align-items: center;
  background-color: white;
  color: black;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  display: inline-flex;
  height: 36px;
  justify-content: center;
  padding: 0.25rem;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.buttons button:hover {
  background-color: rgba(95, 95, 95, 0.08);
  box-shadow: 0 2px 4px rgba(29, 31, 33, 0.12);
}

.buttons svg,
.add-button svg {
  height: 18px;
  width: 18px;
}


.toggle-switch label {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch label input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 12px;
  transition: 0.2s;
}

.toggle-switch .slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

.toggle-switch .toggle-label {
  font-size: 0.85rem;
  color: #ffffff;
}


/* New Sidebar and Switches */

.toggle-switch .slider.purple {
  /*background-color: #9b59b6;*/
}

.toggle-switch input:checked + .slider.purple {
  /*background-color: #8e44ad;*/
}

.toggle-switch input:checked + .slider.purple::before {
  transform: translateX(16px);
}

.toggle-switch input:checked + .slider:not(.flag):not(.purple)::before {
  transform: translateX(16px);
}


.side-panel {
  position: absolute; /* oder fixed, je nach deinem Layout */
  top: 40px;          /* exakt die Höhe deiner Topbar */
  right: 0;
  width: 500px;
  height: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 12px;
  color: #02376b;
  box-shadow: 0 4px 20px #006ab2;
  background-color: #66a6d1;

}

/* Nur TLDR-Slider (ohne zusätzliche Klassen) wird grün */
.toggle-switch input:checked + .slider:not(.flag):not(.purple) {
  background-color: #22ff00;
}

/* Alle anderen speziellen Slider behalten ihr Styling */
.toggle-switch input:checked + .slider.purple {
  background-color: #8e44ad;
}

.toggle-switch .slider.flag {
  background-color: #ccc; /* neutraler Hintergrund */
}

.toggle-switch .slider.flag::before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  border-radius: 50%;
  background-size: cover;
  transition: 0.2s;
}

/* Wenn unchecked, englische Flagge */
.toggle-switch input:not(:checked) + .slider.flag::before {
  background-image: url('https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg');
}

/* Wenn checked, deutsche Flagge */
.toggle-switch input:checked + .slider.flag::before {
  background-image: url('https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg');
  transform: translateX(16px);
}

.upload-label {
  background: #333;
  color: white;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.upload-label input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}


.upload-label:hover {
  background-color: rgba(95, 95, 95, 0.08);
  box-shadow: 0 2px 4px rgba(29, 31, 33, 0.12);
}


.disco-hotspot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: auto;
}

.panel-content:hover .disco-hotspot {
  opacity: 0.4;
}

.disco-hotspot:hover {
  opacity: 1;
  transform: translateX(-50%) scale(1.2);
}


.buttons.profile-row {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Abstand zwischen Buttons */
}

/* Kleiner Abstand links vom Profilbutton, falls nötig */
.buttons.profile-row ProfileButton,
.buttons.profile-row .profile-btn {
  margin-left: 6px;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 48px;
  background: #006ab2;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  align-items: center;
  text-align: center;
  border-bottom: 1px solid #333;
  z-index: 9999;

}

.topbar-item {
  color: #f2f7f8;
  font-weight: 600;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #333;
  position: relative;
}

.topbar-item:hover {
  background: #66a6d1;
}

.tools-wrapper {
  position: relative;
}

.tools-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 91%;
  background: #02376b;
  border: 1px solid #444;
  padding: 8px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}



.tools-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.tools-row button,
.tools-row .upload-label {
  background: #006ab2;
  color: white;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 36px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.upload-label input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.content-wrapper {
  position: relative;
}

.topbar-item.active {
  background-color: #02376b;     /* dunkler Hintergrund */
  color: white;               /* Textfarbe */
  border-radius: 6px;         /* optional */
  box-shadow: 0 0 6px #888;   /* optional Glow */
}


.topbar-item.active {
  background-color: #02376b;
  color: white;
  border-radius: 6px;
  padding: 6px 10px;

}

.tools-dropdown button:hover {
  background-color: #66a6d1 !important;
  color: white !important;
  border-radius: 6px;
  cursor: pointer;
}

/* Gemeinsamer Stil für alle Dropdowns */
.dropdown {
  position: absolute;
  top: 100%;      /* direkt unter dem Topbar-Button */
  left: 0;
  width: 91%;    /* WICHTIG: gleiche Breite wie der Topbar-Button */
  background: #02376b;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  padding: 8px;
  z-index: 9999;
}

/* Buttons im Dropdown – wie bei Tools */
.dropdown button {
  background: #006ab2;
  color: white;
  padding: 6px;
  border-radius: 0px;
  cursor: pointer;
  font-size: 1rem;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.dropdown button:hover {
  background-color: #66a6d1;
  color: white;
}



.content-wrapper {
  position: relative;
}

.content-dropdown {
  position: absolute;
  top: 33px;
  left: 0;
}

.topbar-item:nth-child(3) {
  position: relative;
}

.llm-dropdown {
  position: absolute;
  top: 33px;
  left: 0;
}

.panel-content {
  min-height: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

</style>