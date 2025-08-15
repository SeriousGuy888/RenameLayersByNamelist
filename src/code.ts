// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 500 })
postSelectionCountUpdate()

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg: { type: string; names: string[] }) => {
	// One way of distinguishing between different types of messages sent from
	// your HTML page is to use an object with a "type" property like this.
	if (msg.type === "execute-bulk-rename") {
		const names = msg.names
		const nodes = getSortedSelection()

		const numOperations = Math.min(names.length, nodes.length)
		for (let i = 0; i < numOperations; i++) {
			const currName = names[i]
			const currNode = nodes[i]

			currNode.name = currName
		}

		figma.notify(`Renamed ${numOperations} layers.`)
	}

	// Make sure to close the plugin when you're done. Otherwise the plugin will
	// keep running, which shows the cancel button at the bottom of the screen.
	figma.closePlugin()
}

figma.on("selectionchange", postSelectionCountUpdate)

function postSelectionCountUpdate() {
	console.log(figma.currentPage.selection.map(({ id }) => id))

	const numSelected = figma.currentPage.selection.length
	figma.ui.postMessage({
		type: "selection-count-update",
		count: numSelected,
	})
}

/**
 * @returns The scene nodes in the current selection, sorted front to back (top to bottom in the layers panel UI).
 */
function getSortedSelection(): SceneNode[] {
	const selectionIds = new Set(
		figma.currentPage.selection.map((node) => node.id),
	)

	const ordered: SceneNode[] = []

	function walk(node: BaseNode) {
		if (selectionIds.has(node.id) && node.type !== "PAGE") {
			ordered.push(node as SceneNode)
			selectionIds.delete(node.id)
		}

		if (selectionIds.size === 0) {
			return
		}

		if ("children" in node) {
			// loop through node children in reverse order,
			// BECAUSE the `children` property lists the layers sorted back to front (bottom to top in layers panel ui)
			for (let i = node.children.length - 1; i >= 0; i--) {
				const child = node.children[i]
				walk(child)
			}
		}
	}

	// walk along the node hierarchy of the current page in a depth-first manner
	// and get the nodes in that order
	walk(figma.currentPage)

	return ordered
}
