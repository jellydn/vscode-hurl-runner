import JSONBigInt from 'json-bigint';

// Configure json-bigint to preserve large integers as strings
const JSONBig = JSONBigInt({
	storeAsString: true, // Store large numbers as strings to preserve precision
	useNativeBigInt: false // Don't use native BigInt to maintain compatibility
});

/**
 * Validates JSON syntax using json-bigint library while preserving large number precision.
 * This provides robust JSON validation without losing precision for large integers.
 */
export function isValidJsonStructure(jsonStr: string): boolean {
	try {
		JSONBig.parse(jsonStr);
		return true;
	} catch {
		return false;
	}
}

/**
 * Format JSON string with proper indentation while preserving large number precision.
 * Uses json-bigint to parse and stringify, ensuring large integers are preserved.
 */
export function formatJsonString(jsonStr: string): string {
	try {
		// Parse with json-bigint to preserve large numbers
		const parsed = JSONBig.parse(jsonStr);
		// Stringify with indentation while preserving precision
		return JSONBig.stringify(parsed, null, 2);
	} catch {
		// If formatting fails, return original string
		return jsonStr;
	}
}