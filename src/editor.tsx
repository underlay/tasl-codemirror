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
import { openLintPanel } from "@codemirror/next/lint"

import { makeSchemaLinter, UpdateProps } from "./lint.js"
import { schemaSyntax } from "./syntax.js"
import { Extension } from "@codemirror/next/state"

export interface EditorProps {
	initialValue: string
	onChange?: (props: UpdateProps) => void
	readOnly?: boolean
	noLint?: boolean
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

export function Editor({
	initialValue,
	onChange,
	readOnly,
	noLint,
}: EditorProps) {
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
			const extensions: Extension[] = [...baseExtensions]

			if (!noLint) {
				extensions.push(makeSchemaLinter(handleChange))
			}

			if (readOnly) {
				extensions.push(EditorView.editable.of(false))
			}

			state.current = EditorState.create({ doc: initialValue, extensions })
			view.current = new EditorView({
				state: state.current,
				parent: div.current,
			})

			if (!noLint) {
				openLintPanel(view.current)
				view.current.focus()
			}
		}
	}, [])

	return <div className="cm-editor" ref={div}></div>
}
