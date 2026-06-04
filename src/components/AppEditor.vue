<script setup lang="ts">
import { inject } from 'vue'
import { ref, watch, provide, computed, nextTick, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { type Node, type Edge, type Connection, useVueFlow } from '@vue-flow/core'
import { VueFlow, addEdge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import StartupPanelContent from "@/Panels/StartupPanelContent.vue"
import SaveRestoreControls from '../Controls.vue'
import { findNodeTemplate } from '../nodes/templates'
import type { DocElement, ParagraphElement, FigureElement } from "@/docstructure"
import JSZip from "jszip"
import { parseLatexToNodesAndEdges } from "@/api/NewLatexParser"
import { parseOverleafZip } from "@/api/OverleafParser"
import { useDemo } from "@/api/demo"
import { v4 as uuid } from "uuid"



//Import every node-component:
import TextAreaNode from './TextAreaNode.vue'
import TextViewNode from './TextViewNode.vue'
import ParaphraseNode from './ParaphraseNode.vue'
import ComposeNode from './ComposeNode.vue'
import DocOutputNode from './DocOutputNode.vue'
import EditNode from './EditNode.vue'
import GrammarNode from './GrammarNode.vue'
import StickyNote from './StickyNote.vue'
import FigureNode from './FigureNode.vue'
import TourGuideNode from './TourGuideNode.vue'
import MagicLatexNode from './MagicLatexNode.vue'


//Interfaces for globally provided data:

export interface BibEntry {
  id: string
  type: string
  fields: Record<string, string>
  raw?: string
}

export interface ImageCacheEntry {
  base64: string
  refLabel: string
  latexLabel: string
}

export type ImageCache = Record<string, ImageCacheEntry>


export interface Snapshot {
  id: string
  name: string
  createdAt: number
  data: any
  screenshot?: string // optional, base64 image
  isAutoSave?: boolean
}

export interface StyleTemplate {
  templateName: string
  tone: string
  sectionLength: number
  emphasizePoints: string
}

export interface ZipFileEntry {
  path: string
  type: 'tex' | 'bib' | 'image' | 'other'
  content: string | ArrayBuffer
}


export interface EdgeMouseEvent {
  edge: Edge
  event: MouseEvent
}

//Globally provided data:

const currentRepo = ref(null)

onMounted(() => {
  window.addEventListener("editor-load-repo", (e) => {
    loadEntireRepo(e.detail)
  })
})

function hardResetEditor() {
  setNodes([])
  setEdges([])
  doc.value = []
}

const currentRepoFiles = ref<string[]>([])


const doc = ref<DocElement[]>([])
provide("doc", doc)

const imageCache = ref<ImageCache>({})
provide('imageCache', imageCache)

const addParagraphNode = (text: string, filePath: string) => {
  const fileName = filePath.split("/").pop() ?? "Untitled"

  // 1) Doc-Node erzeugen
  const id = crypto.randomUUID()
  const node: ParagraphElement = {
    id,
    kind: "paragraph",
    title: fileName,
    body: text,
    children: [],
    sourceNodeId: fileName
  }

  doc.value.push(node)

  // 2) VueFlow-Node erzeugen
  addNodes([
    {
      id,
      type: "textView",
      position: { x: 200, y: 200 },
      data: {
        label: fileName,
        text: text
      },
      dragHandle: ".doc-node__header"
    }
  ])
  console.log("[AppEditor] ParagraphNode created:", id)
}

const addFigureNode = (imageUrl: string, filePath: string) => {
  // Dateiname aus filePath ODER aus der URL extrahieren
  let fileName = filePath?.split("/").pop() ?? null

  if (!fileName || !fileName.includes(".")) {
    const urlName = imageUrl.split("/").pop()
    if (urlName && urlName.includes(".")) {
      fileName = urlName
    } else {
      fileName = null   // ⭐ WICHTIG: NICHT "image.png" setzen
    }
  }

  const id = crypto.randomUUID()

  // ⭐ Doc-Node (interne Struktur)
  const node: FigureElement = {
    id,
    kind: "figure",
    title: fileName ?? "figure",
    body: "",
    children: [],
    imageName: fileName?.split("/").pop() ?? null,
    latexLabel: (fileName ?? "figure").replace(/\.[^.]+$/, ""),
    label: "fig:" + crypto.randomUUID()
  }

  doc.value.push(node)

  // ⭐ VueFlow-Node (sichtbar im Editor)
  addNodes([
    {
      id,
      type: "figureNode",
      position: { x: 300, y: 300 },
      data: {
        image: imageUrl,
        imageName: fileName?.split("/").pop() ?? null,
        isFromRepo: false,        // ⭐ WICHTIG: neue Node
        label: fileName ?? "figure",
        refLabel: "fig-" + crypto.randomUUID(),
        latexLabel: (fileName ?? "figure").replace(/\.[^.]+$/, ""),
        kind: "figure"
      },
      dragHandle: ".doc-node__header"
    }
  ])

  console.log("[AppEditor] FigureNode created:", id, fileName)
}


function connectToOutput(nodeId) {
  setEdges((eds) => {
    const index = eds.filter(e => e.target === "docOutput").length

    return [
      ...eds,
      {
        id: `e-${nodeId}-out`,
        source: nodeId,
        target: "docOutput",
        targetHandle: `doc-${index}`
      }
    ]
  })
}

async function loadEntireRepo(repo) {
  console.log("[AppEditor] Lade komplettes Repo:", repo)

  hardResetEditor()

  const token = localStorage.getItem("token")
  const res = await fetch(
      `http://localhost:3000/github/repo-tree?owner=${repo.owner}&repo=${repo.name}`,
      { headers: { Authorization: `Bearer ${token}` } }
  )

  const files = await res.json()

  currentRepoFiles.value = files.map(f => f.path)


  const nodes = []
  const edges = []

  // ⭐ Output-Node zuerst
  nodes.push({
    id: "docOutput",
    type: "docOutput",
    position: { x: 400, y: 100 },
    data: {
      label: "Document Output",
      json: "[]",
      value: "",
      bibliography: [],
      width: 600,
      height: 800
    },
    draggable: true,
    dragHandle: ".doc-node__header",
    class: "doc-output doc-node"
  })


  let index = 0

  for (const file of files) {
    const lower = file.path.toLowerCase()

    if (lower.endsWith(".tex")) {
      const id = uuid()
      const text = atob(file.content)
      const fullPath = file.path
      const fileName = fullPath.split("/").pop() ?? "Untitled"

      // 1) Doc-Node
      doc.value.push({
        id,
        kind: "paragraph",
        title: fileName,
        body: text,
        children: [],
        sourceNodeId: id
      })

      // 2) VueFlow-Node (ECHTER ParagraphNode)
      nodes.push({
        id,
        type: "textArea",
        position: { x: 200, y: 200 },
        data: {
          label: fullPath,        // ⭐ voller Pfad!
          value: text,
          citations: [],
          figures: [],
          status: "idle",
          isFromRepo: true,       // ⭐ wichtig
          path: fullPath          // ⭐ wichtig
        },
        dragHandle: ".doc-node__header"
      })

      // 3) Edge
      edges.push({
        id: `e-${id}-out`,
        source: id,
        target: "docOutput",
        targetHandle: `doc-${index}`
      })

      index++
    }



    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
      const id = uuid()
      const filename = file.path.split("/").pop()

      nodes.push({
        id,
        type: "figureNode",
        position: { x: 0, y: index * 120 },
        data: {
          kind: "figure",
          type: "figureNode",
          imageName: filename,
          latexLabel: filename,
          refLabel: filename,
          image: `data:image/png;base64,${file.content}`,
          isFromRepo: true   // ⭐ WICHTIG
        }
      })


      edges.push({
        id: `e-${id}-out`,
        source: id,
        target: "docOutput",
        targetHandle: `doc-${index}`
      })

      index++
    }

  }

  // ⭐ Jetzt ALLES auf einmal setzen
  setNodes(nodes)
  setEdges(edges)

  console.log("[AppEditor] Repo vollständig geladen:", files.length)

  currentRepo.value = {
    owner: repo.owner,
    name: repo.name,
    branch: repo.default_branch ?? "main"
  }
}

console.log('[AppEditor] setting up editor-open-file listener')

function exportEditorToFiles() {
  const files = []

  for (const node of nodes.value) {

    // ⭐ ParagraphNodes → .tex
    if (node.type === "textArea") {

      // ⭐ Voller Pfad aus der Node holen
      const fullPath = node.data.path ?? node.data.label

      // ⭐ Sicherstellen, dass .tex dran hängt
      const filePath = fullPath.endsWith(".tex")
          ? fullPath
          : `${fullPath}.tex`

      files.push({
        path: filePath,   // ⭐ voller Pfad, nicht nur Dateiname!
        content: btoa(node.data.value ?? "")
      })

      continue
    }

    // ⭐ FigureNodes → .png
    if (node.type === "figureNode") {

      const name = node.data.imageName
      const direct = node.data.image
      const cached = name && imageCache.value?.[name]?.base64

      if (!direct && !cached) continue

      // ⭐ Ordner entfernen → nur Dateiname behalten
      const fileName = name.split("/").pop()

      const src = direct ?? cached
      const base64 = src.replace(/^data:image\/\w+;base64,/, "")

      files.push({
        path: fileName,   // ⭐ landet IMMER im Root
        content: base64
      })
    }

  }

  return files
}


async function saveCurrentRepoToGit() {
  if (!currentRepo.value) {
    alert("Kein Repository geöffnet.")
    return
  }

  const token = localStorage.getItem("token")

  // Hilfsfunktion: Originalpfad wiederfinden
  function findOriginalPath(fileName, repoPaths) {
    return repoPaths.find(p => p.endsWith("/" + fileName)) ?? fileName
  }

  // ⭐ 1. Dateien aus dem Editor exportieren
  const editorFiles = exportEditorToFiles()
  const editorPaths = editorFiles.map(f => f.path)

  // ⭐ 2. Dateien aus dem Repo (beim Laden gespeichert)
  const repoPaths = currentRepoFiles.value

  // ⭐ 3. Vergleich
  const editorFileNames = editorPaths.map(p => p.split("/").pop())

  const toDelete = repoPaths.filter(repoPath => {
    const repoFileName = repoPath.split("/").pop()
    return !editorFileNames.includes(repoFileName)
  })

  // Nur Dateinamen vergleichen
  const repoFileNames = repoPaths.map(p => p.split("/").pop())

  const toCreate = editorFiles.filter(f => {
    const editorFileName = f.path.split("/").pop()
    return !repoFileNames.includes(editorFileName)
  })

  const toUpdate = editorFiles.filter(f => {
    const editorFileName = f.path.split("/").pop()
    return repoFileNames.includes(editorFileName)
  })

  console.log("DELETE:", toDelete)
  console.log("CREATE:", toCreate)
  console.log("UPDATE:", toUpdate)

  // ⭐ 4. Dateien löschen
  for (const path of toDelete) {
    await fetch("http://localhost:3000/github/delete-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        owner: currentRepo.value.owner,
        repo: currentRepo.value.name,
        path
      })
    })
  }

  // ⭐ 5. Dateien erstellen
  for (const file of toCreate) {

    // ⭐ ORIGINALPFAD WIEDERHERSTELLEN
    const fileName = file.path.split("/").pop()
    const originalPath = findOriginalPath(fileName, repoPaths)

    await fetch("http://localhost:3000/github/create-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        owner: currentRepo.value.owner,
        repo: currentRepo.value.name,
        path: originalPath,   // ⭐ WICHTIG
        base64: file.content
      })
    })
  }

  // ⭐ 6. Dateien aktualisieren
  for (const file of toUpdate) {

    const fileName = file.path.split("/").pop()
    const originalPath = findOriginalPath(fileName, repoPaths)

    const isImage = /\.(png|jpg|jpeg)$/i.test(fileName)

    if (isImage) {
      await fetch("http://localhost:3000/github/update-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          owner: currentRepo.value.owner,
          repo: currentRepo.value.name,
          path: originalPath,   // ⭐ WICHTIG
          base64: file.content
        })
      })
    } else {
      await fetch("http://localhost:3000/github/save-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          owner: currentRepo.value.owner,
          repo: currentRepo.value.name,
          path: originalPath,   // ⭐ WICHTIG
          content: atob(file.content)
        })
      })
    }
  }

  alert("Änderungen erfolgreich in Git gespeichert!")

  // ⭐ 7. Repo-Dateiliste aktualisieren
  currentRepoFiles.value = files.map(f => f.path)

}



