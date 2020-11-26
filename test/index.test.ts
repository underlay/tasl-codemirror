import { parser } from "../grammar/index.js"

test("Single comment", () => {
	const tree = parser.parse(`# this is a comment`)
	expect(tree.type.name).toBe("Schema")
	expect(tree.children.length).toBe(1)
	expect(tree.children[0].type.name).toBe("Comment")
})

test("Several comments", () => {
	const tree = parser.parse(`# this is a comment
# and another comment

#a last comment
`)

	const cursor = tree.cursor()
	const names = ["Schema", "Comment", "Comment", "Comment"]
	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})

test("Single prefix", () => {
	const tree = parser.parse(`namespace schema http://schema.org/`)
	const cursor = tree.cursor()
	const names = ["Schema", "Namespace", "namespace", "Prefix", "Uri"]
	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})

test("Single variable", () => {
	const tree = parser.parse(`type foo !`)
	const cursor = tree.cursor()
	const names = ["Schema", "Type", "type", "TypeName", "Unit"]
	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})

test("Simple class", () => {
	const tree = parser.parse(`class foo:bar !`)
	const cursor = tree.cursor()
	const names = ["Schema", "Class", "class", "Uri", "Unit"]
	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})

test("Medium class", () => {
	const tree = parser.parse(`class ex:foo { ex:bar -> <>; ex:baz -> ? <> }`)
	const cursor = tree.cursor()
	const names = [
		"Schema",
		"Class",
		"class",
		"Uri",
		"Product",
		"Component",
		"Uri",
		"Iri",
		"Component",
		"Uri",
		"Optional",
		"Iri",
	]
	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})

test("Complex class", () => {
	const tree = parser.parse(
		`class foo:bar?[<> >- ex:foo;{ex:baz->fjdkals} >- ex:bar]`
	)
	const cursor = tree.cursor()
	const names = [
		"Schema",
		"Class",
		"class",
		"Uri",
		"Optional",
		"Coproduct",
		"Option",
		"Iri",
		"Uri",
		"Option",
		"Product",
		"Component",
		"Uri",
		"Variable",
		"Uri",
	]

	const iter = names[Symbol.iterator]()
	do {
		const { value } = iter.next()
		expect(cursor.name).toBe(value)
	} while (cursor.next())
})
