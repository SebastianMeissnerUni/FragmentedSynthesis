import type { BibEntry } from '@/App.vue'

export function parseBibtex(text: string): BibEntry[] {
    const entries: BibEntry[] = []
    const blocks = text.split('@').slice(1)

    for (const block of blocks) {
        const typeEnd = block.indexOf('{')
        const type = block.slice(0, typeEnd).trim()

        const idEnd = block.indexOf(',')
        const id = block.slice(typeEnd + 1, idEnd).trim()

        const fieldsRaw = block.slice(idEnd + 1, block.lastIndexOf('}'))
        const fields: Record<string, string> = {}

        const lines = fieldsRaw.split('\n')
        for (const line of lines) {
            const parts = line.split('=')
            if (parts.length < 2) continue

            const key = parts[0].trim()
            const value = parts
                .slice(1)
                .join('=')
                .trim()
                .replace(/^{|},?$/g, '')

            fields[key] = value
        }

        entries.push({
            id,
            type,
            fields,
            raw: '@' + block.trim()
        })
    }

    return entries
}
