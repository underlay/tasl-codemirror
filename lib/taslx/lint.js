"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLinter = exports.lintView = void 0;
const lint_1 = require("@codemirror/next/lint");
const language_1 = require("@codemirror/next/language");
const apg_1 = require("@underlay/apg");
const tasl_lezer_1 = require("@underlay/tasl-lezer");
function lintView(view) {
    const cursor = language_1.syntaxTree(view.state).cursor();
    const slice = ({ from, to }) => view.state.doc.sliceString(from, to);
    const error = (node, message) => new tasl_lezer_1.LintError(node.from, node.to, slice(node), message);
    const state = {
        slice,
        error,
        namespaces: {},
        exprs: {},
        mapping: {},
        diagnostics: [],
    };
    if (cursor.name === "Mapping") {
        cursor.firstChild();
    }
    else {
        return {
            errors: 1,
            state: view.state,
            mapping: {},
            namespaces: {},
            diagnostics: [
                {
                    from: cursor.from,
                    to: cursor.to,
                    message: "Syntax error: invalid document",
                    severity: "error",
                },
            ],
        };
    }
    do {
        if (cursor.type.isError) {
        }
        else if (cursor.type.name === "Namespace") {
            let namespace = "";
            const term = cursor.node.getChild("Term");
            if (term !== null) {
                namespace = state.slice(term);
                if (!tasl_lezer_1.uriPattern.test(namespace)) {
                    const { from, to } = term;
                    const message = `Invalid URI: URIs must match ${tasl_lezer_1.uriPattern.source}`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else if (!tasl_lezer_1.namespacePattern.test(namespace)) {
                    const { from, to } = term;
                    const message = "Invalid namespace: namespaces must end in / or #";
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
            }
            const identifier = cursor.node.getChild("Prefix");
            if (identifier !== null) {
                const prefix = state.slice(identifier);
                if (prefix in state.namespaces) {
                    const { from, to } = identifier;
                    const message = `Duplicate namespace: ${prefix}`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.namespaces[prefix] = namespace;
                }
            }
        }
        else if (cursor.type.name === "Expr") {
            const identifier = cursor.node.getChild("ExprName");
            const expressions = cursor.node.getChildren("Expression");
            const exprs = parseExprs(state, expressions);
            if (identifier !== null) {
                const name = state.slice(identifier);
                if (name in state.exprs) {
                    const { from, to } = identifier;
                    const message = `Invalid expression declaration: expression ${name} has already been declared`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.exprs[name] = exprs;
                }
            }
        }
        else if (cursor.type.name === "Map") {
            const terms = cursor.node.getChildren("Term");
            if (terms.length > 0) {
                const key = getURI(state, terms[0]);
                if (key !== null) {
                    if (key in state.mapping) {
                        const { from, to } = terms[0];
                        const message = `Invalid map declaration: map ${key} has already been declared`;
                        state.diagnostics.push({ from, to, message, severity: "error" });
                    }
                    else {
                        const expressions = cursor.node.getChildren("Expression");
                        const source = terms.length > 1 ? getURI(state, terms[1]) : key;
                        state.mapping[key] = apg_1.APG.map(source, parseExprs(state, expressions));
                    }
                }
            }
        }
        reportChildErrors(state.diagnostics, cursor);
    } while (cursor.nextSibling());
    const namespaces = Object.entries(state.namespaces).filter(([_, base]) => base !== null);
    const sorted = state.diagnostics.sort(({ from: a, to: c }, { from: b, to: d }) => a < b ? -1 : b < a ? 1 : c < d ? -1 : d < c ? 1 : 0);
    return {
        errors: sorted.length,
        state: view.state,
        mapping: state.mapping,
        namespaces: { ...tasl_lezer_1.defaultNamespaces, ...Object.fromEntries(namespaces) },
        diagnostics: sorted,
    };
}
exports.lintView = lintView;
const makeLinter = (onChange) => lint_1.linter((view) => {
    const { diagnostics, ...props } = lintView(view);
    if (onChange !== undefined) {
        onChange(props);
    }
    return diagnostics;
});
exports.makeLinter = makeLinter;
function getURI(state, node) {
    try {
        return tasl_lezer_1.parseURI(state, node);
    }
    catch (e) {
        if (e instanceof tasl_lezer_1.LintError) {
            const { from, to, message, value } = e;
            state.diagnostics.push({ from, to, message, severity: "error" });
            return value;
        }
        else {
            throw e;
        }
    }
}
const parseExprs = (state, nodes) => nodes.reduce((prev, node) => prev.concat(parseExpr(state, node)), []);
// Variable | Optional | Reference | Unit | Iri | Literal | Product | Coproduct
function parseExpr(state, node) {
    if (node.name === "Variable") {
        const value = state.slice(node);
        if (value in state.exprs) {
            return state.exprs[value];
        }
        else {
            const { from, to } = node;
            const message = `Expression ${value} is not defined`;
            state.diagnostics.push({ from, to, message, severity: "error" });
            return [];
        }
    }
    else if (node.name === "Dereference") {
        const term = node.getChild("Term");
        if (term === null) {
            return [];
        }
        const key = getURI(state, term);
        return [apg_1.APG.dereference(key)];
    }
    else if (node.name === "Projection") {
        const term = node.getChild("Term");
        if (term === null) {
            return [];
        }
        const key = getURI(state, term);
        return [apg_1.APG.projection(key)];
    }
    else if (node.name === "Injection") {
        const term = node.getChild("Term");
        if (term === null) {
            return [];
        }
        const key = getURI(state, term);
        return [apg_1.APG.injection(key)];
    }
    else if (node.name === "Identifier") {
        const term = node.getChild("Term");
        if (term === null) {
            return [];
        }
        const key = getURI(state, term);
        return [apg_1.APG.identifier(key)];
    }
    else if (node.name === "Constant") {
        const string = node.getChild("String");
        const value = string === null ? '""' : JSON.parse(state.slice(string));
        const term = node.getChild("Term");
        if (term === null) {
            return [];
        }
        const key = getURI(state, term);
        return [apg_1.APG.constant(value, key)];
    }
    else if (node.name === "Tuple") {
        const slots = {};
        for (const slot of node.getChildren("Slot")) {
            const term = slot.getChild("Term");
            if (term === null) {
                continue;
            }
            const key = getURI(state, term);
            if (key in slots) {
                const { from, to } = term;
                const message = `Duplicate tuple slot key`;
                state.diagnostics.push({ from, to, message, severity: "error" });
            }
            const expressions = slot.getChildren("Expression");
            slots[key] = parseExprs(state, expressions);
        }
        return [apg_1.APG.tuple(slots)];
    }
    else if (node.name === "Match") {
        const cases = {};
        for (const CASE of node.getChildren("Case")) {
            const term = CASE.getChild("Term");
            if (term === null) {
                continue;
            }
            const key = getURI(state, term);
            if (key in cases) {
                const { from, to } = term;
                const message = `Duplicate match case key`;
                state.diagnostics.push({ from, to, message, severity: "error" });
            }
            const expressions = CASE.getChildren("Expression");
            cases[key] = parseExprs(state, expressions);
        }
        return [apg_1.APG.match(cases)];
    }
    else {
        throw new Error("Unexpected Expression node");
    }
}
function reportChildErrors(diagnostics, cursor) {
    if (cursor.type.isError) {
        const { from, to } = cursor;
        const message = `Syntax error: unexpected or missing token (that's all we know)`;
        diagnostics.push({ from, to, message, severity: "error" });
    }
    if (cursor.firstChild()) {
        do {
            reportChildErrors(diagnostics, cursor);
        } while (cursor.nextSibling());
        cursor.parent();
    }
}
//# sourceMappingURL=lint.js.map