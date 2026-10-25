/** Format JSON without parsing numbers or changing string escapes. */
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
