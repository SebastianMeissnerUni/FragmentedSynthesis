import { inject, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import type { BibEntry } from '@/App.vue'

// ⭐ Ganz oben in der Datei einfügen
function normalizeImageName(name: string) {
    const parts = name.split(".");
    const ext = parts.pop();                // "png"
    const base = parts.join(".");           // "llm_prototyp"

    const cleanBase = base
        .replace(/\s+/g, "_")
        .replace(/[()]/g, "")
        .replace(/[^a-zA-Z0-9_\-]/g, "")
        .toLowerCase();

    return `${cleanBase}.${ext.toLowerCase()}`;
}


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
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result as string);

                // 1) Graph leeren
                setNodes([]);
                setEdges([]);
                await nextTick();

                // 2) Cache leeren
                imageCache.value = {};

                // 3) Graph laden
                fromObject(data);
                await nextTick();

                // 4) VueFlow braucht einen Tick, um Nodes zu erzeugen
                await new Promise(resolve => setTimeout(resolve, 50));

                // 5) Jetzt die echten Nodes reparieren
                nodes.value.forEach((vueNode: any) => {
                    const d = vueNode.data;

                    // Hat das Node ein Base64-Bild?
                    if (d?.image && typeof d.image === "string") {

                        // Bildname normalisieren
                        const rawName = d.imageName || ("image_" + vueNode.id);
                        const normalizedName = normalizeImageName(rawName);

                        // In Cache schreiben
                        imageCache.value[normalizedName] = {
                            base64: d.image,
                            imageName: normalizedName,
                            refLabel: d.refLabel,
                            latexLabel: d.latexLabel,
                        };

                        // Node aktualisieren
                        vueNode.data.imageName = normalizedName;
                        vueNode.data.image = d.image; // wichtig für ZIP
                    }
                });

                // 6) Restliche Daten
                if (data.bibliography) bibliography.value = data.bibliography;
                if (data.templates && setTemplates) setTemplates(data.templates);
                if (data.snapshots && snapshots) snapshots.value = data.snapshots;
                if (typeof data.TLDR === 'boolean') TLDR.value = data.TLDR;

            } catch (err) {
                console.error('Restore failed', err);
            }
        };

        reader.readAsText(file);
    }
    return {
        saveToFile,
        restoreFromFile,
    }
}
