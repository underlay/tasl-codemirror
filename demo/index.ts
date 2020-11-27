import {
	EditorState,
	EditorView,
	basicSetup,
} from "@codemirror/next/basic-setup"
import { keymap } from "@codemirror/next/view"
import {
	defaultKeymap,
	indentMore,
	indentLess,
} from "@codemirror/next/commands"
import { commentKeymap } from "@codemirror/next/comment"
import { linter } from "@codemirror/next/lint"

import { schemaLinter, schemaSyntax } from "../lib/index.js"

const main = document.querySelector("main")!

const extensions = [
	basicSetup,
	schemaSyntax,
	EditorState.indentUnit.of("  "),
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
	linter(schemaLinter(() => {})),
]

const state = EditorState.create({
	extensions,
	doc: `# Welcome to the schema editor!
# If you're new, you probably want to read
# the schema language documentation here:
# http://r1.underlay.org/docs/schemas

namespace ex http://example.com#
namespace ul http://underlay.org/ns/

type foo {
  ex:a -> ? uri ;
  ex:b -> string ;
  -> dateTime ;
}

edge ex:cool ==/ ex:map /=> ex:wau

class ex:cool unit

class ex:wau {
  ex:bar -> foo ;
  ex:age -> integer ;
  ex:self -> * ex:wau ;
}






`,
})

;(window as any).view = new EditorView({ state, parent: main })
