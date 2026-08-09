import {nextTick, ref, watch} from 'vue'
import type { Ref } from 'vue'
import type { Node } from '@vue-flow/core'
import type { VueFlowStore } from '@vue-flow/core'

interface DemoOptions {
    demoActive: Ref<boolean>
    nodes: Ref<Node[]>
    setNodes: VueFlowStore['setNodes']
    setEdges: VueFlowStore['setEdges']
    addNodes: VueFlowStore['addNodes']
    screenToFlowCoordinate: VueFlowStore['screenToFlowCoordinate']
    dimensions: VueFlowStore['dimensions']
}

export function useDemo({
                            demoActive,
                            nodes,
                            setNodes,
                            setEdges,
                            addNodes,
                            screenToFlowCoordinate,
                            dimensions
                        }: DemoOptions) {

    const currentStep = ref(0)

    // --------------------------------------------------
    // Helper: Spawn Steve for current step
    // --------------------------------------------------
    function spawnStepNode(
        x: number,
        y: number,
        content: string,
        replaceCanvas = false
    ) {
        if (!dimensions.value) return

        const position = screenToFlowCoordinate({ x, y })

        const steve: Node = {
            id: `tourguide-${currentStep.value}`,
            type: 'tourGuide',
            position,
            data: {
                label: 'Steve',
                value: content
            },
            dragHandle: '.doc-node__header'
        }

        if (replaceCanvas) {
            // Nur für frühe Schritte
            setNodes([steve])
        } else {
            // Ab Step 2: User-Nodes behalten
            setNodes(ns => [
                ...ns.filter(n => n.type !== 'tourGuide'),
                steve
            ])
        }
    }


    // --------------------------------------------------
    // Steps
    // --------------------------------------------------
    const steps: (() => void)[] = [

        // STEP 0 – Welcome (manual)
        () => {
            spawnStepNode(
                dimensions.value!.width / 2,
                dimensions.value!.height / 2,
                `👋 Hey! I'm Steve the StickyNote.

Fragmented Synthesis lets you build documents
from connected fragments instead of linear text.

Click “Next” when you're ready.`, true
            )
        },

        // STEP 1 – Controls (manual)
        () => {
            spawnStepNode(
                200,
                100,
                `This is the control bar.

This top bar features a set of dropdown menus, nodes, and overviews.

I am going to explain every menu, node, and setting to you. This won't take long, so don't worry.

Click “Next Step” to get started.`, true
            )
        },

        // STEP 2 – Core document nodes (automatic)
        () => {
            spawnStepNode(
                200,
                400,
                `Let’s get started with the first dropdown menu.

Please click on "Tools".

Here you see six symbols:

⭯ reloads the web app. Be careful, because it can wipe out your nodes if you didn’t save before.

💾 saves your document as a JSON file.

📂 lets you upload your JSON files.

🗑️ deletes nodes. If you hold Ctrl and click on nodes, you will see the highlighted nodes in your minimap.
If you press this button after marking them, they will be deleted.

🔮 sorts your nodes. If you are having a hard time seeing all nodes, or if one node overlaps another, just press this button and everything will be sorted nicely.

🕙 lets you manually save a state to jump back to later using the time machine.
But I am going to explain the time machine feature to you when we get to it.
`
            )
        },

        // STEP 3 – Document Output (automatic)
        () => {
            spawnStepNode(
                500,
                300,
                `Now we get to one of the core things in this web app, the Content menu.

You will find most of the important nodes here.

Here you see four different nodes:

Paragraph: Here you can write your text, add citations, and reference images.

LaTeX Code: Here you can enter your generic LaTeX content or code.

Images: This node is for your images/figures. You can add a caption or reference and upload your pictures directly from your device.

Title: This creates a Compose node. With it, you can set titles in sections if you connect a paragraph or figure node.
 `

            )
        },

        // STEP 4 – LLM Nodes (automatic)
        () => {
            spawnStepNode(
                500,
                500,
                `The next step is the LLM dropdown menu.

The following nodes help you refine text:
Edit, Paraphrase, and Grammar.

With AI Settings, you can create your own template for the answers you get from the LLM nodes or the TLDR mode.

TLDR activates the TLDR mode for almost all nodes.

You can also activate the TLDR function for a single node with the TLDR slider above the node when you click on it.

If you want to change the output language of the LLM, you can switch from English to German in the top right corner.
`
            )
        },

        // STEP 5 – Finish
        () => {
            spawnStepNode(
                dimensions.value!.width / 2,
                dimensions.value!.height / 2,
                `Now there are just two more nodes to explain in the top bar.

Stickynode is just for your thoughts, reminders, or notes for yourself.

And the last node I am going to explain to you is the Document Output.

This node is your final output. You have to connect your nodes, like Paragraph or Images, to it in order to create your whole text.

After you have connected everything you need, you can export it easily as ZIP, TEX, or open it directly in Overleaf.
`
            )

            //demoActive.value = false
        },

        () => {
            spawnStepNode(
                500,
                500,
                `This is the last step.

If you click on Bibliography, you can add your references and paste your BibTeX entries. It gives you an overview of your bibliography.

Images shows you all the figures/images you currently have after you uploaded something in a figure node.

And the last feature is the Time Machine. You remember this symbol 🕙 in the Tools dropdown, right?

You can press it and save the state of the canvas. If you changed something you didn’t want to change and it would take too much time to get the canvas back to its previous state, you can simply click on Time Machine and restore the state. It will autosave every few minutes, so don’t worry if you didn’t press it and still want to go back in time.

And that’s it — you are done. Try things out and have fun. Press “End Demo” to return to the canvas and start your first project.
`
            )
        }

    ]

    // --------------------------------------------------
    // Step control
    // --------------------------------------------------
    function executeStep(stepIndex: number) {
        const step = steps[stepIndex]
        if (!step || !demoActive.value) return
        step()
    }

    function startDemo() {
        demoActive.value = true
        currentStep.value = 0
        executeStep(0)
    }

    function nextStep() {
        if (currentStep.value + 1 < steps.length) {
            currentStep.value++
            executeStep(currentStep.value)
        }
    }

    function skipDemo() {
        demoActive.value = false
        currentStep.value = 0

        // Canvas vollständig zurücksetzen
        setNodes([])
        setEdges([])

        nextTick(() => {
            const flow = document.querySelector('.vue-flow') as any
            if (flow?.__vueFlow) {
                flow.__vueFlow.setViewport({ x: 0, y: 0, zoom: 1 })
            }
        })
    }



    // --------------------------------------------------
// Watcher: automatic progression
// --------------------------------------------------
// watch(
//     () => nodes.value.map(n => n.type),
//     () => {
//         if (!demoActive.value) return
//
//         // STEP 2 → STEP 3
//         if (currentStep.value === 2) {
//             const required = ['textArea', 'magicLatex', 'figure', 'compose']
//             const hasAll = required.every(t => nodes.value.some(n => n.type === t))
//             if (hasAll) {
//                 currentStep.value++
//                 executeStep(currentStep.value)
//             }
//         }
//
//         // STEP 3 → STEP 4
//         if (currentStep.value === 3) {
//             if (nodes.value.some(n => n.type === 'docOutput')) {
//                 currentStep.value++
//                 executeStep(currentStep.value)
//             }
//         }
//
//         // STEP 4 → STEP 5
//         if (currentStep.value === 4) {
//             const llmTypes = ['edit', 'paraphrase', 'grammar']
//             if (llmTypes.some(t => nodes.value.some(n => n.type === t))) {
//                 currentStep.value++
//                 executeStep(currentStep.value)
//             }
//         }
//     },
//     { deep: true }
// )

    return {
        startDemo,
        nextStep,
        skipDemo
    }
}
