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


</script>


<template>

  <Panel
      v-if="llmBusy"
      position="bottom-center"
      class="llm-queue-panel"
  >
    <LlmQueuePanelContent />
  </Panel>

  <!-- Main Control Interface (Left Side) -->

  <Panel position="top-left">

    <div class="topbar">

      <!-- ⭐ Tools-Button mit integriertem Dropdown -->
      <div class="topbar-item tools-wrapper" @click.self="showTools = !showTools">
        Tools

        <div v-if="showTools" class="tools-dropdown" @click.stop>

          <!-- Erste Reihe -->
          <div class="tools-row">
            <button title="Reload WebApp" @click="reloadApp">🔄</button>
            <button title="Download" @click="saveToFile">💾</button>

            <label class="upload-label" title="Upload">
              📂
              <input accept=".json" type="file" @change="restoreFromFile"/>
            </label>
          </div>

          <!-- Zweite Reihe -->
          <div class="tools-row">
            <button @click="onDeleteSelected">🗑️</button>
            <button @click="onAutoLayout">🔮</button>
            <button @click="createSnapshot">📸</button>
          </div>

        </div>
      </div>

      <!-- Restliche Topbar-Buttons -->
      <div class="topbar-item content-wrapper" @click.self="showContent = !showContent">
        Content

        <div v-if="showContent" class="content-circle-menu" @click.stop>

          <button class="circle-btn quarter quarter-1" @click="addParagraph">
            Paragraph
          </button>

          <button class="circle-btn quarter quarter-2" @click="addLatex">
            Latex Code
          </button>

          <button class="circle-btn quarter quarter-3" @click="addImage">
            Image
          </button>

          <button class="circle-btn quarter quarter-4" @click="addTitle">
            Title
          </button>

        </div>
      </div>


      <div class="topbar-item">LLM</div>
      <div class="topbar-item">Stickynode</div>
      <div class="topbar-item" @click="togglePanel('📚 bibliography')">Bibliography</div>
      <div class="topbar-item" @click="togglePanel('🖼️ figures')">Images</div>
      <div class="topbar-item" @click="togglePanel('📸 snapshots')">Time machine</div>
      <div class="topbar-item">Document Output</div>
      <div class="topbar-item" @click="toggleLanguage">
        {{ language === 'de' ? 'DE' : 'EN' }}
      </div>

    </div>

    <!-- Panel Content -->
    <div class="panel-content">
      <label class="sr-only" for="node-type-select">Node type</label>

      <!-- First Button Row -->
      <div class="buttons profile-row">
        <button title="Reload WebApp" @click="reloadApp">🔄</button>
        <button title="Download (Save project to file)" @click="saveToFile">💾</button>
        <button class="upload-label" title="Upload (Load project from file)">
          📂
          <input accept=".json" type="file" @change="restoreFromFile"/>
        </button>
      </div>

      <!-- Second Button Row -->
      <div class="buttons">
        <button title="Delete selected nodes" @click="onDeleteSelected">🗑️</button>
        <button title="Unchaosify" @click="onAutoLayout">🔮</button>
        <button title="Snapshot" @click="createSnapshot">📸</button>
      </div>

      <!-- Floating Panel Switches -->
      <div class="toggle-switches">
        <div v-for="panel in ['📚 bibliography','🖼️ figures','✏️ style', '📸 snapshots']"
             :key="panel"
             class="toggle-switch">
          <label>
            <input :checked="activeSidebar === panel"
                   type="checkbox"
                   @change="() => togglePanel(panel as '📚 bibliography' | '🖼️ figures' | '✏️ style' | '📸 snapshots')"/>
            <span class="slider purple"></span>
          </label>
          <span class="toggle-label">
            {{ panel.charAt(0).toUpperCase() + panel.slice(1) }}
          </span>
        </div>
      </div>

      <!-- Other Switches -->
      <div class="toggle-switch-group">
        <div class="toggle-switch">
          <label>
            <input v-model="TLDR" type="checkbox"/>
            <span class="slider"></span>
          </label>
          <span class="toggle-label">TLDR-Mode</span>
        </div>

        <div class="toggle-switch">
          <label>
            <input :checked="language === 'de'" type="checkbox" @change="toggleLanguage"/>
            <span class="slider flag"></span>
          </label>
          <span class="toggle-label">Language: {{ languageLabel }}</span>
        </div>
      </div>

      <!-- Draggable Nodes -->
      <div class="drag-nodes">

        <!-- Content Nodes -->
        <h4 class="drag-category">Content Nodes</h4>
        <div
            v-for="template in availableTemplates.filter(t => t.category === 'text')"
            :key="template.type"
            class="draggable-node content-node"
            draggable="true"
            @dragstart="onDragStart(template.type, $event)"
        >
          {{ template.label }}
        </div>

        <!-- LLM Nodes -->
        <h4 class="drag-category">LLM-based Nodes</h4>
        <div
            v-for="template in availableTemplates.filter(t => t.category === 'llm')"
            :key="template.type"
            class="draggable-node llm-node"
            draggable="true"
            @dragstart="onDragStart(template.type, $event)"
        >
          {{ template.label }}
        </div>

        <!-- Utility Nodes -->
        <h4 class="drag-category">Utility Nodes</h4>
        <div
            v-for="template in availableTemplates.filter(t => t.category === 'utility')"
            :key="template.type"
            class="draggable-node utility-node"
            draggable="true"
            @dragstart="onDragStart(template.type, $event)"
        >
          {{ template.label }}
        </div>

      </div>
    </div>
  </Panel>

  <!-- Floating Control Panels (Right Side) -->
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

