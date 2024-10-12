import * as vscode from "vscode";

export class HurlCodeLensProvider implements vscode.CodeLensProvider {
	private httpVerbs = [
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

	async provideCodeLenses(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): Promise<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const text = document.getText();
		const lines = text.split("\n");

		const entryLines: number[] = [];
		for (let i = 0; i < lines.length; i++) {
			if (this.httpVerbs.some((verb) => lines[i].trim().startsWith(verb))) {
				entryLines.push(i);
			}
		}

		entryLines.forEach((lineNumber, index) => {
			const range = new vscode.Range(
				lineNumber,
				0,
				lineNumber,
				lines[lineNumber].length,
			);

			// Run this entry
			codeLenses.push(
				new vscode.CodeLens(range, {
					title: "▶ Run",
					command: "vscode-hurl-runner.runHurl",
					arguments: [lineNumber + 1],
					tooltip: "Run this Hurl entry",
				}),
			);

			// Run to the end (exclude for the last entry)
			if (index < entryLines.length - 1) {
				codeLenses.push(
					new vscode.CodeLens(range, {
						title: "▶▶ Run to end",
						command: "vscode-hurl-runner.runHurlToEnd",
						arguments: [lineNumber + 1],
						tooltip: "Run from this entry to the end of the file",
					}),
				);
			}

			// Manage inline variables
			codeLenses.push(
				new vscode.CodeLens(range, {
					title: "📝 Manage variables",
					command: "vscode-hurl-runner.manageInlineVariables",
					tooltip: "Manage inline variables for this entry",
				}),
			);
		});

		return codeLenses;
	}
}
