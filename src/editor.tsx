import React, { useCallback, useEffect, useRef } from "react"

import {
	EditorState,
	EditorView,
	basicSetup,
} from "@codemirror/next/basic-setup"
import {
	defaultKeymap,
	indentMore,
	indentLess,
} from "@codemirror/next/commands"
import { keymap } from "@codemirror/next/view"
import { commentKeymap } from "@codemirror/next/comment"
import { linter, openLintPanel } from "@codemirror/next/lint"

import { schemaLinter, UpdateProps } from "./lint.js"
import { schemaSyntax } from "./syntax.js"

export interface EditorProps {
	initialValue: string
	onChange?: (props: UpdateProps) => void
}

const baseExtensions = [
	basicSetup,
	schemaSyntax,
	keymap([
		...defaultKeymap,
		...commentKeymap,
		{
			key: "Tab",
			preventDefault: true,
			run: indentMore,
		},
		{
			key: "Shift-Tab",
			preventDefault: true,
			run: indentLess,
		},
	]),
]

export function Editor({ initialValue, onChange }: EditorProps) {
	const div = useRef<HTMLDivElement>(null)
	const view = useRef<EditorView | null>(null)
	const state = useRef<EditorState | null>(null)

	const handleChange = useCallback(
		(props: UpdateProps) => {
			state.current = props.state
			if (onChange !== undefined) {
				onChange(props)
			}
		},
		[onChange]
	)

	useEffect(() => {
		if (div.current) {
			const extensions = [...baseExtensions, linter(schemaLinter(handleChange))]
			state.current = EditorState.create({ doc: initialValue, extensions })
			view.current = new EditorView({
				state: state.current,
				parent: div.current,
			})
			openLintPanel(view.current)
			view.current.focus()
		}
	}, [])

	return <div className="cm-editor" ref={div}></div>
}
