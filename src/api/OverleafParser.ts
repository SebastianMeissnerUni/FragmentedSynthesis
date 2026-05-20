import type { ZipFileEntry } from "@/App.vue"
import type { Node, Edge } from "@vue-flow/core"
import { v4 as uuid } from "uuid"

/**
 * Parsed Overleaf ZIP → Nodes + Edges
 */
export function parseOverleafZip(
    files: ZipFileEntry[],
    mainPath: string,
    imageCache: any
) {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // 1. main.tex finden
    const mainFile = files.find(f => f.path === mainPath)
    if (!mainFile || typeof mainFile.content !== "string") {
        console.error("No main.tex found")
        return { nodes: [], edges: [] }
    }

    const tex = mainFile.content

    //
    // 2. Sections erkennen
    //
    const sectionRegex = /\\section\{([^}]+)\}/g
    const subsectionRegex = /\\subsection\{([^}]+)\}/g
    const subsubRegex = /\\subsubsection\{([^}]+)\}/g

    let match

    while ((match = sectionRegex.exec(tex))) {
        const id = uuid()
        nodes.push({
            id,
            type: "compose",
            position: { x: 0, y: 0 },
            data: {
                json: JSON.stringify({
                    id,
                    kind: "section",
                    title: match[1],
                    level: 1,
                    children: []
                })
            }
        })
    }

    while ((match = subsectionRegex.exec(tex))) {
        const id = uuid()
        nodes.push({
            id,
            type: "compose",
            position: { x: 0, y: 0 },
            data: {
                json: JSON.stringify({
                    id,
                    kind: "section",
                    title: match[1],
                    level: 2,
                    children: []
                })
            }
        })
    }

    while ((match = subsubRegex.exec(tex))) {
        const id = uuid()
        nodes.push({
            id,
            type: "compose",
            position: { x: 0, y: 0 },
            data: {
                json: JSON.stringify({
                    id,
                    kind: "section",
                    title: match[1],
                    level: 3,
                    children: []
                })
            }
        })
    }

    //
    // 3. Figures erkennen
    //
    const figRegex = /\\includegraphics(?:\[.*?\])?\{images\/([^}]+)\}/g

        while ((match = figRegex.exec(tex))) {
            const filename = match[1]
            const id = uuid()

            nodes.push({
                id,
                type: "figureNode",
                position: { x: 0, y: 0 },
                data: {
                    imageName: filename,
                    latexLabel: filename,
                    refLabel: filename,
                    image: imageCache.value[
                        filename.replace(/\.(png|jpg|jpeg|svg|pdf)$/i, "")
                        ]?.base64
                }
            })


        }

        //
        // 4. Paragraphs erkennen (NACH Figures!)
        //
    const paragraphRegex =
        /(?:^|\n)\s*([^\\\n][^\n]*)(?=\n|$)/g

    while ((match = paragraphRegex.exec(tex))) {
        const text = match[1].trim()
        if (!text) continue

        if (text.startsWith("\\")) continue
        if (text.includes("\\includegraphics")) continue
        if (text.includes("\\centering")) continue
        if (text.includes("\\caption")) continue
        if (text.includes("\\section")) continue
        if (text.includes("\\subsection")) continue
        if (text.includes("\\subsubsection")) continue

        const id = uuid()

        nodes.push({
            id,
            type: "textArea",
            position: { x: 0, y: 0 },
            data: {
                value: text
            }
        })
    }


    //
        // 5. Output‑Node erzeugen
        //
        nodes.push({
            id: "docOutput",
            type: "docOutput",
            position: { x: 400, y: 100 },
            data: { label: "Document Output" }
        })

        //
        // 6. Edges erzeugen (alle → Output)
        //
        nodes
            .filter(n => n.id !== "docOutput")
            .forEach((n, i) => {
                edges.push({
                    id: `e-${n.id}-out`,
                    source: n.id,
                    target: "docOutput",
                    targetHandle: `doc-${i}`
                })
            })

        //
        // 7. Bilder in den Cache laden
        //
    files
        .filter(f => f.path.startsWith("images/"))
        .forEach(img => {
            const filename = img.path.replace("images/", "")
            const cleanName = filename.replace(/\.(png|jpg|jpeg|svg|pdf)$/i, "")
            const ext = filename.split('.').pop()

            let base64: string

            // Fall 1: content ist bereits ein data:image/...;base64 String
            if (img.content.startsWith("data:image")) {
                base64 = img.content
            }

            // Fall 2: content ist ein reiner Base64-String
            else if (/^[A-Za-z0-9+/=]+$/.test(img.content)) {
                base64 = `data:image/${ext};base64,${img.content}`
            }

            // Fall 3: content ist ein Uint8Array
            else if (img.content instanceof Uint8Array) {
                base64 = `data:image/${ext};base64,${btoa(
                    String.fromCharCode(...img.content)
                )}`
            }

            // Fall 4: content ist ein Binärstring
            else {
                base64 = `data:image/${ext};base64,${btoa(img.content)}`
            }

            imageCache.value[cleanName] = {
                base64,
                latexLabel: filename,
                refLabel: filename
            }
        })



    console.log("CACHE AFTER IMPORT:", JSON.stringify(imageCache.value, null, 2))




    return { nodes, edges }
    }
