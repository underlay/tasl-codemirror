import { EditorState } from "@codemirror/next/state"
import { Diagnostic } from "@codemirror/next/lint"
import { EditorView } from "@codemirror/next/view"
import { SyntaxNode } from "lezer-tree"

import { APG, ns } from "@underlay/apg"

import { defaultTypes } from "./stdlib.js"

const uriPattern = /^[a-z]+:[a-zA-Z0-9-/_.:#]+$/
const namespacePattern = /[#/]$/

export interface UpdateProps {
	state: EditorState
	schema: APG.Schema
	prefixes: Map<string, string>
}

export const schemaLinter = (onChange: (props: UpdateProps) => void) => (
	view: EditorView
): Diagnostic[] => {
	const tree = view.state.tree

	const diagnostics: Diagnostic[] = []

	const cursor1 = tree.cursor()
	const prefixes1 = new Map<string, string | null>()
	const prefixIds = new Map<number, [string, string | null]>()
	const labelKeys = new Set<string>()
	const ids = new Map<number, string>()

	do {
		if (cursor1.type.isError) {
			const { to, from } = cursor1
			const message = "Syntax error"
			diagnostics.push({ from, to, message, severity: "error" })
		} else if (cursor1.node.name === "Namespace") {
			const identifier = cursor1.node.getChild("Prefix")
			const uri = cursor1.node.getChild("Uri")
			let namespace: null | string = null
			if (uri !== null) {
				const { from, to } = uri
				const value = view.state.doc.sliceString(from, to)
				if (!uriPattern.test(value)) {
					const message = "Invalid URI"
					diagnostics.push({ from, to, message, severity: "error" })
				} else if (!namespacePattern.test(value)) {
					const message = "Namespaces must end in / or #"
					diagnostics.push({ from, to, message, severity: "error" })
				} else {
					namespace = value
				}
			}

			if (identifier !== null) {
				const { from, to } = identifier
				const prefix = view.state.doc.sliceString(from, to)
				if (prefixes1.has(prefix)) {
					const message = `Duplicate namespace: ${prefix}`
					diagnostics.push({ from, to, message, severity: "error" })
				} else {
					prefixes1.set(prefix, namespace)
					prefixIds.set(cursor1.from, [prefix, namespace])
				}
			}
		} else if (cursor1.type.name === "Class") {
			const node = cursor1.node.getChild("Uri")
			if (node === null) {
				continue
			}

			const uri = getURI(view, diagnostics, prefixes1, node)
			if (uri === null) {
				continue
			}

			if (labelKeys.has(uri)) {
				const { from, to } = node
				const message = `Duplicate label`
				diagnostics.push({ from, to, message, severity: "error" })
			} else {
				labelKeys.add(uri)
				ids.set(cursor1.from, uri)
			}
		} else if (cursor1.type.name === "Edge") {
			const node = cursor1.node.getChild("Uri")?.nextSibling
			if (node === undefined || node === null) {
				continue
			}

			const uri = getURI(view, diagnostics, prefixes1, node)
			if (uri === null) {
				continue
			}

			if (labelKeys.has(uri)) {
				const { from, to } = node
				const message = `Duplicate label`
				diagnostics.push({ from, to, message, severity: "error" })
			} else {
				labelKeys.add(uri)
				ids.set(cursor1.from, uri)
			}
		}
	} while (cursor1.next())

	const cursor2 = tree.cursor()
	const prefixes2 = new Map<string, string | null>()
	const keysArray = Array.from(labelKeys).sort()
	const keys = new Map(keysArray.map((key, i) => [key, i]))
	const labels = new Map<string, APG.Type | null>()
	const types = new Map<string, APG.Type | null>([...defaultTypes])

	if (cursor2.name === "Schema" && cursor2.firstChild()) {
		do {
			if (cursor2.type.name === "Namespace") {
				const entry = prefixIds.get(cursor2.from)
				if (entry !== undefined) {
					prefixes2.set(...entry)
				}
			} else if (cursor2.type.name === "Type") {
				const identifier = cursor2.node.getChild("TypeName")
				const expression = cursor2.node.getChild("Expression")
				const type =
					expression &&
					getType(view, diagnostics, prefixes2, types, keys, expression)

				if (identifier !== null) {
					const { from, to } = identifier
					const name = view.state.doc.sliceString(from, to)
					if (types.has(name)) {
						const message = `Duplicate identifier: ${name}`
						diagnostics.push({ from, to, message, severity: "error" })
					} else {
						types.set(name, type)
					}
				}
			} else if (cursor2.type.name === "Class") {
				const key = ids.get(cursor2.from)
				const expression = cursor2.node.getChild("Expression")
				const type =
					expression &&
					getType(view, diagnostics, prefixes2, types, keys, expression)
				if (key !== undefined) {
					labels.set(key, type)
				}
			} else if (cursor2.type.name === "Edge") {
				const key = ids.get(cursor2.from)
				const nodes = cursor2.node.getChildren("Uri")
				if (nodes.length === 3) {
					const [sourceNode, {}, targetNode] = nodes
					const source = getType(
						view,
						diagnostics,
						prefixes2,
						types,
						keys,
						sourceNode
					)
					const target = getType(
						view,
						diagnostics,
						prefixes2,
						types,
						keys,
						targetNode
					)
					if (key !== undefined && source && target) {
						labels.set(key, {
							type: "product",
							components: [
								{ type: "component", key: ns.source, value: source },
								{ type: "component", key: ns.target, value: target },
							],
						})
					}
				}
			}
		} while (cursor2.nextSibling())
	} else {
		onChange({ schema: [], prefixes: new Map(), state: view.state })
	}

	const schema: APG.Schema = keysArray.map((key) => ({
		type: "label",
		key,
		value: labels.get(key) || { type: "unit" },
	}))

	const prefixes = new Map<string, string>()
	for (const [key, value] of prefixes1) {
		if (value !== null) {
			prefixes.set(key, value)
		}
	}

	onChange({ state: view.state, schema, prefixes })

	diagnostics.sort(({ from: a }, { from: b }) => (a < b ? -1 : b < a ? 1 : 0))

	return diagnostics
}

function getURI(
	view: EditorView,
	diagnostics: Diagnostic[],
	prefixes: Map<string, string | null>,
	node: SyntaxNode
): string | null {
	const { from, to } = node
	const value = view.state.doc.sliceString(from, to)
	const index = value.indexOf(":")
	if (index === -1) {
		const message = `Invalid URI`
		diagnostics.push({ from, to, message, severity: "error" })
		return null
	}

	const prefix = value.slice(0, index)
	if (prefixes.has(prefix)) {
		const base = prefixes.get(prefix)!
		return base && base + value.slice(index + 1)
	}

	const message = `Invalid URI: namespace ${prefix} is not defined`
	diagnostics.push({ from, to, message, severity: "error" })
	return null
}

// Variable | Optional | Reference | Unit | Iri | Literal | Product | Coproduct
function getType(
	view: EditorView,
	diagnostics: Diagnostic[],
	prefixes: Map<string, string | null>,
	types: Map<string, APG.Type | null>,
	keys: Map<string, number>,
	node: SyntaxNode
): APG.Type | null {
	if (node.name === "Variable") {
		const { from, to } = node
		const value = view.state.doc.sliceString(from, to)
		const type = types.get(value)
		if (type === undefined) {
			const message = `Type ${value} is not defined`
			diagnostics.push({ from, to, message, severity: "error" })
			return null
		} else {
			return type
		}
	} else if (node.name === "Optional") {
		const expression = node.getChild("Expression")
		if (expression === null) {
			return null
		} else {
			const type = getType(view, diagnostics, prefixes, types, keys, expression)
			if (type === null) {
				return null
			} else {
				return {
					type: "coproduct",
					options: [
						{ type: "option", key: ns.none, value: { type: "unit" } },
						{ type: "option", key: ns.some, value: type },
					],
				}
			}
		}
	} else if (node.name === "Reference") {
		const uri = node.getChild("Uri")
		if (uri === null) {
			return null
		}

		const key = getURI(view, diagnostics, prefixes, uri)
		if (key === null) {
			return null
		}

		const index = keys.get(key)
		if (index === undefined) {
			const { to, from } = uri
			const message = `Class not defined`
			diagnostics.push({ to, from, message, severity: "error" })
			return null
		} else {
			return { type: "reference", value: index }
		}
	} else if (node.name === "Unit") {
		return { type: "unit" }
	} else if (node.name === "Iri") {
		return { type: "iri" }
	} else if (node.name === "Literal") {
		const uri = node.getChild("Uri")
		if (uri === null) {
			return null
		}

		const datatype = getURI(view, diagnostics, prefixes, uri)
		if (datatype === null) {
			return null
		}

		return { type: "literal", datatype }
	} else if (node.name === "Product") {
		const components: APG.Component[] = []
		const componentKeys = new Set<string>()
		for (const component of node.getChildren("Component")) {
			const uri = component.getChild("Uri")
			if (uri === null) {
				continue
			}

			const key = getURI(view, diagnostics, prefixes, uri)
			if (key === null) {
				continue
			} else if (componentKeys.has(key)) {
				const { to, from } = uri
				const message = `Duplicate product component key`
				diagnostics.push({ to, from, message, severity: "error" })
				continue
			} else {
				componentKeys.add(key)
			}

			const expression = component.getChild("Expression")
			if (expression === null) {
				continue
			}

			const value = getType(
				view,
				diagnostics,
				prefixes,
				types,
				keys,
				expression
			)
			if (value === null) {
				continue
			}

			components.push({ type: "component", key, value })
		}

		return { type: "product", components }
	} else if (node.name === "Coproduct") {
		const options: APG.Option[] = []
		const optionKeys = new Set<string>()
		for (const option of node.getChildren("Option")) {
			const expression = option.getChild("Expression")
			if (expression === null) {
				continue
			}

			const value = getType(
				view,
				diagnostics,
				prefixes,
				types,
				keys,
				expression
			)
			if (value === null) {
				continue
			}

			const uri = option.getChild("Uri")
			if (uri === null) {
				continue
			}

			const key = getURI(view, diagnostics, prefixes, uri)
			if (key === null) {
				continue
			} else if (optionKeys.has(key)) {
				const { to, from } = uri
				const message = `Duplicate coproduct option key`
				diagnostics.push({ to, from, message, severity: "error" })
				continue
			} else {
				optionKeys.add(key)
			}

			options.push({ type: "option", key, value })
		}

		return { type: "coproduct", options }
	}
	return null
}
