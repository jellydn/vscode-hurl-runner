import { describe, expect, it } from "vitest";
import { formatJsonString } from "../src/format-json-string";

describe("formatJsonString", () => {
	it.each([
		String.raw`"\u0041"`,
		String.raw`"He said \"Hello\""`,
		String.raw`"path\\"`,
		String.raw`"\\\"\n\t\u263a {},:[]"`,
	])("preserves string escapes in %s", (value) => {
		expect(formatJsonString(`{"value":${value}}`)).toBe(
			`{\n  "value": ${value}\n}`,
		);
	});

	it.each(["{}", "[]"])("preserves empty %s", (value) => {
		expect(formatJsonString(value)).toBe(value);
	});

	it("collapses whitespace-only containers without changing sibling indentation", () => {
		expect(
			formatJsonString('{ "a": { \n\t }, "b": [\r\n ], "c": [{ }, [ ], 2] }'),
		).toBe(
			'{\n  "a": {},\n  "b": [],\n  "c": [\n    {},\n    [],\n    2\n  ]\n}',
		);
		expect(formatJsonString(" \t{ \r\n } ")).toBe("{}");
		expect(formatJsonString("[ \t ]")).toBe("[]");
	});

	it("indents nested containers and preserves number tokens", () => {
		const input =
			'{"id":900719925474099312345,"values":[{},[],{"n":-1.2300e+45}],"ok":true,"none":null}';
		const expected =
			'{\n  "id": 900719925474099312345,\n  "values": [\n    {},\n    [],\n    {\n      "n": -1.2300e+45\n    }\n  ],\n  "ok": true,\n  "none": null\n}';
		expect(formatJsonString(input)).toBe(expected);
		expect(formatJsonString(expected)).toBe(expected);
	});
});
