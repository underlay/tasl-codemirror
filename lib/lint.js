"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaLinter = exports.errorUnit = void 0;
const apg_1 = require("@underlay/apg");
const stdlib_js_1 = require("./stdlib.js");
const apg_schema_parser_1 = require("@underlay/apg-schema-parser");
exports.errorUnit = Object.freeze({ type: "unit" });
const schemaLinter = (onChange) => (view) => {
    const cursor = view.state.tree.cursor();
    const state = {
        slice: ({ from, to }) => view.state.doc.sliceString(from, to),
        namespaces: {},
        references: [],
        types: { ...stdlib_js_1.defaultTypes },
        schema: {},
    };
    const diagnostics = [];
    if (cursor.name === "Schema") {
        cursor.firstChild();
    }
    else {
        onChange({ errors: 1, state: view.state, schema: {}, namespaces: {} });
        return [];
    }
    do {
        if (cursor.type.isError) {
        }
        else if (cursor.type.name === "Namespace") {
            let namespace = "";
            const uri = cursor.node.getChild("Uri");
            if (uri !== null) {
                namespace = state.slice(uri);
                if (!apg_schema_parser_1.uriPattern.test(namespace)) {
                    const { from, to } = uri;
                    const message = `Invalid URI: URIs must match ${apg_schema_parser_1.uriPattern.source}`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else if (!apg_schema_parser_1.namespacePattern.test(namespace)) {
                    const { from, to } = uri;
                    const message = "Invalid namespace: namespaces must end in / or #";
                    diagnostics.push({ from, to, message, severity: "error" });
                }
            }
            const identifier = cursor.node.getChild("Prefix");
            if (identifier !== null) {
                const prefix = state.slice(identifier);
                if (prefix in state.namespaces) {
                    const { from, to } = identifier;
                    const message = `Duplicate namespace: ${prefix}`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.namespaces[prefix] = namespace;
                }
            }
        }
        else if (cursor.type.name === "Type") {
            const identifier = cursor.node.getChild("TypeName");
            const expression = cursor.node.getChild("Expression");
            const type = expression === null
                ? exports.errorUnit
                : getType(state, diagnostics, expression);
            if (identifier !== null) {
                const name = state.slice(identifier);
                if (name in state.types) {
                    const { from, to } = identifier;
                    const message = `Invalid type declaration: type ${name} has already been declared`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.types[name] = type;
                }
            }
        }
        else if (cursor.type.name === "Class") {
            const node = cursor.node.getChild("Uri");
            if (node !== null) {
                const uri = getURI(state, diagnostics, node);
                if (uri !== null) {
                    if (uri in state.schema) {
                        const { from, to } = node;
                        const message = `Invalid class declaration: class ${uri} has already been declared`;
                        diagnostics.push({ from, to, message, severity: "error" });
                    }
                    else {
                        const expression = cursor.node.getChild("Expression");
                        state.schema[uri] =
                            expression === null
                                ? exports.errorUnit
                                : getType(state, diagnostics, expression);
                    }
                }
            }
        }
        else if (cursor.type.name === "Edge") {
            const uris = cursor.node.getChildren("Uri");
            const names = uris.map((uri) => getURI(state, diagnostics, uri));
            if (uris.length === 3 && names.length === 3) {
                const [sourceNode, labelNode, targetNode] = uris;
                const [source, label, target] = names;
                if (label in state.schema) {
                    const { from, to } = labelNode;
                    const message = `Invalid edge declaration: class ${label} has already been declared`;
                    diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    if (!(source in state.schema)) {
                        const { from, to } = sourceNode;
                        state.references.push({ from, to, key: source });
                    }
                    if (!(target in state.schema)) {
                        const { from, to } = targetNode;
                        state.references.push({ from, to, key: target });
                    }
                    state.schema[label] = {
                        type: "product",
                        components: {
                            [apg_1.ns.source]: { type: "reference", value: source },
                            [apg_1.ns.target]: { type: "reference", value: target },
                        },
                    };
                }
            }
        }
        reportChildErrors(diagnostics, cursor);
    } while (cursor.nextSibling());
    const namespaces = Object.entries(state.namespaces).filter(([_, base]) => base !== null);
    for (const { from, to, key } of state.references) {
        if (key in state.schema) {
            continue;
        }
        else {
            const message = `Reference error: class ${key} is not defined`;
            diagnostics.push({ from, to, message, severity: "error" });
        }
    }
    const sorted = diagnostics.sort(({ from: a, to: c }, { from: b, to: d }) => a < b ? -1 : b < a ? 1 : c < d ? -1 : d < c ? 1 : 0);
    onChange({
        errors: sorted.length,
        state: view.state,
        schema: state.schema,
        namespaces: Object.fromEntries(namespaces),
    });
    return sorted;
};
exports.schemaLinter = schemaLinter;
function getURI(state, diagnostics, node) {
    try {
        return apg_schema_parser_1.parseURI(state, node);
    }
    catch (e) {
        if (e instanceof apg_schema_parser_1.LintError) {
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
            return exports.errorUnit;
        }
    }
    else if (node.name === "Optional") {
        const expression = node.getChild("Expression");
        const type = expression === null ? exports.errorUnit : getType(state, diagnostics, expression);
        return {
            type: "coproduct",
            options: { [apg_1.ns.none]: { type: "unit" }, [apg_1.ns.some]: type },
        };
    }
    else if (node.name === "Reference") {
        const uri = node.getChild("Uri");
        if (uri === null) {
            return exports.errorUnit;
        }
        const key = getURI(state, diagnostics, uri);
        if (!(key in state.schema)) {
            const { from, to } = uri;
            state.references.push({ from, to, key });
        }
        return { type: "reference", value: key };
    }
    else if (node.name === "Unit") {
        return { type: "unit" };
    }
    else if (node.name === "Iri") {
        return { type: "uri" };
    }
    else if (node.name === "Literal") {
        const uri = node.getChild("Uri");
        if (uri === null) {
            return exports.errorUnit;
        }
        const datatype = getURI(state, diagnostics, uri);
        return { type: "literal", datatype };
    }
    else if (node.name === "Product") {
        const components = {};
        for (const component of node.getChildren("Component")) {
            const uri = component.getChild("Uri");
            if (uri === null) {
                continue;
            }
            const key = getURI(state, diagnostics, uri);
            if (key in components) {
                const { from, to } = uri;
                const message = `Duplicate product component key`;
                diagnostics.push({ from, to, message, severity: "error" });
            }
            else {
                const expression = component.getChild("Expression");
                components[key] =
                    expression === null
                        ? exports.errorUnit
                        : getType(state, diagnostics, expression);
            }
        }
        return { type: "product", components };
    }
    else if (node.name === "Coproduct") {
        const options = {};
        for (const option of node.getChildren("Option")) {
            const uri = option.getChild("Uri");
            if (uri === null) {
                continue;
            }
            const key = getURI(state, diagnostics, uri);
            if (key in options) {
                const { from, to } = uri;
                const message = `Duplicate coproduct option key`;
                diagnostics.push({ from, to, message, severity: "error" });
            }
            else {
                const expression = option.getChild("Expression");
                options[key] =
                    expression === null
                        ? exports.errorUnit
                        : getType(state, diagnostics, expression);
            }
        }
        return { type: "coproduct", options };
    }
    else {
        return { type: "unit" };
    }
}
// function printSyntax(prefix: string, node: SyntaxNode) {
// 	console.log(`${prefix}- ${node.type.name} ${node.from} ${node.to}`)
// 	for (let child = node.firstChild; child !== null; child = child.nextSibling) {
// 		printSyntax(prefix + "  ", child)
// 	}
// }
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