async function createNewRepository() {
  const name = prompt("Name des neuen Repositories:")
  if (!name) return

  const token = localStorage.getItem("token")

  const res = await fetch("http://localhost:3000/github/create-repo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  })

  if (!res.ok) {
    alert("Fehler beim Erstellen des Repositories.")
    return
  }

  alert("Repository erfolgreich erstellt!")
}

onMounted(() => {
  window.addEventListener("editor-git-action", onGitAction)
})

onBeforeUnmount(() => {
  window.removeEventListener("editor-git-action", onGitAction)
})

async function onGitAction(e: CustomEvent) {
  const action = e.detail

  if (action === "save-to-git") {
    await saveCurrentRepoToGit()
  }

  if (action === "create-repo") {
    await createNewRepository()
  }
}

window.addEventListener("editor-open-file", async (e: any) => {
  console.log('[AppEditor] editor-open-file received:', e.detail)

  const file = e.detail
  const token = localStorage.getItem("token")

  if (!token) {
    console.warn('[AppEditor] no token, aborting')
    return
  }

  // -------------------------
  // TEXTDATEIEN
  // -------------------------
  if (file.type === "txt") {
    const res = await fetch(
        `http://localhost:3000/github/file?owner=${file.repo.owner.login}&repo=${file.repo.name}&path=${file.path}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    addParagraphNode(data.content, file.path)
    return
  }

  // -------------------------
  // ÖFFENTLICHE BILDER
  // -------------------------
  if (file.type === "public-image") {
    addFigureNode(file.url, file.path)
    return
  }

  // -------------------------
  // PRIVATE BILDER
  // -------------------------
  if (file.type === "private-image") {
    const res = await fetch(
        `http://localhost:3000/github/file?owner=${file.repo.owner.login}&repo=${file.repo.name}&path=${file.path}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    const base64Url = `data:image/png;base64,${data.content}`
    addFigureNode(base64Url, file.path)
    return
  }
})


console.log("[AppEditor] setting up upload listeners")

// JSON IMPORT
window.addEventListener("editor-load-json", (e: any) => {
  console.log("[AppEditor] editor-load-json received")

  try {
    const json = JSON.parse(e.detail)
    if (!json.nodes || !json.edges) {
      console.warn("[AppEditor] invalid JSON format")
      return
    }

    nodes.value = json.nodes
    edges.value = json.edges
    doc.value = json.doc ?? []

    console.log("[AppEditor] JSON loaded:", nodes.value.length, "nodes")
  } catch (err) {
    console.error("[AppEditor] JSON parse error", err)
  }
})

window.addEventListener("editor-load-zip", async (e: any) => {
  console.log("[AppEditor] editor-load-zip received:", e.detail)
  const file = e.detail as File

  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  const files: any[] = []

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue

    if (entry.name.endsWith(".tex")) {
      files.push({
        path: entry.name,
        type: "tex",
        content: await entry.async("string")
      })
    } else if (entry.name.endsWith(".bib")) {
      files.push({
        path: entry.name,
        type: "bib",
        content: await entry.async("string")
      })
    } else if (/\.(png|jpe?g|gif|svg|pdf)$/i.test(entry.name)) {
      const base64 = await entry.async("base64")
      const ext = entry.name.split(".").pop() || "png"
      files.push({
        path: entry.name,
        type: "image",
        content: `data:image/${ext};base64,${base64}`
      })
    } else {
      files.push({
        path: entry.name,
        type: "other",
        content: await entry.async("string")
      })
    }
  }

  const mainTex = files.find(f => f.path.endsWith("main.tex"))?.path
  if (!mainTex) {
    console.warn("[AppEditor] No main.tex found in ZIP")
    return
  }

  let parsed
  try {
    parsed = parseOverleafZip(files, mainTex, imageCache)
  } catch (err) {
    console.error("[AppEditor] ZIP parsing failed:", err)
    return
  }

  nodes.value = parsed.nodes
  edges.value = parsed.edges
  doc.value = parsed.doc ?? []


  console.log("[AppEditor] VueFlow nodes after assignment:", nodes.value)
  console.log("[AppEditor] ZIP import complete:", nodes.value.length, "nodes")
})



// START EMPTY PROJECT
window.addEventListener("editor-start-empty", () => {
  console.log("[AppEditor] editor-start-empty received")

  nodes.value = []
  edges.value = []
  doc.value = []

  console.log("[AppEditor] Editor cleared")
})

// START DEMO
window.addEventListener("editor-start-demo", () => {
  console.log("[AppEditor] editor-start-demo received")

  demoActive.value = true

  if (typeof startDemo === "function") {
    startDemo()
  } else {
    console.warn("[AppEditor] startDemo() not found")
  }
})

window.addEventListener("editor-git-action", async (e: any) => {
  const action = e.detail

  switch (action) {
    case "save-text":
      await saveCurrentText()
      break

    case "upload-image":
      await uploadImageFile()
      break

    case "update-image":
      await updateCurrentImage()
      break

    case "create-file":
      await createNewFile()
      break

    case "delete-file":
      await deleteCurrentFile()
      break
  }
})



const snapshots = ref<Snapshot[]>([])
provide('snapshots', snapshots)

export type Language = 'en' | 'de'
const language = ref<Language>('en')
provide('language', language)

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
provide('nodes', nodes)
provide('edges', edges)

const bibliography = ref<BibEntry[]>([])
provide('bibliography', bibliography)
const updateBibliography = (newBib: BibEntry[]) => {bibliography.value = newBib}
provide('updateBibliography', updateBibliography)

const TLDR = ref(false)
provide('TLDR', TLDR)

const demoActive = ref(false)
provide('demoActive', demoActive)

const templates = ref([])

provide('styleTemplates', templates)
provide('setStyleTemplates', (newList) => {
  templates.value = newList
})

const snapshotInProgress = ref(false)
provide('snapshotInProgress', snapshotInProgress)

const designMode = ref<'standard' | 'disco'>('standard')
provide('designMode', designMode)
let discoInterval: number | undefined


const {
  addNodes,
  setNodes,
  setEdges,
  updateEdge,
  addEdges,
  screenToFlowCoordinate,
  dimensions
} = useVueFlow()


const {
  startDemo,
  nextStep,
  skipDemo
} = useDemo({
  demoActive,
  nodes,
  setNodes,
  setEdges,
  addNodes,
  screenToFlowCoordinate,
  dimensions
})


const edgeMenu = ref<{
  visible: boolean
  x: number
  y: number
  edge: Edge | null
}>({
  visible: false,
  x: 0,
  y: 0,
  edge: null,
})


let nodeCounter = 0

const allowedSourceTypes = ['textArea', 'grammar', 'paraphrase', 'edit']

const canInsertNodes = computed(() => {
  if (!edgeMenu.value.edge) return false
  const sourceNode = nodes.value.find(n => n.id === edgeMenu.value.edge!.source)
  if (!sourceNode) return false
  return allowedSourceTypes.includes(sourceNode.type)
})


function onEdgeClick(event: EdgeMouseEvent) {
  event.event.stopPropagation() // das eigentliche MouseEvent
  const edge = event.edge

  edgeMenu.value = {
    visible: true,
    x: event.event.clientX,
    y: event.event.clientY,
    edge,
  }
}

function closeEdgeMenu() {
  edgeMenu.value.visible = false
}


function onConnect(connection: Connection) {
  edges.value = addEdge(
      {
        ...connection,
        animated: true,
        style: { strokeWidth: 4 },
        interactionWidth: 20,
        markerEnd: { type: 'arrowclosed', color: '#000000', width: 6, height: 6,},
      },
      edges.value
  ) as Edge[]
}


function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData('node/type')
  if (!type) return

  const template = findNodeTemplate(type)
  if (!template) return

  nodeCounter++
  const id = `node-${nodeCounter}`
  const baseLabel = template?.label ?? `Node ${id}`

  // Copy template data so the original definition stays unchanged.
  const data: Node['data'] =
      template?.data && typeof template.data === 'object'
          ? { ...template.data }
          : { label: baseLabel }

  // Guarantee that the node shows a label if the template forgot to set one.
  if (data && typeof data === 'object' && !('label' in data)) {
    ;(data as Record<string, unknown>).label = baseLabel
  }

  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  const newNode: Node = {
    id: `${template?.type ?? 'node'}-${id}`,
    type: template?.type,
    position,
    data,
    dragHandle: '.doc-node__header'
  }
  addNodes([newNode])
}


