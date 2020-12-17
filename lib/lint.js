"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSchemaLinter = exports.lintView = void 0;
const lint_1 = require("@codemirror/next/lint");
const language_1 = require("@codemirror/next/language");
const apg_1 = require("@underlay/apg");
const tasl_lezer_1 = require("@underlay/tasl-lezer");
const error_js_1 = require("./error.js");
function lintView({ state, }) {
    const cursor = language_1.syntaxTree(state).cursor();
    const parseState = {
        slice: ({ from, to }) => state.doc.sliceString(from, to),
        namespaces: {},
        references: [],
        types: { ...tasl_lezer_1.defaultTypes },
        schema: {},
    };
    const diagnostics = [];
    if (cursor.name === "Schema") {
        cursor.firstChild();
    }
    else {
        diagnostics.push({
            from: cursor.from,
            to: cursor.to,
            message: "Syntax error: invalid document",
            severity: "error",
        });
        return { errors: 1, state, schema: {}, namespaces: {}, diagnostics };
    }
    do {
        if (cursor.type.isError) {
        }
        else if (cursor.type.name === "Namespace") {
            let namespace = "";
            const term = cursor.node.getChild("Term");
            if (term !== null) {
                namespace = parseState.slice(term);
                if (!tasl_lezer_1.uriPattern.test(namespace)) {
                    const { from, to } = term;
                    const message = `Invalid URI: URIs must match ${tasl_lezer_1.uriPattern.source}`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else if (!tasl_lezer_1.namespacePattern.test(namespace)) {
                    const { from, to } = term;
                    const message = "Invalid namespace: namespaces must end in / or #";
                    diagnostics.push({ from, to, message, severity: "error" });
                }
            }
            const identifier = cursor.node.getChild("Prefix");
            if (identifier !== null) {
                const prefix = parseState.slice(identifier);
                if (prefix in parseState.namespaces) {
                    const { from, to } = identifier;
                    const message = `Duplicate namespace: ${prefix}`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    parseState.namespaces[prefix] = namespace;
                }
            }
        }
        else if (cursor.type.name === "Type") {
            const identifier = cursor.node.getChild("TypeName");
            const expression = cursor.node.getChild("Expression");
            const type = expression === null
                ? error_js_1.errorUnit
                : getType(parseState, diagnostics, expression);
            if (identifier !== null) {
                const name = parseState.slice(identifier);
                if (name in parseState.types) {
                    const { from, to } = identifier;
                    const message = `Invalid type declaration: type ${name} has already been declared`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    parseState.types[name] = type;
                }
            }
        }
        else if (cursor.type.name === "Class") {
            const term = cursor.node.getChild("Term");
            if (term !== null) {
                const uri = getURI(parseState, diagnostics, term);
                if (uri !== null) {
                    if (uri in parseState.schema) {
                        const { from, to } = term;
                        const message = `Invalid class declaration: class ${uri} has already been declared`;
                        diagnostics.push({ from, to, message, severity: "error" });
                    }
                    else {
                        const expression = cursor.node.getChild("Expression");
                        parseState.schema[uri] =
                            expression === null
                                ? error_js_1.errorUnit
                                : getType(parseState, diagnostics, expression);
                    }
                }
            }
        }
        else if (cursor.type.name === "Edge") {
            const terms = cursor.node.getChildren("Term");
            const uris = terms.map((uri) => getURI(parseState, diagnostics, uri));
            if (terms.length === 3 && uris.length === 3) {
                const [sourceNode, labelNode, targetNode] = terms;
                const [source, label, target] = uris;
                if (label in parseState.schema) {
                    const { from, to } = labelNode;
                    const message = `Invalid edge declaration: class ${label} has already been declared`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                if (!(source in parseState.schema)) {
                    const { from, to } = sourceNode;
                    parseState.references.push({ from, to, key: source });
                }
                if (!(target in parseState.schema)) {
                    const { from, to } = targetNode;
                    parseState.references.push({ from, to, key: target });
                }
                const components = {
                    [apg_1.ns.source]: apg_1.APG.reference(source),
                    [apg_1.ns.target]: apg_1.APG.reference(target),
                };
                const expression = cursor.node.getChild("Expression");
                if (expression !== null) {
                    components[apg_1.ns.value] = getType(parseState, diagnostics, expression);
                }
                parseState.schema[label] = apg_1.APG.product(components);
            }
        }
        else if (cursor.type.name === "List") {
            const term = cursor.node.getChild("Term");
            const expression = cursor.node.getChild("Expression");
            const head = expression === null
                ? error_js_1.errorUnit
                : getType(parseState, diagnostics, expression);
            if (term !== null) {
                const uri = getURI(parseState, diagnostics, term);
                if (uri in parseState.schema) {
                    const { from, to } = term;
                    const message = `Invalid list declaration: class ${uri} has already been declared`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                parseState.schema[uri] = apg_1.APG.coproduct({
                    [apg_1.ns.none]: apg_1.APG.product({}),
                    [apg_1.ns.some]: apg_1.APG.coproduct({
                        [apg_1.ns.head]: head,
                        [apg_1.ns.tail]: apg_1.APG.reference(uri),
                    }),
                });
            }
        }
        reportChildErrors(diagnostics, cursor);
    } while (cursor.nextSibling());
    const namespaces = Object.entries(parseState.namespaces).filter(([_, base]) => base !== null);
    for (const { from, to, key } of parseState.references) {
        if (key in parseState.schema) {
            continue;
        }
        else {
            const message = `Reference error: class ${key} is not defined`;
            diagnostics.push({ from, to, message, severity: "error" });
        }
    }
    const sorted = diagnostics.sort(({ from: a, to: c }, { from: b, to: d }) => a < b ? -1 : b < a ? 1 : c < d ? -1 : d < c ? 1 : 0);
    return {
        errors: sorted.length,
        state: state,
        schema: parseState.schema,
        namespaces: { ...tasl_lezer_1.defaultNamespaces, ...Object.fromEntries(namespaces) },
        diagnostics: sorted,
    };
}
exports.lintView = lintView;
const makeSchemaLinter = (onChange) => lint_1.linter((view) => {
    const { diagnostics, ...props } = lintView(view);
    if (onChange !== undefined) {
        onChange(props);
    }
    return diagnostics;
});
exports.makeSchemaLinter = makeSchemaLinter;
function getURI(state, diagnostics, node) {
    try {
        return tasl_lezer_1.parseURI(state, node);
    }
    catch (e) {
        if (e instanceof tasl_lezer_1.LintError) {
            const { from, to, message, value } = e;
            diagnostics.push({ from, to, message, severity: "error" });
            return value;
        }
        else {
            throw e;
        }
    }
}
// Variable | Optional | Reference | Unit | Iri | Literal | Product | Coproduct
function getType(state, diagnostics, node) {
    if (node.name === "Variable") {
        const value = state.slice(node);
        if (value in state.types) {
            return state.types[value];
        }
        else {
            const { from, to } = node;
            const message = `Type ${value} is not defined`;
            diagnostics.push({ from, to, message, severity: "error" });
            return error_js_1.errorUnit;
        }
    }
    else if (node.name === "Optional") {
        const expression = node.getChild("Expression");
        const type = expression === null ? error_js_1.errorUnit : getType(state, diagnostics, expression);
        return apg_1.APG.coproduct({ [apg_1.ns.none]: apg_1.APG.product({}), [apg_1.ns.some]: type });
    }
    else if (node.name === "Reference") {
        const term = node.getChild("Term");
        if (term === null) {
            return error_js_1.errorUnit;
        }
        const key = getURI(state, diagnostics, term);
        if (!(key in state.schema)) {
            const { from, to } = term;
            state.references.push({ from, to, key });
        }
        return apg_1.APG.reference(key);
    }
    else if (node.name === "Uri") {
        return apg_1.APG.uri();
    }
    else if (node.name === "Literal") {
        const term = node.getChild("Term");
        if (term === null) {
            return error_js_1.errorUnit;
        }
        const datatype = getURI(state, diagnostics, term);
        return apg_1.APG.literal(datatype);
    }
    else if (node.name === "Product") {
        const components = {};
        for (const component of node.getChildren("Component")) {
            const term = component.getChild("Term");
            if (term === null) {
                continue;
            }
            const key = getURI(state, diagnostics, term);
            if (key in components) {
                const { from, to } = term;
                const message = `Duplicate product component key`;
                diagnostics.push({ from, to, message, severity: "error" });
            }
            const expression = component.getChild("Expression");
            components[key] =
                expression === null
                    ? error_js_1.errorUnit
                    : getType(state, diagnostics, expression);
        }
        return { type: "product", components };
    }
    else if (node.name === "Coproduct") {
        const options = {};
        for (const option of node.getChildren("Option")) {
            const term = option.getChild("Term");
            if (term === null) {
                continue;
            }
            const key = getURI(state, diagnostics, term);
            if (key in options) {
                const { from, to } = term;
                const message = `Duplicate coproduct option key`;
                diagnostics.push({ from, to, message, severity: "error" });
            }
            const expression = option.getChild("Expression");
            options[key] =
                expression === null
                    ? apg_1.APG.product({})
                    : getType(state, diagnostics, expression);
        }
        return { type: "coproduct", options };
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