import { EditorState, Extension } from "@codemirror/next/state"
import { Diagnostic, linter } from "@codemirror/next/lint"
import { EditorView } from "@codemirror/next/view"
import { SyntaxNode, TreeCursor } from "lezer-tree"

import { APG, ns } from "@underlay/apg"

import { defaultTypes } from "./stdlib.js"
import {
	LintError,
	namespacePattern,
	ParseState,
	parseURI,
	uriPattern,
} from "@underlay/apg-schema-parser"

export const errorUnit: APG.Unit = Object.freeze({ type: "unit" })

export interface UpdateProps {
	errors: number
	state: EditorState
	schema: APG.Schema
	namespaces: Record<string, string>
}

export function lintView({
	state,
}: EditorView): UpdateProps & { diagnostics: Diagnostic[] } {
	const cursor = state.tree.cursor()

	const parseState: ParseState = {
		slice: ({ from, to }) => state.doc.sliceString(from, to),
		namespaces: {},
		references: [],
		types: { ...defaultTypes },
		schema: {},
	}

	const diagnostics: Diagnostic[] = []

	if (cursor.name === "Schema") {
		cursor.firstChild()
	} else {
		diagnostics.push({
			from: cursor.from,
			to: cursor.to,
			message: "Syntax error: invalid document",
			severity: "error",
		})
		return { errors: 1, state, schema: {}, namespaces: {}, diagnostics }
	}

	do {
		if (cursor.type.isError) {
		} else if (cursor.type.name === "Namespace") {
			let namespace = ""

			const uri = cursor.node.getChild("Uri")
			if (uri !== null) {
				namespace = parseState.slice(uri)
				if (!uriPattern.test(namespace)) {
					const { from, to } = uri
					const message = `Invalid URI: URIs must match ${uriPattern.source}`
					diagnostics.push({ from, to, message, severity: "error" })
				} else if (!namespacePattern.test(namespace)) {
					const { from, to } = uri
					const message = "Invalid namespace: namespaces must end in / or #"
					diagnostics.push({ from, to, message, severity: "error" })
				}
			}

			const identifier = cursor.node.getChild("Prefix")
			if (identifier !== null) {
				const prefix = parseState.slice(identifier)
				if (prefix in parseState.namespaces) {
					const { from, to } = identifier
					const message = `Duplicate namespace: ${prefix}`
					diagnostics.push({ from, to, message, severity: "error" })
				} else {
					parseState.namespaces[prefix] = namespace
				}
			}
		} else if (cursor.type.name === "Type") {
			const identifier = cursor.node.getChild("TypeName")
			const expression = cursor.node.getChild("Expression")
			const type =
				expression === null
					? errorUnit
					: getType(parseState, diagnostics, expression)
			if (identifier !== null) {
				const name = parseState.slice(identifier)
				if (name in parseState.types) {
					const { from, to } = identifier
					const message = `Invalid type declaration: type ${name} has already been declared`
					diagnostics.push({ from, to, message, severity: "error" })
				} else {
					parseState.types[name] = type
				}
			}
		} else if (cursor.type.name === "Class") {
			const node = cursor.node.getChild("Uri")
			if (node !== null) {
				const uri = getURI(parseState, diagnostics, node)
				if (uri !== null) {
					if (uri in parseState.schema) {
						const { from, to } = node
						const message = `Invalid class declaration: class ${uri} has already been declared`
						diagnostics.push({ from, to, message, severity: "error" })
					} else {
						const expression = cursor.node.getChild("Expression")
						parseState.schema[uri] =
							expression === null
								? errorUnit
								: getType(parseState, diagnostics, expression)
					}
				}
			}
		} else if (cursor.type.name === "Edge") {
			const uris = cursor.node.getChildren("Uri")
			const names = uris.map((uri) => getURI(parseState, diagnostics, uri))
			if (uris.length === 3 && names.length === 3) {
				const [sourceNode, labelNode, targetNode] = uris
				const [source, label, target] = names
				if (label in parseState.schema) {
					const { from, to } = labelNode
					const message = `Invalid edge declaration: class ${label} has already been declared`
					diagnostics.push({ from, to, message, severity: "error" })
				} else {
					if (!(source in parseState.schema)) {
						const { from, to } = sourceNode
						parseState.references.push({ from, to, key: source })
					}

					if (!(target in parseState.schema)) {
						const { from, to } = targetNode
						parseState.references.push({ from, to, key: target })
					}

					parseState.schema[label] = {
						type: "product",
						components: {
							[ns.source]: { type: "reference", value: source },
							[ns.target]: { type: "reference", value: target },
						},
					}
				}
			}
		}

		reportChildErrors(diagnostics, cursor)
	} while (cursor.nextSibling())

	const namespaces: [string, string][] = Object.entries(
		parseState.namespaces
	).filter(([_, base]) => base !== null) as [string, string][]

	for (const { from, to, key } of parseState.references) {
		if (key in parseState.schema) {
			continue
		} else {
			const message = `Reference error: class ${key} is not defined`
			diagnostics.push({ from, to, message, severity: "error" })
		}
	}

	const sorted = diagnostics.sort(({ from: a, to: c }, { from: b, to: d }) =>
		a < b ? -1 : b < a ? 1 : c < d ? -1 : d < c ? 1 : 0
	)

	return {
		errors: sorted.length,
		state: state,
		schema: parseState.schema,
		namespaces: Object.fromEntries(namespaces),
		diagnostics: sorted,
	}
}