function onEdgeUpdate({ edge, connection }) {
  updateEdge(edge, connection)
}

function deleteEdge() {
  if (!edgeMenu.value.edge) return

  edges.value = edges.value.filter(
      e => e.id !== edgeMenu.value.edge!.id
  )
  closeEdgeMenu()
}


function insertNodeOnEdge(templateType: string) {
  if (!edgeMenu.value.edge) return;
  const edge = edgeMenu.value.edge;

  const template = findNodeTemplate(templateType);
  if (!template) return;

  const sourceNode = nodes.value.find(n => n.id === edge.source);
  const targetNode = nodes.value.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) return;

  // Mittige Position zwischen Source und Target
  const newX = (sourceNode.position.x + targetNode.position.x) / 2;
  const newY = (sourceNode.position.y + targetNode.position.y) / 2;

  // Neue Node-ID
  nodeCounter++;
  const newNodeId = `node-${nodeCounter}`;

  // Node aus Template kopieren
  const newNode: Node = {
    id: newNodeId,
    type: template.type,
    position: { x: newX, y: newY },
    data: template.data ? { ...template.data } : { label: template.label },
    dragHandle: '.doc-node__header'
  };

  addNodes([newNode]);

  // Alte Edge löschen
  edges.value = edges.value.filter(e => e.id !== edge.id);

  // Default Handles definieren

  const oldSourceHandle = edge.sourceHandle ?? 'output';
  const oldTargetHandle = edge.targetHandle ?? 'input';

  // Neue Edges erstellen
  const newEdges: Edge[] = [
    {
      id: `edge-${edge.source}-${newNodeId}-${Date.now()}`,
      source: edge.source,
      target: newNodeId,
      sourceHandle: oldSourceHandle,
      targetHandle: 'input', // neuer Node erhält 'input'
      animated: true,
      style: { strokeWidth: 4 },
      markerEnd: { type: 'arrowclosed', color: '#000', width: 6, height: 6 },
    },
    {
      id: `edge-${newNodeId}-${edge.target}-${Date.now()}`,
      source: newNodeId,
      target: edge.target,
      sourceHandle: 'output',   // neuer Node liefert an alte Edge
      targetHandle: oldTargetHandle,
      animated: true,
      style: { strokeWidth: 4 },
      markerEnd: { type: 'arrowclosed', color: '#000', width: 6, height: 6 },
    },
  ];


  edges.value.push(...newEdges);

  closeEdgeMenu();
}

