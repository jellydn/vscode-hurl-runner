import { describe, expect, it } from "vitest";
import { isValidJsonStructure, formatJsonString } from "../src/json-utils.js";

describe("isValidJsonStructure", () => {
	it("should validate simple objects", () => {
		expect(isValidJsonStructure('{"name": "test"}')).toBe(true);
		expect(isValidJsonStructure('{"a": 1, "b": 2}')).toBe(true);
	});

	it("should validate simple arrays", () => {
		expect(isValidJsonStructure('[1, 2, 3]')).toBe(true);
		expect(isValidJsonStructure('["a", "b", "c"]')).toBe(true);
	});

	it("should validate nested structures", () => {
		expect(isValidJsonStructure('{"nested": {"inner": "value"}}')).toBe(true);
		expect(isValidJsonStructure('[{"a": 1}, {"b": 2}]')).toBe(true);
		expect(isValidJsonStructure('{"array": [1, 2, {"nested": "value"}]}')).toBe(true);
	});

	it("should validate empty structures", () => {
		expect(isValidJsonStructure('{}')).toBe(true);
		expect(isValidJsonStructure('[]')).toBe(true);
		expect(isValidJsonStructure('{"empty": {}}')).toBe(true);
		expect(isValidJsonStructure('{"emptyArray": []}')).toBe(true);
	});

	it("should handle strings with escaped quotes", () => {
		expect(isValidJsonStructure('{"quote": "He said \\"hello\\""}')).toBe(true);
		expect(isValidJsonStructure('{"nested": "{\\"inner\\": \\"value\\"}"}')).toBe(true);
	});

	it("should handle strings with backslashes", () => {
		expect(isValidJsonStructure('{"path": "C:\\\\Users\\\\test"}')).toBe(true);
		expect(isValidJsonStructure('{"regex": "\\\\d+\\\\w*"}')).toBe(true);
	});

	it("should reject unbalanced brackets", () => {
		expect(isValidJsonStructure('{"unbalanced": "test"')).toBe(false);
		expect(isValidJsonStructure('[1, 2, 3')).toBe(false);
		expect(isValidJsonStructure('{"extra": "brace"}}')).toBe(false);
		expect(isValidJsonStructure('[1, 2, 3]]')).toBe(false);
	});

	it("should reject unclosed strings", () => {
		expect(isValidJsonStructure('{"unclosed": "test')).toBe(false);
		expect(isValidJsonStructure('{"name": "John", "city": "New York}')).toBe(false);
	});

	it("should handle Unicode escape sequences", () => {
		expect(isValidJsonStructure('{"unicode": "\\u0048\\u0065\\u006C\\u006C\\u006F"}')).toBe(true);
		expect(isValidJsonStructure('{"emoji": "\\ud83d\\ude00"}')).toBe(true);
	});

	it("should handle mixed content", () => {
		expect(isValidJsonStructure('{"string": "test", "number": 123, "boolean": true, "null": null}')).toBe(true);
		expect(isValidJsonStructure('[true, false, null, 0, "string"]')).toBe(true);
	});
});

describe("formatJsonString", () => {
	it("should format simple objects with proper indentation", () => {
		const input = '{"name":"John","age":30}';
		const expected = '{\n  "name": "John",\n  "age": 30\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should format simple arrays with proper indentation", () => {
		const input = '[1,2,3]';
		const expected = '[\n  1,\n  2,\n  3\n]';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should preserve large integers without parsing", () => {
		const input = '{"largeNumber":12345678901234567890}';
		const expected = '{\n  "largeNumber": "12345678901234567890"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle nested objects", () => {
		const input = '{"user":{"name":"John","details":{"age":30,"city":"NYC"}}}';
		const expected = '{\n  "user": {\n    "name": "John",\n    "details": {\n      "age": 30,\n      "city": "NYC"\n    }\n  }\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle nested arrays", () => {
		const input = '[1,[2,3],4]';
		const expected = '[\n  1,\n  [\n    2,\n    3\n  ],\n  4\n]';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle empty objects and arrays", () => {
		expect(formatJsonString('{}')).toBe('{}');
		expect(formatJsonString('[]')).toBe('[]');
		expect(formatJsonString('{"empty":{}}')).toBe('{\n  "empty": {}\n}');
		expect(formatJsonString('{"emptyArray":[]}')).toBe('{\n  "emptyArray": []\n}');
	});

	it("should handle strings with escaped quotes", () => {
		const input = '{"quote":"He said \\"hello\\""}';
		const expected = '{\n  "quote": "He said \\"hello\\""\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle strings with backslashes", () => {
		const input = '{"path":"C:\\\\Users\\\\test"}';
		const expected = '{\n  "path": "C:\\\\Users\\\\test"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle trailing backslashes", () => {
		const input = '{"data":"some text\\\\"}';
		const expected = '{\n  "data": "some text\\\\"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle Unicode escape sequences", () => {
		const input = '{"unicode":"\\u0048\\u0065\\u006C\\u006C\\u006F"}';
		const expected = '{\n  "unicode": "Hello"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle mixed escapes and content", () => {
		const input = '{"mixed":"text with \\"quotes\\" and \\\\backslashes\\\\"}';
		const expected = '{\n  "mixed": "text with \\"quotes\\" and \\\\backslashes\\\\"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle nested quotes in strings", () => {
		const input = '{"json":"{\\"nested\\": \\"value\\"}"}';
		const expected = '{\n  "json": "{\\"nested\\": \\"value\\"}"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle complex mixed content", () => {
		const input = '{"string":"test","number":123,"boolean":true,"null":null,"array":[1,2,3],"object":{"nested":"value"}}';
		const expected = '{\n  "string": "test",\n  "number": 123,\n  "boolean": true,\n  "null": null,\n  "array": [\n    1,\n    2,\n    3\n  ],\n  "object": {\n    "nested": "value"\n  }\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle whitespace in input", () => {
		const input = ' { "name" : "John" , "age" : 30 } ';
		const expected = '{\n  "name": "John",\n  "age": 30\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should preserve precision for very large numbers", () => {
		const input = '{"veryLarge":999999999999999999999999999999}';
		const expected = '{\n  "veryLarge": "999999999999999999999999999999"\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle decimal numbers", () => {
		const input = '{"decimal":123.456789}';
		const expected = '{\n  "decimal": 123.456789\n}';
		expect(formatJsonString(input)).toBe(expected);
	});

	it("should handle scientific notation", () => {
		const input = '{"scientific":1.23e-4}';
		const expected = '{\n  "scientific": 0.000123\n}';
		expect(formatJsonString(input)).toBe(expected);
	});
});