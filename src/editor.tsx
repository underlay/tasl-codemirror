import React, { useCallback, useEffect, useRef } from "react"

import { basicSetup } from "@codemirror/next/basic-setup"
import {
	defaultKeymap,
	indentMore,
	indentLess,
} from "@codemirror/next/commands"
import { EditorView, keymap } from "@codemirror/next/view"
import { commentKeymap } from "@codemirror/next/comment"
import { openLintPanel } from "@codemirror/next/lint"

import { makeSchemaLinter, UpdateProps } from "./lint.js"
import { schemaSyntax } from "./syntax.js"
import { EditorState, Extension } from "@codemirror/next/state"

import { foldGutter } from "@codemirror/next/fold"
import { lineNumbers } from "@codemirror/next/gutter"
import { highlightSelectionMatches } from "@codemirror/next/highlight-selection"
import { defaultHighlightStyle } from "@codemirror/next/highlight"

export interface EditorProps {
	initialValue: string
	onChange?: (props: UpdateProps) => void
	readOnly?: boolean
}

const readOnlySetup: Extension = [
	EditorView.editable.of(false),
	lineNumbers(),
	foldGutter(),
	defaultHighlightStyle,
	highlightSelectionMatches(),
]

const readOnlyExtensions = [readOnlySetup, schemaSyntax]

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

export function Editor({ initialValue, onChange, readOnly }: EditorProps) {
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
			const linter = makeSchemaLinter(handleChange)
			const extensions: Extension[] = readOnly
				? [readOnlyExtensions, linter]
				: [...baseExtensions, linter]

			state.current = EditorState.create({ doc: initialValue, extensions })
			view.current = new EditorView({
				state: state.current,
				parent: div.current,
			})

			if (!readOnly) {
				openLintPanel(view.current)
				view.current.focus()
			}
		}
	}, [])

	return <div className="cm-editor" ref={div}></div>
}