function startDiscoEdges() {
  // Sicherheit: kein doppeltes Interval
  if (discoInterval) return

  discoInterval = window.setInterval(() => {
    edges.value = edges.value.map(edge => {
      const hue = Math.floor(Math.random() * 360)
      const color = `hsl(${hue}, 100%, 50%)`

      return {
        ...edge,
        style: {
          ...(edge.style ?? {}),
          stroke: color,
          strokeWidth: 4,
          transition: 'stroke 0.4s linear',
        },
        markerEnd: {
          ...(edge.markerEnd ?? {}),
          color,
        },
      }
    })
  }, 400) // 🎛️ Tempo (300–600ms fühlt sich gut an)
}


function stopDiscoEdges() {
  if (!discoInterval) return

  clearInterval(discoInterval)
  discoInterval = undefined

  edges.value = edges.value.map(edge => ({
    ...edge,
    animated: true,
    interactionWidth: 20,
    style: {
      strokeWidth: 4
      ,
    },
    markerEnd: { type: 'arrowclosed', color: '#000', width: 6, height: 6 },
  }))
}

// Sucht im Speicher nach der Mail, sonst Standardtext
const userEmail = ref(localStorage.getItem('userEmail') || 'Nicht angemeldet');

// Stellt die Variable für alle anderen Komponenten (wie Profile.vue) bereit
provide('userEmail', userEmail);