export const makeSchemaLinter = (
	onChange: (props: UpdateProps) => void
): Extension =>
	linter((view: EditorView) => {
		const { diagnostics, ...props } = lintView(view)
		onChange(props)
		return diagnostics
	})

function getURI(
	state: ParseState,
	diagnostics: Diagnostic[],
	node: SyntaxNode
): string {
	try {
		return parseURI(state, node)
	} catch (e) {
		if (e instanceof LintError) {
			const { from, to, message, value } = e
			diagnostics.push({ from, to, message, severity: "error" })
			return value
		} else {
			throw e
		}
	}
}

// Variable | Optional | Reference | Unit | Iri | Literal | Product | Coproduct
function getType(
	state: ParseState,
	diagnostics: Diagnostic[],
	node: SyntaxNode
): APG.Type {
	if (node.name === "Variable") {
		const value = state.slice(node)
		if (value in state.types) {
			return state.types[value]
		} else {
			const { from, to } = node
			const message = `Type ${value} is not defined`
			diagnostics.push({ from, to, message, severity: "error" })
			return errorUnit
		}
	} else if (node.name === "Optional") {
		const expression = node.getChild("Expression")
		const type =
			expression === null ? errorUnit : getType(state, diagnostics, expression)
		return {
			type: "coproduct",
			options: { [ns.none]: { type: "unit" }, [ns.some]: type },
		}
	} else if (node.name === "Reference") {
		const uri = node.getChild("Uri")
		if (uri === null) {
			return errorUnit
		}

		const key = getURI(state, diagnostics, uri)
		if (!(key in state.schema)) {
			const { from, to } = uri
			state.references.push({ from, to, key })
		}

		return { type: "reference", value: key }
	} else if (node.name === "Unit") {
		return { type: "unit" }
	} else if (node.name === "Iri") {
		return { type: "uri" }
	} else if (node.name === "Literal") {
		const uri = node.getChild("Uri")
		if (uri === null) {
			return errorUnit
		}
		const datatype = getURI(state, diagnostics, uri)
		return { type: "literal", datatype }
	} else if (node.name === "Product") {
		const components: Record<string, APG.Type> = {}
		for (const component of node.getChildren("Component")) {
			const uri = component.getChild("Uri")
			if (uri === null) {
				continue
			}

			const key = getURI(state, diagnostics, uri)
			if (key in components) {
				const { from, to } = uri
				const message = `Duplicate product component key`
				diagnostics.push({ from, to, message, severity: "error" })
			} else {
				const expression = component.getChild("Expression")
				components[key] =
					expression === null
						? errorUnit
						: getType(state, diagnostics, expression)
			}
		}

		return { type: "product", components }
	} else if (node.name === "Coproduct") {
		const options: Record<string, APG.Type> = {}
		for (const option of node.getChildren("Option")) {
			const uri = option.getChild("Uri")
			if (uri === null) {
				continue
			}

			const key = getURI(state, diagnostics, uri)
			if (key in options) {
				const { from, to } = uri
				const message = `Duplicate coproduct option key`
				diagnostics.push({ from, to, message, severity: "error" })
			} else {
				const expression = option.getChild("Expression")
				options[key] =
					expression === null
						? errorUnit
						: getType(state, diagnostics, expression)
			}
		}

		return { type: "coproduct", options }
	} else {
		return { type: "unit" }
	}
}

function reportChildErrors(diagnostics: Diagnostic[], cursor: TreeCursor) {
	if (cursor.type.isError) {
		const { from, to } = cursor
		const message = `Syntax error: unexpected or missing token (that's all we know)`
		diagnostics.push({ from, to, message, severity: "error" })
	}
	if (cursor.firstChild()) {
		do {
			reportChildErrors(diagnostics, cursor)
		} while (cursor.nextSibling())
		cursor.parent()
	}
}
