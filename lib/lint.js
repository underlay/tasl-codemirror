"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaLinter = exports.errorUnit = void 0;
const apg_1 = require("@underlay/apg");
const stdlib_js_1 = require("./stdlib.js");
const uriPattern = /^[a-z]+:[a-zA-Z0-9-/_.:#]+$/;
const namespacePattern = /[#/]$/;
exports.errorUnit = Object.freeze({ type: "unit" });
const schemaLinter = (onChange) => (view) => {
    const cursor = view.state.tree.cursor();
    // printSyntax("", cursor.node)
    const state = {
        view: view,
        diagnostics: [],
        namespaces: {},
        backReferences: new Map(),
        types: { ...stdlib_js_1.defaultTypes },
        schema: {},
    };
    if (cursor.name === "Schema") {
        cursor.firstChild();
    }
    else {
        onChange({ state: view.state, schema: {}, namespaces: {} });
        return [];
    }
    do {
        if (cursor.type.isError) {
        }
        else if (cursor.type.name === "Namespace") {
            let namespace = null;
            const uri = cursor.node.getChild("Uri");
            if (uri !== null) {
                const { from, to } = uri;
                namespace = view.state.doc.sliceString(from, to);
                if (!uriPattern.test(namespace)) {
                    const message = `Invalid URI: URIs must match ${uriPattern.source}`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else if (!namespacePattern.test(namespace)) {
                    const message = "Invalid namespace: namespaces must end in / or #";
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
            }
            const identifier = cursor.node.getChild("Prefix");
            if (identifier !== null) {
                const { from, to } = identifier;
                const prefix = view.state.doc.sliceString(from, to);
                if (prefix in state.namespaces) {
                    const message = `Duplicate namespace: ${prefix}`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.namespaces[prefix] = namespace;
                }
            }
        }
        else if (cursor.type.name === "Type") {
            const identifier = cursor.node.getChild("TypeName");
            const expression = cursor.node.getChild("Expression");
            const type = expression === null ? exports.errorUnit : getType(state, expression);
            if (identifier !== null) {
                const { from, to } = identifier;
                const name = view.state.doc.sliceString(from, to);
                if (name in state.types) {
                    const message = `Invalid type declaration: type ${name} has already been declared`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    state.types[name] = type;
                }
            }
        }
        else if (cursor.type.name === "Class") {
            const node = cursor.node.getChild("Uri");
            if (node !== null) {
                const uri = getURI(state, node);
                if (uri !== null) {
                    if (uri in state.schema) {
                        const { from, to } = node;
                        const message = `Invalid class declaration: class ${uri} has already been declared`;
                        state.diagnostics.push({ from, to, message, severity: "error" });
                    }
                    else {
                        const expression = cursor.node.getChild("Expression");
                        state.schema[uri] =
                            expression === null ? exports.errorUnit : getType(state, expression);
                    }
                }
            }
        }
        else if (cursor.type.name === "Edge") {
            const uris = cursor.node.getChildren("Uri");
            const names = uris.map((uri) => getURI(state, uri));
            if (uris.length === 3 && names.length === 3) {
                const [sourceNode, labelNode, targetNode] = uris;
                const [source, label, target] = names;
                if (label in state.schema) {
                    const { from, to } = labelNode;
                    const message = `Invalid edge declaration: class ${label} has already been declared`;
                    state.diagnostics.push({ from, to, message, severity: "error" });
                }
                else {
                    if (!(source in state.schema)) {
                        const message = `Invalid edge declaration: source class ${source} is not defined`;
                        const { to, from } = sourceNode;
                        const d = { to, from, message, severity: "error" };
                        state.backReferences.set(d, source);
                    }
                    if (!(target in state.schema)) {
                        const message = `Invalid edge declaration: target class ${target} is not defined`;
                        const { to, from } = targetNode;
                        const d = { to, from, message, severity: "error" };
                        state.backReferences.set(d, target);
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
        reportChildErrors(state, cursor);
    } while (cursor.nextSibling());
    const namespaces = Object.entries(state.namespaces).filter(([_, base]) => base !== null);
    onChange({
        state: view.state,
        schema: state.schema,
        namespaces: Object.fromEntries(namespaces),
    });
    const sorted = state.diagnostics
        .filter((d) => {
        const key = state.backReferences.get(d);
        if (key === undefined) {
            return true;
        }
        else if (key in state.schema) {
            return false;
        }
        else {
            return true;
        }
    })
        .sort(({ from: a, to: c }, { from: b, to: d }) => a < b ? -1 : b < a ? 1 : c < d ? -1 : d < c ? 1 : 0);
    return sorted;
};
exports.schemaLinter = schemaLinter;
function getURI(state, node) {
    const { from, to } = node;
    const value = state.view.state.doc.sliceString(from, to);
    const index = value.indexOf(":");
    if (index === -1) {
        const message = `Invalid URI: URIs must be of the form [namespace]:[path]`;
        state.diagnostics.push({ from, to, message, severity: "error" });
        return value;
    }
    const prefix = value.slice(0, index);
    if (prefix in state.namespaces) {
        const namespace = state.namespaces[prefix];
        return namespace === null ? value : namespace + value.slice(index + 1);
    }
    const message = `Invalid URI: namespace ${prefix} is not defined`;
    state.diagnostics.push({ from, to, message, severity: "error" });
    return value;
}
// Variable | Optional | Reference | Unit | Iri | Literal | Product | Coproduct
function getType(state, node) {
    if (node.name === "Variable") {
        const { from, to } = node;
        const value = state.view.state.doc.sliceString(from, to);
        if (value in state.types) {
            return state.types[value];
        }
        else {
            const message = `Type ${value} is not defined`;
            state.diagnostics.push({ from, to, message, severity: "error" });
            return exports.errorUnit;
        }
    }
    else if (node.name === "Optional") {
        const expression = node.getChild("Expression");
        const type = expression === null ? exports.errorUnit : getType(state, expression);
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
        const key = getURI(state, uri);
        if (!(key in state.schema)) {
            const { to, from } = uri;
            const message = `Reference error: class ${key} is not defined`;
            const d = { to, from, message, severity: "error" };
            state.backReferences.set(d, key);
            state.diagnostics.push(d);
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
        const datatype = getURI(state, uri);
        return { type: "literal", datatype };
    }
    else if (node.name === "Product") {
        const components = {};
        for (const component of node.getChildren("Component")) {
            const uri = component.getChild("Uri");
            if (uri === null) {
                continue;
            }
            const key = getURI(state, uri);
            if (key in components) {
                const { to, from } = uri;
                const message = `Duplicate product component key`;
                state.diagnostics.push({ to, from, message, severity: "error" });
            }
            else {
                const expression = component.getChild("Expression");
                components[key] =
                    expression === null ? exports.errorUnit : getType(state, expression);
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
            const key = getURI(state, uri);
            if (key in options) {
                const { to, from } = uri;
                const message = `Duplicate coproduct option key`;
                state.diagnostics.push({ to, from, message, severity: "error" });
            }
            else {
                const expression = option.getChild("Expression");
                options[key] =
                    expression === null ? exports.errorUnit : getType(state, expression);
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
function reportChildErrors(state, cursor) {
    if (cursor.type.isError) {
        const { from, to } = cursor;
        const message = `Syntax error: unexpected or missing token (that's all we know)`;
        state.diagnostics.push({ from, to, message, severity: "error" });
    }
    if (cursor.firstChild()) {
        do {
            reportChildErrors(state, cursor);
        } while (cursor.nextSibling());
        cursor.parent();
    }
}
//# sourceMappingURL=lint.js.map