watch(nodes, (newNodes) => {
  const usedRefLabels = new Set(newNodes
      .filter(n => n.type === 'figureNode')  // nur Figure Nodes
      .map(n => n.data?.refLabel)
      .filter(Boolean) as string[]
  )})

watch(designMode, (mode) => {
  if (mode === 'disco') {
    startDiscoEdges()
  } else {
    stopDiscoEdges()
  }
})

onUnmounted(() => {
  if (discoInterval) {
    clearInterval(discoInterval)
  }
})


defineExpose({
  loadEntireRepo
})


</script>

<template>
  <StartupPanelContent />
  <div
      style="width: 100%; height: 100vh"
      class="app-root"
      :class="{ 'disco-mode': designMode === 'disco' }"
  >

    <SaveRestoreControls />

    <!-- Disco Mode -->
    <ul v-if="designMode === 'disco'" class="strand">
      <li v-for="i in 100" :key="i"></li>
    </ul>

    <div v-if="designMode === 'disco'" class="disco-reflections">
      <span
          v-for="i in 160"
          :key="i"
          class="reflection"
          :style="{
            '--rx': Math.random() * 100,
            '--ry': Math.random() * 100
          }"
      />
    </div>

    <!-- Edge Menu -->
    <div
        v-if="edgeMenu.visible"
        class="edge-toolbar"
        :style="{ top: `${edgeMenu.y}px`, left: `${edgeMenu.x}px` }"
    >
      <button class="delete-btn" @click="deleteEdge">🗑️</button>

      <template v-if="canInsertNodes">
        <button @click="insertNodeOnEdge('edit')">Insert Edit Node</button>
        <button @click="insertNodeOnEdge('paraphrase')">Insert Paraphrase Node</button>
        <button @click="insertNodeOnEdge('grammar')">Insert Grammar Node</button>
      </template>
    </div>

    <div v-if="snapshotInProgress" class="screenshot-overlay"></div>

    <!-- VueFlow Canvas -->
    <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        @connect="onConnect"
        @drop="onDrop"
        @dragover.prevent
        :edgesUpdatable="true"
        @edge-update="onEdgeUpdate"
        @edge-click="onEdgeClick"
        @pane-click="closeEdgeMenu"
    >

      <!-- Node Templates -->
      <template #node-textArea="p"><TextAreaNode v-bind="p" /></template>
      <template #node-textView="p"><TextViewNode v-bind="p" /></template>
      <template #node-paraphrase="p"><ParaphraseNode v-bind="p" /></template>
      <template #node-compose="p"><ComposeNode v-bind="p" /></template>
      <template #node-docOutput="p"><DocOutputNode v-bind="p" /></template>
      <template #node-edit="p"><EditNode v-bind="p" /></template>
      <template #node-grammar="p"><GrammarNode v-bind="p" /></template>
      <template #node-stickyNote="p"><StickyNote v-bind="p" /></template>
      <template #node-figureNode="p"><FigureNode v-bind="p" /></template>
      <template #node-tourGuide="p"><TourGuideNode v-bind="p" /></template>
      <template #node-magicLatex="p"><MagicLatexNode v-bind="p" /></template>

      <Background />
      <MiniMap zoomable pannable />

    </VueFlow>

  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
