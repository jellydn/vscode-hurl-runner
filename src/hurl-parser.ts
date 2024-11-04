interface ParsedEntry {
	requestMethod: string;
	requestUrl: string;
	requestHeaders: Record<string, string>;
	response: {
		status: string;
		headers: Record<string, string>;
		body: string;
	};
	curlCommand?: string;
	timings?: Record<string, string>;
	captures?: Record<string, string>;
}

export interface ParsedHurlOutput {
	entries: ParsedEntry[];
}

function formatTimings(
	timings: Record<string, string>,
): Record<string, string> {
	const formattedTimings: Record<string, string> = {};

	for (const [key, value] of Object.entries(timings)) {
		if (key !== "begin" && key !== "end") {
			if (value.endsWith("µs")) {
				// Convert microseconds to a more readable format
				const microseconds = Number.parseInt(value.slice(0, -3));
				let formattedValue: string;
				if (microseconds >= 1000000) {
					formattedValue = `${(microseconds / 1000000).toFixed(2)} s`;
				} else if (microseconds >= 1000) {
					formattedValue = `${(microseconds / 1000).toFixed(2)} ms`;
				} else {
					formattedValue = `${microseconds} µs`;
				}
				formattedTimings[key] = formattedValue;
			} else {
				formattedTimings[key] = value;
			}
		}
	}

	return formattedTimings;
}

// Refer https://hurl.dev/docs/manual.html#verbose
// A line starting with ‘>’ means data sent by Hurl.
// A line staring with ‘<’ means data received by Hurl.
// A line starting with ‘*’ means additional info provided by Hurl.
export function parseHurlOutput(
	stderr: string,
	stdout: string,
): ParsedHurlOutput {
	const lines = stderr.split("\n");
	const entries: ParsedEntry[] = [];
	let currentEntry: ParsedEntry | null = null;
	let isResponseHeader = false;
	let isTimings = false;
	let isCaptures = false;

	for (const line of lines) {
		if (line.startsWith("* Executing entry")) {
			if (currentEntry) {
				entries.push(currentEntry);
			}
			currentEntry = {
				requestMethod: "",
				requestUrl: "",
				requestHeaders: {},
				response: {
					status: "",
					headers: {},
					body: "",
				},
				timings: {},
				captures: {},
			};
			isResponseHeader = false;
			isTimings = false;
			isCaptures = false;
		} else if (line.startsWith("* Request:")) {
			const match = line.match(/\* Request:\s*\* (\w+) (.*)/);
			if (match && currentEntry) {
				currentEntry.requestMethod = match[1];
				currentEntry.requestUrl = match[2];
			}
		} else if (line.startsWith("* curl")) {
			if (currentEntry) {
				currentEntry.curlCommand = line.slice(2).trim();
			}
		} else if (line.startsWith("> ")) {
			if (
				line.startsWith("> GET ") ||
				line.startsWith("> POST ") ||
				line.startsWith("> PUT ") ||
				line.startsWith("> DELETE ")
			) {
				const [method, path] = line.slice(2).split(" ");
				if (currentEntry) {
					currentEntry.requestMethod = method;
					currentEntry.requestUrl = path;
				}
			} else {
				const [key, ...values] = line.slice(2).split(":");
				if (key && values.length && currentEntry) {
					currentEntry.requestHeaders[key.trim()] = values.join(":").trim();
				}
			}
		} else if (line.startsWith("< ")) {
			isResponseHeader = true;
			if (line.startsWith("< HTTP/")) {
				if (currentEntry) {
					currentEntry.response.status = line.slice(2);
				}
			} else {
				const [key, ...values] = line.slice(2).split(":");
				if (key && values.length && currentEntry) {
					currentEntry.response.headers[key.trim()] = values.join(":").trim();
				}
			}
		} else if (line.startsWith("* Timings:")) {
			isTimings = true;
			isCaptures = false;
		} else if (isTimings && line.trim() !== "") {
			// Remove the '* ' prefix if it exists
			const cleanedLine = line.startsWith("* ") ? line.slice(2) : line;
			const [key, value] = cleanedLine.split(":").map((s) => s.trim());
			if (currentEntry && key && value) {
				if (currentEntry.timings) {
					currentEntry.timings[key] = value;
				}
				// Check if this is the total timing, which marks the end of timing section
				if (key === "total") {
					isTimings = false;
					if (currentEntry.timings) {
						currentEntry.timings = formatTimings(currentEntry.timings);
					}
				}
			}
		} else if (line.startsWith("* Captures:")) {
			isCaptures = true;
			isTimings = false;
			if (currentEntry && !currentEntry.captures) {
				currentEntry.captures = {};
			}
		} else if (isCaptures && line.trim() !== "") {
			// Remove the '* ' prefix if it exists
			const cleanedLine = line.startsWith("* ") ? line.slice(2) : line;
			const [key, value] = cleanedLine.split(":").map((s) => s.trim());
			if (currentEntry?.captures && key && value) {
				currentEntry.captures[key] = value;
			}
		} else if (isCaptures && line.trim() === "") {
			isCaptures = false;
		}
	}

	if (currentEntry) {
		entries.push(currentEntry);
	}

	// Assign the response body from stdout to the last entry
	if (entries.length > 0) {
		entries[entries.length - 1].response.body = stdout.trim();
	}

	return { entries };
}
