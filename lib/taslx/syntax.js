"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntax = void 0;
const language_1 = require("@codemirror/next/language");
const highlight_1 = require("@codemirror/next/highlight");
const taslx_js_1 = require("@underlay/tasl-lezer/grammar/taslx.js");
exports.syntax = language_1.LezerLanguage.define({
    parser: taslx_js_1.parser.configure({
        props: [
            language_1.indentNodeProp.add({
                Tuple: language_1.continuedIndent({ except: /^\s*\}/ }),
                Match: language_1.continuedIndent({ except: /^\s*\]/ }),
            }),
            language_1.foldNodeProp.add({
                Tuple(subtree) {
                    return { from: subtree.from + 1, to: subtree.to - 1 };
                },
                Match(subtree) {
                    return { from: subtree.from + 1, to: subtree.to - 1 };
                },
            }),
            highlight_1.styleTags({
                Comment: highlight_1.tags.comment,
                Prefix: highlight_1.tags.namespace,
                ExprName: highlight_1.tags.typeName,
                Variable: highlight_1.tags.typeName,
                Term: highlight_1.tags.name,
                "Map/Term": highlight_1.tags.className,
                "Dereference/Term": highlight_1.tags.className,
                "Tuple/Term": highlight_1.tags.propertyName,
                "Match/Term": highlight_1.tags.propertyName,
                "Projection/Term": highlight_1.tags.propertyName,
                "Injection/Term": highlight_1.tags.propertyName,
                Identifier: highlight_1.tags.string,
                "Identifier/Term": highlight_1.tags.string,
                Constant: highlight_1.tags.string,
                String: highlight_1.tags.string,
                "Constant/Term": highlight_1.tags.string,
                Projector: highlight_1.tags.operator,
                Injector: highlight_1.tags.operator,
                Pointer: highlight_1.tags.operator,
                "{ }": highlight_1.tags.bracket,
                "[ ]": highlight_1.tags.bracket,
                "->": highlight_1.tags.separator,
                ">-": highlight_1.tags.separator,
                ";": highlight_1.tags.separator,
                "Namespace/Term": highlight_1.tags.namespace,
                namespace: highlight_1.tags.keyword,
                expr: highlight_1.tags.keyword,
                map: highlight_1.tags.keyword,
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