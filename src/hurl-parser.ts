interface ParsedEntry {
	requestMethod: string;
	requestUrl: string;
	requestHeaders: Record<string, string>;
	response: {
		status: string;
		headers: Record<string, string>;
		body: string;
	};
}

interface ParsedHurlOutput {
	entries: ParsedEntry[];
}

// Refer https://hurl.dev/docs/manual.html#verbose
// A line starting with ‘>’ means data sent by Hurl.
// A line staring with ‘<’ means data received by Hurl.
// A line starting with ‘*’ means additional info provided by Hurl.
export function parseHurlOutput(stderr: string, stdout: string): ParsedHurlOutput {
	const lines = stderr.split('\n');
	const entries: ParsedEntry[] = [];
	let currentEntry: ParsedEntry | null = null;
	let isResponseHeader = false;

	for (const line of lines) {
		if (line.startsWith('* Executing entry')) {
			if (currentEntry) {
				entries.push(currentEntry);
			}
			currentEntry = {
				requestMethod: '',
				requestUrl: '',
				requestHeaders: {},
				response: {
					status: '',
					headers: {},
					body: ''
				}
			};
			isResponseHeader = false;
		} else if (line.startsWith('* Request:')) {
			const match = line.match(/\* Request:\s*\* (\w+) (.*)/);
			if (match && currentEntry) {
				currentEntry.requestMethod = match[1];
				currentEntry.requestUrl = match[2];
			}
		} else if (line.startsWith('> ')) {
			if (line.startsWith('> GET ') || line.startsWith('> POST ') || line.startsWith('> PUT ') || line.startsWith('> DELETE ')) {
				const [method, path] = line.slice(2).split(' ');
				if (currentEntry) {
					currentEntry.requestMethod = method;
					currentEntry.requestUrl = path;
				}
			} else {
				const [key, ...values] = line.slice(2).split(':');
				if (key && values.length && currentEntry) {
					currentEntry.requestHeaders[key.trim()] = values.join(':').trim();
				}
			}
		} else if (line.startsWith('< ')) {
			isResponseHeader = true;
			if (line.startsWith('< HTTP/')) {
				if (currentEntry) {
					currentEntry.response.status = line.slice(2);
				}
			} else {
				const [key, ...values] = line.slice(2).split(':');
				if (key && values.length && currentEntry) {
					currentEntry.response.headers[key.trim()] = values.join(':').trim();
				}
			}
		} else if (isResponseHeader && !line.startsWith('<')) {
			isResponseHeader = false;
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