import {
	continuedIndent,
	indentNodeProp,
	foldNodeProp,
	LezerLanguage,
} from "@codemirror/next/language"

import { styleTags, tags } from "@codemirror/next/highlight"
import { SyntaxNode } from "lezer-tree"

import { parser } from "@underlay/tasl-lezer/grammar/index.js"

export const schemaSyntax = LezerLanguage.define({
	parser: parser.configure({
		props: [
			indentNodeProp.add({
				Product: continuedIndent({ except: /^\s*\}/ }),
				Coproduct: continuedIndent({ except: /^\s*\]/ }),
			}),
			foldNodeProp.add({
				Product(subtree: SyntaxNode) {
					return { from: subtree.from + 1, to: subtree.to - 1 }
				},
				Coproduct(subtree: SyntaxNode) {
					return { from: subtree.from + 1, to: subtree.to - 1 }
				},
			}),
			styleTags({
				Comment: tags.comment,
				Prefix: tags.namespace,
				TypeName: tags.typeName,
				Variable: tags.typeName,
				Uri: tags.name,
				"Class/Uri": tags.className,
				"Edge/Uri": tags.className,
				Prop: tags.propertyName,
				Iri: tags.string,
				Unit: tags.literal,
				Literal: tags.string,
				"Literal/Uri": tags.string,
				"Reference/Uri": tags.className,
				Pointer: tags.operator,
				Optional: tags.operator,
				"{ }": tags.bracket,
				"[ ]": tags.bracket,
				"->": tags.separator,
				"<-": tags.separator,
				";": tags.separator,
				"Namespace/Uri": tags.namespace,
				namespace: tags.keyword,
				type: tags.keyword,
				class: tags.keyword,
				edge: tags.keyword,
				list: tags.keyword,
			}),
		],
	}),
	languageData: {
		closeBrackets: { brackets: ["[", "{", "<"] },
		indentOnInput: /^\s*[\}\]]$/,
		commentTokens: { line: "#" },
	},
})
