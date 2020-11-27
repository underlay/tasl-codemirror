"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTypes = void 0;
const n3_ts_1 = require("n3.ts");
exports.defaultTypes = {
    unit: { type: "unit" },
    uri: { type: "uri" },
    decimal: { type: "literal", datatype: n3_ts_1.xsd.decimal },
    boolean: { type: "literal", datatype: n3_ts_1.xsd.boolean },
    double: { type: "literal", datatype: n3_ts_1.xsd.double },
    integer: { type: "literal", datatype: n3_ts_1.xsd.integer },
    string: { type: "literal", datatype: n3_ts_1.xsd.string },
    date: { type: "literal", datatype: n3_ts_1.xsd.date },
    dateTime: { type: "literal", datatype: n3_ts_1.xsd.dateTime },
    hexBinary: { type: "literal", datatype: n3_ts_1.xsd.hexBinary },
    base64Binary: { type: "literal", datatype: n3_ts_1.xsd.base64Binary },
    JSON: { type: "literal", datatype: n3_ts_1.rdf.JSON },
};
//# sourceMappingURL=stdlib.js.map