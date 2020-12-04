"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Editor = void 0;
const react_1 = __importStar(require("react"));
const basic_setup_1 = require("@codemirror/next/basic-setup");
const commands_1 = require("@codemirror/next/commands");
const view_1 = require("@codemirror/next/view");
const comment_1 = require("@codemirror/next/comment");
const lint_1 = require("@codemirror/next/lint");
const lint_js_1 = require("./lint.js");
const syntax_js_1 = require("./syntax.js");
const state_1 = require("@codemirror/next/state");
const fold_1 = require("@codemirror/next/fold");
const gutter_1 = require("@codemirror/next/gutter");
const highlight_selection_1 = require("@codemirror/next/highlight-selection");
const highlight_1 = require("@codemirror/next/highlight");
const readOnlySetup = [
    view_1.EditorView.editable.of(false),
    gutter_1.lineNumbers(),
    fold_1.foldGutter(),
    highlight_1.defaultHighlighter,
    highlight_selection_1.highlightSelectionMatches(),
];
const readOnlyExtensions = [readOnlySetup, syntax_js_1.schemaSyntax];
const baseExtensions = [
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
function Editor({ initialValue, onChange, readOnly }) {
    const div = react_1.useRef(null);
    const view = react_1.useRef(null);
    const state = react_1.useRef(null);
    const handleChange = react_1.useCallback((props) => {
        state.current = props.state;
        if (onChange !== undefined) {
            onChange(props);
        }
    }, [onChange]);
    react_1.useEffect(() => {
        if (div.current) {
            const linter = lint_js_1.makeSchemaLinter(handleChange);
            const extensions = readOnly
                ? [readOnlyExtensions, linter]
                : [...baseExtensions, linter];
            state.current = state_1.EditorState.create({ doc: initialValue, extensions });
            view.current = new view_1.EditorView({
                state: state.current,
                parent: div.current,
            });
            if (!readOnly) {
                lint_1.openLintPanel(view.current);
                view.current.focus();
            }
        }
    }, []);
    return react_1.default.createElement("div", { className: "cm-editor", ref: div });
}
exports.Editor = Editor;
//# sourceMappingURL=editor.js.map