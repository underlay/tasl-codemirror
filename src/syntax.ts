import {
	continuedIndent,
	indentNodeProp,
	foldNodeProp,
	LezerSyntax,
} from "@codemirror/next/syntax"

import { styleTags } from "@codemirror/next/highlight"
import { SyntaxNode } from "lezer-tree"

import { parser } from "../grammar/index.js"

export const schemaSyntax = LezerSyntax.define(
	parser.withProps(
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
			Comment: "comment",
			Prefix: "namespace",
			TypeName: "typeName",
			Variable: "typeName",
			Uri: "name",
			"Class/Uri": "className",
			"Edge/Uri": "className",
			Prop: "propertyName",
			Iri: "string",
			Unit: "literal",
			Literal: "string",
			"Literal/Uri": "string",
			"Reference/Uri": "className",
			At: "operator",
			Optional: "operator",
			"{ }": "bracket",
			"[ ]": "bracket",
			"->": "separator",
			"<-": "separator",
			";": "separator",
			"Namespace/Uri": "namespace",
			namespace: "keyword",
			type: "keyword",
			class: "keyword",
			edge: "keyword",
		})
	),
	{
		languageData: {
			closeBrackets: { brackets: ["[", "{", "<"] },
			indentOnInput: /^\s*[\}\]]$/,
			commentTokens: { line: "#" },
		},
	}
)
