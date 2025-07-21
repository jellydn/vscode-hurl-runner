/**
 * Check if JSON string has balanced brackets, braces, and properly closed strings.
 * This performs lightweight structural validation without parsing to avoid precision loss.
 * Note: Does not validate full JSON syntax (colons, commas, values, etc.).
 * For production use, consider using a library like json-bigint for robust validation.
 */
export function isValidJsonStructure(jsonStr: string): boolean {
	// Quick check for empty or whitespace-only strings
	const trimmed = jsonStr.trim();
	if (!trimmed) return false;
	
	// Must start and end with proper JSON delimiters
	if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
		  (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
		return false;
	}

	let bracketCount = 0;
	let braceCount = 0;
	let inString = false;
	let escaped = false;
	let expectingValue = false;
	let expectingKey = false;

	for (let i = 0; i < jsonStr.length; i++) {
		const char = jsonStr[i];
		const nextChar = jsonStr[i + 1];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (char === "\\" && inString) {
			escaped = true;
			continue;
		}

		if (char === '"' && !escaped) {
			inString = !inString;
			continue;
		}

		if (inString) {
			continue;
		}

		// Skip whitespace
		if (/\s/.test(char)) {
			continue;
		}

		if (char === "{") {
			braceCount++;
			expectingKey = true;
		} else if (char === "}") {
			braceCount--;
			expectingKey = false;
			expectingValue = false;
		} else if (char === "[") {
			bracketCount++;
			expectingValue = true;
		} else if (char === "]") {
			bracketCount--;
			expectingValue = false;
		} else if (char === ",") {
			// Check for trailing commas (common error)
			if (nextChar && /\s*[}\]]/.test(nextChar)) {
				return false;
			}
			if (braceCount > 0) expectingKey = true;
			if (bracketCount > 0) expectingValue = true;
		}

		// Basic validation: brackets/braces should never go negative
		if (bracketCount < 0 || braceCount < 0) {
			return false;
		}
	}

	// All brackets/braces should be balanced and strings should be closed
	return bracketCount === 0 && braceCount === 0 && !inString;
}

/**
 * Format JSON string with proper indentation while preserving large number precision.
 * This avoids using JSON.parse/JSON.stringify which lose precision for large integers.
 */
export function formatJsonString(jsonStr: string): string {
	let result = "";
	let indentLevel = 0;
	let inString = false;
	let escaped = false;

	for (let i = 0; i < jsonStr.length; i++) {
		const char = jsonStr[i];
		const nextChar = jsonStr[i + 1];

		if (escaped) {
			result += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && inString) {
			result += char;
			escaped = true;
			continue;
		}

		if (char === '"' && !escaped) {
			inString = !inString;
			result += char;
			continue;
		}

		if (inString) {
			result += char;
			continue;
		}

		// Handle whitespace outside strings
		if (/\s/.test(char)) {
			continue;
		}

		// Handle structural characters
		if (char === "{" || char === "[") {
			result += char;
			if (nextChar !== "}" && nextChar !== "]") {
				indentLevel++;
				result += `\n${"  ".repeat(indentLevel)}`;
			}
		} else if (char === "}" || char === "]") {
			// Check if this is closing an empty container
			const isEmptyContainer = result.endsWith("{") || result.endsWith("[");

			if (!isEmptyContainer) {
				if (result.trim().endsWith(",")) {
					result = `${result.trimEnd().slice(0, -1)}\n`;
				} else if (!result.endsWith("\n")) {
					result += "\n";
				}
				indentLevel--;
				result += "  ".repeat(indentLevel);
			}
			result += char;
		} else if (char === ",") {
			result += `${char}\n${"  ".repeat(indentLevel)}`;
		} else if (char === ":") {
			result += `${char} `;
		} else {
			result += char;
		}
	}

	return result;
}