@import '@vue-flow/controls/dist/style.css';
@import '../main.css';

/* Hintergrundfarbe der MiniMap */
.vue-flow__minimap {
  background-color: #7c7c7e !important; /* hellgrau */
  border-radius: 8px;
  box-shadow: 0 0 8px rgba(0,0,0,0.1);
}

/* allgemeine Farbe und Umriss der Nodes */
.vue-flow__minimap-node {
  fill: #000000 !important;
  stroke: #000000 !important;
  stroke-width: 1.2;
  rx: 2; /* abgerundete Ecken bei Rechtecken */
}

/* wenn Node ausgewählt ist */
.vue-flow__minimap-node.selected {
  stroke: #000 !important;
  fill: #ff0000 !important; /* helles Gelb für Highlight */
}

.edge-toolbar {
  position: fixed;
  width: 100px;
  z-index: 1000;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 6px;

  background-color: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}

.edge-toolbar button {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(15,23,42,.15);
  background-color: rgba(99, 102, 241, 0.3); /* dunkleres Lila */
  color: #000000;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: background 0.2s;
}

.edge-toolbar button:hover {
  background-color: rgba(99, 102, 241, 0.5); /* etwas dunkler beim Hover */
}

/* Nur der Löschen-Button */
.edge-toolbar .delete-btn {
  background-color: #f87171; /* hellrot */
}

