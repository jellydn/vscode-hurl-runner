/**
 * Format JSON string with proper indentation while preserving number precision.
 * This avoids JSON.parse/stringify which can lose precision for large integers.
 */
export function formatJsonString(jsonString: string): string {
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