import { inject, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import type { BibEntry } from '@/App.vue'

export function useLoadAndSave() {
    const {toObject, fromObject, setNodes, setEdges} = useVueFlow()

    const bibliography = inject<Ref<BibEntry[]>>('bibliography')!
    const TLDR = inject<Ref<boolean>>('TLDR')!
    const templates = inject<Ref<any[]>>('styleTemplates')!
    const setTemplates = inject<(list: any[]) => void>('setStyleTemplates')
    const imageCache = inject<Ref<ImageCache>>('imageCache')
    const snapshots = inject<Ref<any[]>>('snapshots')

    /* ---------------- SAVE ---------------- */

    async function saveToFile() {
        const flow = toObject()

        flow.imageCache = imageCache?.value ?? {}

        flow.nodes.forEach((node: any) => {
            const name = node.data?.imageName
            const entry = name && imageCache?.value[name]

            if (entry) {
                node.data.image = entry.base64
                node.data.refLabel = entry.refLabel
                node.data.latexLabel = entry.latexLabel
            } else {

                if (node.data?.image && typeof node.data.image !== "string") {
                    node.data.image = undefined
                }
            }
        })

        flow.bibliography = bibliography.value
        flow.TLDR = TLDR.value
        flow.templates = templates.value
        flow.snapshots = snapshots?.value ?? []

        const blob = new Blob([JSON.stringify(flow, null, 2)], {
            type: 'application/json',
        })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'graph.json'
        a.click()
        URL.revokeObjectURL(url)
    }



    /* ---------------- LOAD ---------------- */

    async function restoreFromFile(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) return

        const reader = new FileReader()

        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result as string)
                console.log("RESTORE CHECK — imageCache in file:", data.imageCache)


                // 1️⃣ Reset
                setNodes([])
                setEdges([])
                await nextTick()

                // 2) imageCache wiederherstellen
                if (data.imageCache && imageCache) {
                    imageCache.value = data.imageCache
                }

                // 3) Nodes reparieren
                data.nodes?.forEach((node: any) => {

                    if (node.data?.image && typeof node.data.image !== "string") {
                        node.data.image = undefined
                    }

                    if (node.data?.imageName && imageCache?.value[node.data.imageName]) {
                        node.data.image = imageCache.value[node.data.imageName].base64
                    }
                })



                // 4️⃣ Graph laden
                fromObject(data)
                await nextTick()

                // 5️⃣ Restliche Daten
                if (data.bibliography) bibliography.value = data.bibliography
                if (data.templates && setTemplates) setTemplates(data.templates)
                if (data.snapshots && snapshots) snapshots.value = data.snapshots
                if (typeof data.TLDR === 'boolean') TLDR.value = data.TLDR

            } catch (err) {
                console.error('Restore failed', err)
            }
        }

        reader.readAsText(file)
    }
    return {
        saveToFile,
        restoreFromFile,
    }
}
