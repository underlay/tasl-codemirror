import { APG } from "@underlay/apg"
import { rdf, xsd } from "n3.ts"

export const defaultTypes = new Map<string, APG.Type>([
	["unit", { type: "unit" }],
	["uri", { type: "iri" }],
	["decimal", { type: "literal", datatype: xsd.decimal }],
	["boolean", { type: "literal", datatype: xsd.boolean }],
	["double", { type: "literal", datatype: xsd.double }],
	["integer", { type: "literal", datatype: xsd.integer }],
	["string", { type: "literal", datatype: xsd.string }],
	["date", { type: "literal", datatype: xsd.date }],
	["dateTime", { type: "literal", datatype: xsd.dateTime }],
	["hexBinary", { type: "literal", datatype: xsd.hexBinary }],
	["base64Binary", { type: "literal", datatype: xsd.base64Binary }],
	["JSON", { type: "literal", datatype: rdf.JSON }],
])
