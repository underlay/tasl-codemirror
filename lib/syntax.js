"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaSyntax = void 0;
const language_1 = require("@codemirror/next/language");
const highlight_1 = require("@codemirror/next/highlight");
const index_js_1 = require("@underlay/tasl-lezer/grammar/index.js");
exports.schemaSyntax = language_1.LezerLanguage.define({
    parser: index_js_1.parser.configure({
        props: [
            language_1.indentNodeProp.add({
                Product: language_1.continuedIndent({ except: /^\s*\}/ }),
                Coproduct: language_1.continuedIndent({ except: /^\s*\]/ }),
            }),
            language_1.foldNodeProp.add({
                Product(subtree) {
                    return { from: subtree.from + 1, to: subtree.to - 1 };
                },
                Coproduct(subtree) {
                    return { from: subtree.from + 1, to: subtree.to - 1 };
                },
            }),
            highlight_1.styleTags({
                Comment: highlight_1.tags.comment,
                Prefix: highlight_1.tags.namespace,
                TypeName: highlight_1.tags.typeName,
                Variable: highlight_1.tags.typeName,
                Uri: highlight_1.tags.name,
                "Class/Uri": highlight_1.tags.className,
                "Edge/Uri": highlight_1.tags.className,
                Prop: highlight_1.tags.propertyName,
                Iri: highlight_1.tags.string,
                Unit: highlight_1.tags.literal,
                Literal: highlight_1.tags.string,
                "Literal/Uri": highlight_1.tags.string,
                "Reference/Uri": highlight_1.tags.className,
                Pointer: highlight_1.tags.operator,
                Optional: highlight_1.tags.operator,
                "{ }": highlight_1.tags.bracket,
                "[ ]": highlight_1.tags.bracket,
                "->": highlight_1.tags.separator,
                "<-": highlight_1.tags.separator,
                ";": highlight_1.tags.separator,
                "Namespace/Uri": highlight_1.tags.namespace,
                namespace: highlight_1.tags.keyword,
                type: highlight_1.tags.keyword,
                class: highlight_1.tags.keyword,
                edge: highlight_1.tags.keyword,
                list: highlight_1.tags.keyword,
            }),
        ],
    }),
    languageData: {
        closeBrackets: { brackets: ["[", "{", "<"] },
        indentOnInput: /^\s*[\}\]]$/,
        commentTokens: { line: "#" },
    },
});
//# sourceMappingURL=syntax.js.map