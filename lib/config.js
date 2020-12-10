"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editableConfig = exports.readOnlyConfig = exports.EditorState = exports.EditorView = void 0;
const basic_setup_1 = require("@codemirror/next/basic-setup");
const commands_1 = require("@codemirror/next/commands");
const view_1 = require("@codemirror/next/view");
const comment_1 = require("@codemirror/next/comment");
const gutter_1 = require("@codemirror/next/gutter");
const highlight_selection_1 = require("@codemirror/next/highlight-selection");
const highlight_1 = require("@codemirror/next/highlight");
const syntax_js_1 = require("./syntax.js");
__exportStar(require("@codemirror/next/state"), exports);
var view_2 = require("@codemirror/next/view");
Object.defineProperty(exports, "EditorView", { enumerable: true, get: function () { return view_2.EditorView; } });
var state_1 = require("@codemirror/next/state");
Object.defineProperty(exports, "EditorState", { enumerable: true, get: function () { return state_1.EditorState; } });
exports.readOnlyConfig = [
    view_1.EditorView.editable.of(false),
    gutter_1.lineNumbers(),
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
//# sourceMappingURL=config.js.map