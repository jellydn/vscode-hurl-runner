import { describe, expect, it } from "vitest";

/**
 * Format JSON string with proper indentation while preserving number precision.
 * This avoids JSON.parse/stringify which can lose precision for large integers.
 */
function formatJsonString(jsonString: string): string {
	// Simple JSON formatter that preserves original number strings
	let formatted = "";
	let indentLevel = 0;
	let inString = false;
	let escapeNext = false;
	
	for (let i = 0; i < jsonString.length; i++) {
		const char = jsonString[i];
		const nextChar = jsonString[i + 1];
		
		if (escapeNext) {
			formatted += char;
			escapeNext = false;
			continue;
		}
		
		if (char === '\\' && inString) {
			formatted += char;
			escapeNext = true;
			continue;
		}
		
		if (char === '"') {
			inString = !inString;
			formatted += char;
			continue;
		}
		
		if (inString) {
			formatted += char;
			continue;
		}
		
		switch (char) {
			case '{':
			case '[':
				formatted += char;
				if (nextChar !== '}' && nextChar !== ']') {
					indentLevel++;
					formatted += `\n${'  '.repeat(indentLevel)}`;
				}
				break;
			case '}':
			case ']':
				if (formatted.trim().endsWith('{') || formatted.trim().endsWith('[')) {
					// Empty object/array
					formatted += char;
				} else {
					indentLevel--;
					formatted += `\n${'  '.repeat(indentLevel)}${char}`;
				}
				break;
			case ',':
				formatted += char;
				if (nextChar !== '}' && nextChar !== ']') {
					formatted += `\n${'  '.repeat(indentLevel)}`;
				}
				break;
			case ':':
				formatted += `${char} `;
				break;
			default:
				if (char !== ' ' && char !== '\n' && char !== '\t') {
					formatted += char;
				}
		}
	}
	
	return formatted;
}

describe("JSON Formatting", () => {
	it("should preserve large integer precision", () => {
		const input = '{"id": 1938431323912392709, "name": "test"}';
		const formatted = formatJsonString(input);
		
		// Check that the large integer is preserved exactly
		expect(formatted).toContain("1938431323912392709");
		expect(formatted).not.toContain("1938431323912392700");
	});

	it("should format JSON with proper indentation", () => {
		const input = '{"name":"John","age":30,"city":"New York"}';
		const formatted = formatJsonString(input);
		
		const expected = `{
  "name": "John",
  "age": 30,
  "city": "New York"
}`;
		
		expect(formatted).toBe(expected);
	});

	it("should handle nested objects", () => {
		const input = '{"user":{"id":1938431323912392709,"profile":{"name":"John"}}}';
		const formatted = formatJsonString(input);
		
		const expected = `{
  "user": {
    "id": 1938431323912392709,
    "profile": {
      "name": "John"
    }
  }
}`;
		
		expect(formatted).toBe(expected);
	});

	it("should handle arrays", () => {
		const input = '[1938431323912392709,1938431323912392710]';
		const formatted = formatJsonString(input);
		
		const expected = `[
  1938431323912392709,
  1938431323912392710
]`;
		
		expect(formatted).toBe(expected);
	});

	it("should handle empty objects and arrays", () => {
		expect(formatJsonString('{}')).toBe('{}');
		expect(formatJsonString('[]')).toBe('[]');
	});

	it("should handle strings with quotes", () => {
		const input = '{"message":"Hello world","path":"C:\\\\Users"}';
		const formatted = formatJsonString(input);
		
		const expected = `{
  "message": "Hello world",
  "path": "C:\\\\Users"
}`;
		
		expect(formatted).toBe(expected);
	});

	it("should demonstrate the precision issue with standard JSON methods", () => {
		const largeNumber = "1938431323912392709";
		const jsonString = `{"id": ${largeNumber}}`;
		
		// This is what happens with standard JSON.parse/stringify (loses precision)
		const parsedAndStringified = JSON.stringify(JSON.parse(jsonString), null, 2);
		expect(parsedAndStringified).toContain("1938431323912392700"); // Wrong!
		
		// Our formatter preserves precision
		const ourFormatted = formatJsonString(jsonString);
		expect(ourFormatted).toContain("1938431323912392709"); // Correct!
	});
});