.buttons {
  display: grid;
  grid-template-columns: repeat(3, 36px);
  grid-auto-rows: 36px;
  gap: 0.5rem;
  justify-content: center;
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

.sr-only {
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
}



.drag-nodes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  margin-top: 8px;
  align-items: center;
}

.draggable-node {
  padding: 6px 8px;
  background: #f7f7f7;
  border: 1px solid rgba(15, 23, 42, .15);
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  font-size: 0.85rem;
  width: 130px; /* optional: feste Breite für eine "Spalte" */
  text-align: center; /* optional: Text zentrieren */
  transition: background 0.15s, color 0.15s;
}

.draggable-node:hover {
  background: #e5e7eb;
  box-shadow: 0 2px 4px rgba(29, 31, 33, 0.12);
}

/* LLM-based Nodes */
.llm-node {
  border: 2px solid #38bdf8;
  font-weight: 600;
}

.llm-node:hover {
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
}

/* Utility Nodes */
.utility-node {
  border: 2px solid #df6a2d;
  font-weight: 600;
}

.utility-node:hover {
  box-shadow: 0 0 8px rgba(223, 106, 45, 0.6);
}

/* Content  Nodes */
.content-node {
  border: 2px solid #37b329;
  font-weight: 600;
}

.content-node:hover {
  box-shadow: 0 0 8px rgba(55, 179, 41, 0.6);
}


.drag-category {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(255, 255, 255);
  margin-top: 10px;
  margin-bottom: 4px;
  padding-left: 2px;
}

/* Animated Toggle-Switch experimental */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
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
  width: 500px;
  height: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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
  background: #111;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  align-items: center;
  text-align: center;
  border-bottom: 1px solid #333;
  z-index: 9999;
}

.topbar-item {
  color: white;
  font-weight: 600;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #333;
}

.topbar-item:hover {
  background: #222;
}

.tools-wrapper {
  position: relative;
}

.tools-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: #222;
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
  background: #333;
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

.content-circle-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  width: 260px;
  height: 260px;
  border-radius: 50%;
  pointer-events: none; /* Container ist nicht klickbar */
}

.circle-btn {
  position: absolute;
  width: 50%;
  height: 50%;
  background: #333;
  color: white;
  font-weight: 600;
  border: 2px solid #444;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto; /* Buttons bleiben klickbar */
  transition: background 0.2s;
}

/* Viertel 1 (oben links) */
.quarter-1 {
  top: 0;
  left: 0;
  border-top-left-radius: 100%;
}

/* Viertel 2 (oben rechts) */
.quarter-2 {
  top: 0;
  right: 0;
  border-top-right-radius: 100%;
}

/* Viertel 3 (unten rechts) */
.quarter-3 {
  bottom: 0;
  right: 0;
  border-bottom-right-radius: 100%;
}

/* Viertel 4 (unten links) */
.quarter-4 {
  bottom: 0;
  left: 0;
  border-bottom-left-radius: 100%;
}

</style>