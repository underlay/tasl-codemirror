"use strict";
// import React, { useCallback, useEffect, useRef } from "react"
Object.defineProperty(exports, "__esModule", { value: true });
exports.editableConfig = exports.readOnlyConfig = void 0;
const basic_setup_1 = require("@codemirror/next/basic-setup");
const commands_1 = require("@codemirror/next/commands");
const view_1 = require("@codemirror/next/view");
const comment_1 = require("@codemirror/next/comment");
// import { openLintPanel } from "@codemirror/next/lint"
// import { makeSchemaLinter, UpdateProps } from "./lint.js"
const syntax_js_1 = require("./syntax.js");
const fold_1 = require("@codemirror/next/fold");
const gutter_1 = require("@codemirror/next/gutter");
const highlight_selection_1 = require("@codemirror/next/highlight-selection");
const highlight_1 = require("@codemirror/next/highlight");
// export interface EditorProps {
// 	initialValue: string
// 	onChange?: (props: UpdateProps) => void
// 	readOnly?: boolean
// 	view?: React.MutableRefObject<EditorView | null>
// }
exports.readOnlyConfig = [
    view_1.EditorView.editable.of(false),
    gutter_1.lineNumbers(),
    fold_1.foldGutter(),
    highlight_1.defaultHighlightStyle,
    highlight_selection_1.highlightSelectionMatches(),
    syntax_js_1.schemaSyntax,
];
exports.editableConfig = [
    basic_setup_1.basicSetup,
    syntax_js_1.schemaSyntax,
    view_1.keymap([
        ...commands_1.defaultKeymap,
        ...comment_1.commentKeymap,
        {
            key: "Tab",
            preventDefault: true,
            run: commands_1.indentMore,
        },
        {
            key: "Shift-Tab",
            preventDefault: true,
            run: commands_1.indentLess,
        },
    ]),
];
// export function TaslEditor(props: EditorProps) {
// 	const div = useRef<HTMLDivElement>(null)
// 	const view = useRef<EditorView | null>(null)
// 	const state = useRef<EditorState | null>(null)
// 	const handleChange = useCallback(
// 		(update: UpdateProps) => {
// 			state.current = update.state
// 			if (props.onChange !== undefined) {
// 				props.onChange(update)
// 			}
// 		},
// 		[props.onChange]
// 	)
// 	useEffect(() => {
// 		if (div.current) {
// 			const linter = makeSchemaLinter(handleChange)
// 			const extensions: Extension[] = props.readOnly
// 				? [readOnlyConfig, linter]
// 				: [...editableConfig, linter]
// 			state.current = EditorState.create({
// 				doc: props.initialValue,
// 				extensions,
// 			})
// 			view.current = new EditorView({
// 				state: state.current,
// 				parent: div.current,
// 			})
// 			if (props.view !== undefined) {
// 				props.view.current = view.current
// 			}
// 			if (!props.readOnly) {
// 				openLintPanel(view.current)
// 				view.current.focus()
// 			}
// 		}
// 	}, [])
// 	return <div className="cm-editor" ref={div}></div>
// }
//# sourceMappingURL=editor.js.map