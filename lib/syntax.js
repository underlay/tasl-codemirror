"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaSyntax = void 0;
const syntax_1 = require("@codemirror/next/syntax");
const highlight_1 = require("@codemirror/next/highlight");
const index_js_1 = require("../grammar/index.js");
exports.schemaSyntax = syntax_1.LezerSyntax.define(index_js_1.parser.withProps(syntax_1.indentNodeProp.add({
    Product: syntax_1.continuedIndent({ except: /^\s*\}/ }),
    Coproduct: syntax_1.continuedIndent({ except: /^\s*\]/ }),
}), syntax_1.foldNodeProp.add({
    Product(subtree) {
        return { from: subtree.from + 1, to: subtree.to - 1 };
    },
    Coproduct(subtree) {
        return { from: subtree.from + 1, to: subtree.to - 1 };
    },
}), highlight_1.styleTags({
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
})), {
    languageData: {
        closeBrackets: { brackets: ["[", "{", "<"] },
        indentOnInput: /^\s*[\}\]]$/,
        commentTokens: { line: "#" },
    },
});
//# sourceMappingURL=syntax.js.map