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
    console.log("[ZIP] RAW TEX LENGTH:", tex.length)

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
                    kind: "figure",
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
        // 4A. Paragraphs erkennen: \paragraph{}TEXT
        //
        const latexParagraphRegex = /\\paragraph\{[^}]*\}\s*([^\n]+)/g
        let pmatch

        while ((pmatch = latexParagraphRegex.exec(tex))) {
            const text = pmatch[1].trim()
            if (!text) continue

            const id = uuid()

            console.log("[ZIP] Found LaTeX paragraph:", text)

            nodes.push({
                id,
                type: "textView",
                position: { x: 0, y: 0 },
                data: {
                    label: "Paragraph",
                    text
                },
                dragHandle: ".doc-node__header"
            })
        }

        //
        // 4B. Normale Absätze erkennen (falls vorhanden)
        //
        const rawParagraphs = tex
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p =>
                p.length > 0 &&
                !p.startsWith("\\") &&
                !p.includes("\\includegraphics") &&
                !p.includes("\\centering") &&
                !p.includes("\\caption") &&
                !p.includes("\\section") &&
                !p.includes("\\subsection") &&
                !p.includes("\\subsubsection")
            )

        console.log("[ZIP] Normal paragraphs found:", rawParagraphs.length)

        for (const p of rawParagraphs) {
            const id = uuid()

            nodes.push({
                id,
                type: "textView",
                position: { x: 0, y: 0 },
                data: {
                    label: "Paragraph",
                    text: p
                },
                dragHandle: ".doc-node__header"
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

                if (img.content.startsWith("data:image")) {
                    base64 = img.content
                } else if (/^[A-Za-z0-9+/=]+$/.test(img.content)) {
                    base64 = `data:image/${ext};base64,${img.content}`
                } else if (img.content instanceof Uint8Array) {
                    base64 = `data:image/${ext};base64,${btoa(
                        String.fromCharCode(...img.content)
                    )}`
                } else {
                    base64 = `data:image/${ext};base64,${btoa(img.content)}`
                }

                imageCache.value[cleanName] = {
                    base64,
                    latexLabel: filename,
                    refLabel: filename
                }
            })

        console.log("[ZIP] FINAL NODE COUNT:", nodes.length)
        console.log("[ZIP] FINAL EDGE COUNT:", edges.length)
        console.log("[ZIP] FINAL NODES:", nodes)

        return { nodes, edges }
    }