.edge-toolbar .delete-btn:hover {
  background-color: #dc2626; /* dunkleres Rot beim Hover */
}

/* Screenshot flash */
.screenshot-overlay {
  position: fixed;
  inset: 0;
  background: white;
  opacity: 0.9;
  z-index: 99999; /* über allem */
  pointer-events: none;
  animation: flash 0.3s ease-in-out;
}

@keyframes flash {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}



/* Disco Mode */


body{
}
.strand{
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  position: absolute;
  z-index: 1;
  margin: -15px 0 0 0;
  padding: 0;
  pointer-events: none;
  width: 100%;
}
.strand li{
  position: relative;
  -webkit-animation-fill-mode: both;
  animation-fill-mode: both;
  -webkit-animation-iteration-count: infinite;
  animation-iteration-count: infinite;
  list-style: none;
  margin: 0;
  padding: 0;
  display: block;
  width: 12px;
  height: 28px;
  border-radius: 50%;
  margin: 20px;
  display: inline-block;
  background:#f02241;
  box-shadow: 0px 4.66667px 24px 3px #f02241;
  -webkit-animation-name: flash-1;
  animation-name: flash-1;
  -webkit-animation-duration: 2s;
  animation-duration: 2s;
}
.strand li:nth-child(2n+1){
  background: #22ff00;
  box-shadow: 0px 4.66667px 24px 3px rgba(0, 255, 255, 0.5);
  -webkit-animation-name: flash-2;
  animation-name: flash-2;
  -webkit-animation-duration: 0.4s;
  animation-duration: 0.4s;
}
.strand li:nth-child(4n+2){
  background: #dfff33;
  box-shadow: 0px 4.66667px 24px 3px #fd7a35;
  -webkit-animation-name: flash-3;
  animation-name: flash-3;
  -webkit-animation-duration: 1.1s;
  animation-duration: 1.1s;
}
.strand li:nth-child(odd){
  -webkit-animation-duration: 1.8s;
  animation-duration: 1.8s;
}
.strand li:nth-child(3n+1){
  -webkit-animation: 1.4s;
  animation-duration: 1.4s;
}
.strand li:before{
  content: "";
  position: absolute;
  background: #222;
  width: 10px;
  height: 9.33333px;
  border-radius: 3px;
  top: -4.66667px;
  left: 1px;
}
.strand li:after{
  content: "";
  top: -14px;
  left: 9px;
  position: absolute;
  width: 52px;
  height: 18.66667px;
  border-bottom: solid #222 2px;
  border-radius: 50%;
}
.strand li:last-child:after{
  content: none;
}
.strand li:first-child{
  margin-left: 40px;
}
@-webkit-keyframes flash-1{
  0%, 100%{
    background: #f02241;
    box-shadow: 0px 4.66667px 24px 3px #f02241;
  }
  50%{
    background: rgba(240, 34, 65, 0.4);
    box-shadow: 0px 4.66667px 24px 3px rgba(240, 35, 65, .02);
  }
}
@keyframes flash-1{
  0%,
  100% {
    background: #f02241;
    box-shadow: 0px 4.66667px 24px 3px #f02241;
  }
  50% {
    background: rgba(240, 34, 65, 0.4);
    box-shadow: 0px 4.66667px 24px 3px rgba(240, 35, 65, 0.2);
  }
}
@-webkit-keyframes flash-2{
0,  100%
{
  background: #42b261;
  box-shadow: 0px 4.66667px 24px 3px #42b261;
}
50%{
  background: rgba(66, 178, 97, 0.4);
  box-shadow: 0px 4.6667px 24px 3px rgba(66, 178, 97, 0.2);
}
}
@keyframes flash-2{
  0%,
  100% {
    background: #42b261;
    box-shadow: 0px 4.66667px 24px 3px #42b261;
  }
  50% {
    background: rgba(66, 178, 97, 0.4);
    box-shadow: 0px 4.66667px 24px 3px rgba(66, 178, 97, 0.2);
  }
}
@-webkit-keyframes flash-3 {
  0%,100%{
    background: #fd7a35;
    box-shadow: 0px 4.6667px 24px 3px #a318e1;
  }
  50%{
    background: rgba(249, 251, 238, .4);
    box-shadow: 0px 4.66667px 24px 3px rgba(249, 251, 238, .2);
  }
}

