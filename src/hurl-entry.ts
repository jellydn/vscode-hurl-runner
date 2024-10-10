export interface HurlExecutionOptions {
	filePath: string;
	envFile?: string;
	variables: Record<string, string>;
	fromEntry?: number;
	toEntry?: number;
}

export interface HurlEntry {
	startLine: number;
	endLine: number;
	entryNumber: number;
}

interface HttpVerb {
	lineNumber: number;
	method: string;
}

const HTTP_VERBS = [
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"HEAD",
	"OPTIONS",
	"TRACE",
	"CONNECT",
];

function findHttpVerbs(content: string): HttpVerb[] {
	const lines = content.split("\n");
	return lines.reduce((verbs: HttpVerb[], line, index) => {
		const trimmedLine = line.trim();
		const verb = HTTP_VERBS.find((verb) => trimmedLine.startsWith(verb));
		if (verb) {
			verbs.push({ lineNumber: index + 1, method: verb });
		}
		return verbs;
	}, []);
}

export function findEntryAtLine(
	content: string,
	line: number,
): HurlEntry | null {
	const httpVerbs = findHttpVerbs(content);

	if (httpVerbs.length === 0) {
		return null;
	}

	for (let i = 0; i < httpVerbs.length; i++) {
		const currentVerb = httpVerbs[i];
		const nextVerb = httpVerbs[i + 1];

		if (
			line >= currentVerb.lineNumber &&
			(!nextVerb || line < nextVerb.lineNumber)
		) {
			return {
				startLine: currentVerb.lineNumber,
				endLine: nextVerb
					? nextVerb.lineNumber - 1
					: content.split("\n").length,
				entryNumber: i + 1,
			};
		}
	}

	return null;
}
