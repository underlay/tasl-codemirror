"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editableConfig = exports.readOnlyConfig = void 0;
const basic_setup_1 = require("@codemirror/next/basic-setup");
const commands_1 = require("@codemirror/next/commands");
const view_1 = require("@codemirror/next/view");
const comment_1 = require("@codemirror/next/comment");
const gutter_1 = require("@codemirror/next/gutter");
const highlight_selection_1 = require("@codemirror/next/highlight-selection");
const highlight_1 = require("@codemirror/next/highlight");
const syntax_js_1 = require("./syntax.js");
exports.readOnlyConfig = [
    view_1.EditorView.editable.of(false),
    gutter_1.lineNumbers(),
    highlight_1.defaultHighlightStyle,
    highlight_selection_1.highlightSelectionMatches(),
    syntax_js_1.syntax,
];
exports.editableConfig = [
    basic_setup_1.basicSetup,
    syntax_js_1.syntax,
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