@keyframes flash-3 {
  0%,100% {
    background: #d700f1;
    box-shadow: 0px 4.66667px 24px 3px #c5ea00;
  }
  50% {
    background: rgba(249, 251, 238, 0.4);
    box-shadow: 0px 4.66667px 24px 3px rgba(249, 251, 238, 0.2);
  }
}

.disco-mode .vue-flow__viewport {
  background-color: rgb(0, 0, 0);
}

.vue-flow__pane,
.vue-flow__viewport {
  transition: background-color 0.4s ease;
}

.disco-mode .vue-flow__minimap {
  box-shadow:
      0 0 20px rgba(255, 0, 255, 0.77),
      0 0 40px rgba(0, 255, 255, 0.84);
}


/* ===============================
   🪩 Discoball Wall Reflections
   =============================== */

.disco-reflections {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;

  /* langsame Gesamtrotation */
  animation: disco-rotate 18s linear infinite;
}

/* Einzelne Lichtpunkte */
.disco-reflections .reflection {
  position: absolute;

  width: 6px;
  height: 6px;
  border-radius: 50%;

  opacity: 0.8;
  background: currentColor;

  box-shadow:
      0 0 6px currentColor,
      0 0 12px currentColor;

  animation:
      disco-flicker 2.5s ease-in-out infinite,
      disco-slide 12s linear infinite;
}

/* Farben wie echte Discokugel */
.disco-reflections .reflection:nth-child(4n) { color: #ffffff; }
.disco-reflections .reflection:nth-child(4n+1) { color: #00ffff; }
.disco-reflections .reflection:nth-child(4n+2) { color: #ff00ff; }
.disco-reflections .reflection:nth-child(4n+3) { color: #ffff66; }

/* Zufällige Startpositionen */
.disco-reflections .reflection {
  top: calc(var(--ry) * 1vh);
  left: calc(var(--rx) * 1vw);
}

/* Leichtes horizontales Wandern */
@keyframes disco-slide {
  0% {
    transform: translateX(-30px);
  }
  50% {
    transform: translateX(30px);
  }
  100% {
    transform: translateX(-30px);
  }
}

/* Funkeln */
@keyframes disco-flicker {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* Gesamtdrehung wie Discokugel */
@keyframes disco-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

</style>