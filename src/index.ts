import { defineExtension, useCommand } from "reactive-vscode";
import * as vscode from "vscode";
import { findEntryAtLine } from "./hurl-entry";

import { commands } from "./generated/meta";
import { HurlCodeLensProvider } from "./hurl-code-lens-provider";
import { parseHurlOutput } from "./hurl-parser";
import { HurlVariablesProvider } from "./hurl-variables-provider";
import { HurlVariablesTreeProvider } from "./hurl-variables-tree-provider";
import {
	chooseEnvFile,
	manageEnvVariables,
	saveCapturedValues,
} from "./manage-variables";
import {
	type LastResponseInfo,
	executeHurl,
	executeHurlWithContent,
	logger,
	responseLogger,
} from "./utils";

interface LastCommandInfo {
	command: (entryNumber?: number) => Promise<void>;
	filePath: string;
	entryNumber?: number;
}

/**
 * Format JSON string with proper indentation while preserving large number precision.
 * This avoids using JSON.parse/JSON.stringify which lose precision for large integers.
 */
function formatJsonString(jsonStr: string): string {
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

// TODO: Migrate to app to VueJs 3 later
const { activate, deactivate } = defineExtension(() => {
	// Hurl variables provider
	const hurlVariablesProvider = new HurlVariablesProvider();
	// Mapping of file paths to environment files
	const envFileMapping: Record<string, string> = {};

	// Webview panel for showing the result
	let resultPanel: vscode.WebviewPanel | undefined;

	// Status bar item for showing the current environment file
	let statusBarItem: vscode.StatusBarItem | undefined = undefined;
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	statusBarItem.command = "vscode-hurl-runner.selectEnvFile";
	statusBarItem.text = "$(file) Hurl Env: None";
	statusBarItem.tooltip = "Select Hurl environment file";
	statusBarItem.show();

	// Store the last command info
	let lastCommandInfo: LastCommandInfo | undefined;

	// Store the last response info
	let lastResponseInfo: LastResponseInfo | undefined;

	const showLoadingInWebView = () => {
		if (!resultPanel) {
			resultPanel = vscode.window.createWebviewPanel(
				"hurl-runner",
				"Hurl Runner",
				vscode.ViewColumn.Two,
				{ enableScripts: true },
			);
			resultPanel.onDidDispose(() => {
				resultPanel = undefined;
			});
		}

		resultPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Hurl Runner: Loading</title>
				<style>
					body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
					.loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
					@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
				</style>
			</head>
			<body>
				<div class="loader"></div>
			</body>
			</html>
		`;

		resultPanel.reveal(vscode.ViewColumn.Two);
	};

	const showResultInWebView = (
		result: { stdout: string; stderr: string; isVeryVerbose?: boolean },
		isError = false,
	) => {
		responseLogger.clear();
		responseLogger.info(`Stdout: ${result.stdout}`);
		responseLogger.info(`Stderr: ${result.stderr}`);

		if (!resultPanel) {
			resultPanel = vscode.window.createWebviewPanel(
				"hurl-runner",
				"Hurl Runner",
				vscode.ViewColumn.Two,
				{ enableScripts: true },
			);
			resultPanel.onDidDispose(() => {
				resultPanel = undefined;
			});
		}

		const title = isError ? "Hurl Runner: Error" : "Hurl Runner: Result";

		// Store the last response info before parsing to ensure we always have the raw output
		lastResponseInfo = {
			result,
			isError,
			parsedOutput: { entries: [] }, // Initialize with empty entries
		};

		let htmlOutput = "";

		if (isError) {
			// For error cases, show the error message directly
			htmlOutput = `<div class="error-output">
				<h3>Error</h3>
				<pre><code class="language-bash">${result.stderr}</code></pre>
			</div>`;
		} else {
			try {
				// Parse the output only for non-error cases
				const parsedOutput = parseHurlOutput(result.stderr, result.stdout);
				lastResponseInfo.parsedOutput = parsedOutput; // Update the parsed output

				// Create a formatted HTML output for each entry
				htmlOutput = parsedOutput.entries
					.map((entry) => {
						let bodyType = "text";
						let formattedBody = entry.response.body || "No response body";

						// Better content type detection
						if (
							formattedBody.trim().startsWith("{") ||
							formattedBody.trim().startsWith("[")
						) {
							bodyType = "json";
							try {
								// Format JSON with proper indentation while preserving large number precision
								// First validate it's valid JSON, but don't parse large numbers
								JSON.parse(formattedBody);
								// Then format manually to preserve precision
								formattedBody = formatJsonString(formattedBody);
							} catch {
								// If parsing fails, leave it as is
							}
						} else if (formattedBody.trim().startsWith("<?xml")) {
							bodyType = "xml";
						} else if (formattedBody.trim().startsWith("<")) {
							bodyType = "html";
						} else if (
							formattedBody.includes("function") ||
							formattedBody.includes("=>")
						) {
							bodyType = "javascript";
						}

						// Escape HTML characters to prevent rendering issues
						formattedBody = formattedBody
							.replace(/&/g, "&amp;")
							.replace(/</g, "&lt;")
							.replace(/>/g, "&gt;")
							.replace(/"/g, "&quot;")
							.replace(/'/g, "&#039;");

						const timingsHtml =
							result.isVeryVerbose && entry.timings
								? `
				<details>
					<summary>Timings</summary>
					<pre><code class="language-yaml">${Object.entries(entry.timings)
						.map(([key, value]) => `${key}: ${value}`)
						.join("\n")}</code></pre>
				</details>
				`
								: "";

						const capturesHtml =
							entry.captures && Object.keys(entry.captures).length > 0
								? `
				<details>
					<summary>Captures</summary>
					<pre><code class="language-yaml">${Object.entries(entry.captures)
						.map(([key, value]) => `${key}: ${value}`)
						.join("\n")}</code></pre>
				</details>
				`
								: "";

						return `
							<div class="entry">
								<div class="request-output">
									<h3>Request ${
										result.isVeryVerbose && entry.timings
											? `<span class="status-code">Time: ${entry.timings.total}</span>`
											: ""
									}</h3>
									<pre><code class="language-shell">${entry.requestMethod} ${entry.requestUrl}</code></pre>

									<details>
										<summary>Headers</summary>
										<pre><code class="language-http">${Object.entries(
											entry.requestHeaders,
										)
											.map(([key, value]) => `${key}: ${value}`)
											.join("\n")}</code></pre>
									</details>

									${
										entry.curlCommand
											? `
					<details>
						<summary>cURL Command <button class="copy-button">Copy</button></summary>
						<pre><code class="language-shell">${entry.curlCommand}</code></pre>
					</details>
					`
											: ""
									}
								</div>

								<div class="response-output">
									<h3>Response <span class="status-code">Status: ${entry.response.status}</span></h3>
									<details open>
										<summary>Body <button class="copy-button">Copy</button></summary>
										<div class="response-body">
											<pre><code class="language-${bodyType}">${formattedBody}</code></pre>
										</div>
									</details>

									<details>
										<summary>Response Headers</summary>
										<pre><code class="language-http">${Object.entries(
											entry.response.headers,
										)
											.map(([key, value]) => `${key}: ${value}`)
											.join("\n")}</code></pre>
									</details>

									${timingsHtml}
									${capturesHtml}
								</div>
							</div>
						`;
					})
					.join("<hr>");
			} catch (error) {
				logger.error(error);
				// If parsing fails, show the raw output
				htmlOutput = `<div class="error-output">
					<h3>Error</h3>
					<pre><code class="language-bash">${result.stderr}</code></pre>
				</div>`;
			}
		}

		resultPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>${title}</title>
					<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-http.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
					<style>
						body {
							font-family: var(--vscode-font-family);
							line-height: 1.6;
							margin: 0;
							color: var(--vscode-editor-foreground);
							background-color: var(--vscode-editor-background);
						}
						pre {
							background-color: var(--vscode-textCodeBlock-background);
							padding: 8px;
							border-radius: 4px;
							overflow: auto;
						}
						details {
							margin-bottom: 16px;
						}
						summary {
							cursor: pointer;
							user-select: none;
							padding: 6px;
							background-color: var(--vscode-button-secondaryBackground);
							color: var(--vscode-button-secondaryForeground);
							border-radius: 4px;
						}
						summary:hover {
							background-color: var(--vscode-button-secondaryHoverBackground);
						}
						hr {
							margin: 16px 0;
							border: 0;
							border-top: 1px solid var(--vscode-editorIndentGuide-background);
						}
						.response-body {
							position: relative;
							background: var(--vscode-textCodeBlock-background);
							border-radius: 4px;
							margin: 0;
							color: var(--vscode-editor-foreground);
						}
						.response-body pre {
							margin: 0;
							padding: 16px;
							overflow-x: auto;
							font-size: var(--vscode-editor-font-size);
							line-height: 1.5;
							background: transparent;
						}
						.response-body code {
							font-family: var(--vscode-editor-font-family);
							tab-size: 4;
							white-space: pre;
							color: var(--vscode-textPreformat-foreground);
						}
						.entry {
							background: var(--vscode-editor-background);
							padding: 8px 0;
							margin-bottom: 24px;
						}
						h3 {
							margin-top: 0;
							margin-bottom: 8px;
							color: var(--vscode-foreground);
						}
						/* Copy button */
						.copy-button {
							position: absolute;
							top: 6px;
							right: 6px;
							padding: 4px 8px;
							background: var(--vscode-button-background);
							color: var(--vscode-button-foreground);
							border: none;
							border-radius: 4px;
							font-size: 12px;
							cursor: pointer;
							opacity: 0;
							transition: opacity 0.2s;
							z-index: 10;
						}

						.response-body:hover .copy-button {
							opacity: 1;
						}

						.copy-button:hover {
							background: var(--vscode-button-hoverBackground);
						}

						.copy-button:active {
							background: var(--vscode-button-activeBackground);
						}

						/* Syntax highlighting improvements */
						.token.property {
							color: var(--vscode-symbolIcon-variableForeground);
						}
						.token.string {
							color: var(--vscode-debugConsole-stringForeground);
						}
						.token.number {
							color: var(--vscode-debugConsole-numberForeground);
						}
						.token.boolean {
							color: var(--vscode-debugConsole-booleanForeground);
						}
						.token.null {
							color: var(--vscode-debugConsole-nullForeground);
						}
						.token.punctuation {
							color: var(--vscode-editor-foreground);
						}
						.token.operator {
							color: var(--vscode-editor-foreground);
						}

						.error-output {
							background: var(--vscode-textCodeBlock-background);
							border-radius: 4px;
							margin: 8px 0;
							color: var(--vscode-editor-foreground);
							border: 1px solid var(--vscode-panel-border);
							border-color: rgba(128, 128, 128, 0.35);
						}

						.error-output pre {
							margin: 0;
							padding: 16px;
							overflow-x: auto;
							font-size: var(--vscode-editor-font-size);
							line-height: 1.5;
							background: transparent;
						}

						.error-output code {
							font-family: var(--vscode-editor-font-family);
							tab-size: 4;
							white-space: pre;
							color: var(--vscode-editor-foreground);
						}

						.error-output h3 {
							color: var(--vscode-errorForeground);
							margin: 0;
							padding: 8px 16px;
							background: transparent;
							border-bottom: 1px solid var(--vscode-panel-border);
							border-color: rgba(128, 128, 128, 0.35);
						}

						/* Shell/bash syntax highlighting for errors */
						.language-bash .token.function {
							color: var(--vscode-debugConsole-errorForeground);
						}
						.language-bash .token.comment {
							color: var(--vscode-descriptionForeground);
						}
						.language-bash .token.string {
							color: var(--vscode-debugConsole-stringForeground);
						}
						.language-bash .token.operator {
							color: var(--vscode-editor-foreground);
						}
						.language-bash .token.parameter {
							color: var(--vscode-symbolIcon-variableForeground);
						}

						.request-output,
						.response-output {
							background: var(--vscode-textCodeBlock-background);
							border-radius: 4px;
							margin: 8px 0;
							color: var(--vscode-editor-foreground);
							border: 1px solid var(--vscode-panel-border);
							border-color: rgba(128, 128, 128, 0.35);
						}

						.request-output h3,
						.response-output h3 {
							margin: 0;
							padding: 8px 16px;
							background: transparent;
							border-bottom: 1px solid var(--vscode-panel-border);
							border-color: rgba(128, 128, 128, 0.35);
						}

						.request-output pre,
						.response-output pre {
							margin: 0;
							padding: 16px;
							background: transparent;
						}

						.request-output code,
						.response-output code {
							font-family: var(--vscode-editor-font-family);
							font-size: var(--vscode-editor-font-size);
							line-height: 1.5;
							tab-size: 4;
							white-space: pre;
						}

						/* Remove border from response-body since it's inside response-output now */
						.response-body {
							border: none;
							margin: 0;
						}

						.response-body pre {
							padding: 16px;
						}

						/* Shell syntax highlighting for requests */
						.language-shell .token.function {
							color: var(--vscode-symbolIcon-methodForeground);
						}
						.language-shell .token.comment {
							color: var(--vscode-descriptionForeground);
						}
						.language-shell .token.string {
							color: var(--vscode-debugConsole-stringForeground);
						}
						.language-shell .token.operator {
							color: var(--vscode-editor-foreground);
						}
						.language-shell .token.parameter {
							color: var(--vscode-symbolIcon-variableForeground);
						}

						/* HTTP syntax highlighting */
						.language-http .token.property {
							color: var(--vscode-symbolIcon-variableForeground);
						}
						.language-http .token.string {
							color: var(--vscode-debugConsole-stringForeground);
						}
						.language-http .token.punctuation {
							color: var(--vscode-editor-foreground);
						}
						.language-http .token.attr-name {
							color: var(--vscode-symbolIcon-variableForeground);
						}
						.language-http .token.attr-value {
							color: var(--vscode-debugConsole-stringForeground);
						}
						.language-http .token.status {
							color: var(--vscode-debugConsole-numberForeground);
						}

						details summary .copy-button {
							float: right;
							position: relative;
							top: -2px;
							opacity: 0;
							padding: 2px 6px;
							font-size: 11px;
						}

						details:hover summary .copy-button {
							opacity: 1;
						}

						details summary {
							display: flex;
							justify-content: space-between;
							align-items: center;
						}

						.status-code {
							float: right;
							font-size: 13px;
							padding: 2px 8px;
							border-radius: 4px;
							font-weight: 500;
							margin-left: 8px;
							opacity: 1;
							background-color: var(--vscode-button-secondaryBackground, #28a745);
							color: var(--vscode-button-secondaryForeground);
						}

						.response-time {
							background-color: var(--vscode-button-secondaryBackground, #28a745);
							color: var(--vscode-button-secondaryForeground);
						}

						details {
							margin: 8px 0;
						}

						details summary {
							display: flex;
							justify-content: space-between;
							align-items: center;
							padding: 6px;
							background-color: var(--vscode-button-secondaryBackground);
							color: var(--vscode-button-secondaryForeground);
							border-radius: 4px;
							user-select: none;
							cursor: pointer;
						}

						details summary:hover {
							background-color: var(--vscode-button-secondaryHoverBackground);
						}

						details[open] summary {
							border-bottom-left-radius: 0;
							border-bottom-right-radius: 0;
							border-bottom: 1px solid var(--vscode-panel-border);
							border-color: rgba(128, 128, 128, 0.35);
						}

						details pre {
							margin: 0;
							border-top-left-radius: 0;
							border-top-right-radius: 0;
						}

						details summary .copy-button {
							float: right;
							position: relative;
							top: -2px;
							opacity: 0;
							padding: 2px 6px;
							font-size: 11px;
						}

						details:hover summary .copy-button {
							opacity: 1;
						}

						</style>
				</head>
				<body>
					${htmlOutput}
					<script>
						// Initialize Prism.js
						Prism.highlightAll();

						// Add copy functionality to each copy button
						document.querySelectorAll('.copy-button').forEach(button => {
							button.addEventListener('click', (e) => {
								// Prevent the details from toggling when clicking the copy button
								e.stopPropagation();

								// Find the closest code block
								const codeBlock = button.closest('details').querySelector('code');
								const text = codeBlock.textContent;

								navigator.clipboard.writeText(text).then(() => {
									const originalText = button.textContent;
									button.textContent = 'Copied!';
									button.style.backgroundColor = '#28a745';

									setTimeout(() => {
										button.textContent = originalText;
										button.style.backgroundColor = '';
									}, 2000);
								}).catch(err => {
									console.error('Failed to copy text:', err);
									button.textContent = 'Failed to copy';
									button.style.backgroundColor = '#dc3545';

									setTimeout(() => {
										button.textContent = originalText;
										button.style.backgroundColor = '';
									}, 2000);
								});
							});
						});
					</script>
				</body>
			</html>
		`;

		resultPanel.reveal(vscode.ViewColumn.Two);
	};

	const saveCapturedValuesFromLastResponse = (
		stderr: string,
		stdout: string,
	) => {
		const parsedOutput = parseHurlOutput(stderr, stdout);
		for (const entry of parsedOutput.entries) {
			const captures = entry.captures ?? {};
			if (Object.keys(captures).length > 0) {
				saveCapturedValues(hurlVariablesProvider, captures);
			}
		}
	};

	// Run hurl at the current line
	useCommand(commands.runHurl, async (lineNumber?: number) => {
		const runHurlCommand = async (entryNumber?: number) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView({ stdout: "", stderr: "No active editor" }, true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			const currentLine = lineNumber || editor.selection.active.line + 1;
			const fileContent = editor.document.getText();

			try {
				const entry = entryNumber
					? { entryNumber }
					: findEntryAtLine(fileContent, currentLine);
				if (!entry) {
					showResultInWebView(
						{ stdout: "", stderr: "No Hurl entry found at the current line" },
						true,
					);
					return;
				}

				// Store the last command info
				lastCommandInfo = {
					command: runHurlCommand,
					filePath,
					entryNumber: entry.entryNumber,
				};

				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const result = await executeHurl({
					filePath,
					envFile,
					variables,
					fromEntry: entry.entryNumber,
					toEntry: entry.entryNumber,
				});

				showResultInWebView(result);
				saveCapturedValuesFromLastResponse(result.stderr, result.stdout);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				showResultInWebView({ stdout: "", stderr: errorMessage }, true);
			}
		};
		await runHurlCommand();
	});

	// Run hurl command to end
	useCommand(commands.runHurlToEnd, async (lineNumber?: number) => {
		const runHurlToEndCommand = async (entryNumber?: number) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView({ stdout: "", stderr: "No active editor" }, true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			const currentLine = lineNumber || editor.selection.active.line + 1;
			const fileContent = editor.document.getText();

			try {
				const entry = entryNumber
					? { entryNumber }
					: findEntryAtLine(fileContent, currentLine);
				if (!entry) {
					showResultInWebView(
						{ stdout: "", stderr: "No Hurl entry found at the current line" },
						true,
					);
					return;
				}

				// Store the last command info
				lastCommandInfo = {
					command: runHurlToEndCommand,
					filePath,
					entryNumber: entry.entryNumber,
				};

				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const result = await executeHurl({
					filePath,
					envFile,
					variables,
					fromEntry: entry.entryNumber,
				});

				showResultInWebView(result);
				saveCapturedValuesFromLastResponse(result.stderr, result.stdout);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				showResultInWebView({ stdout: "", stderr: errorMessage }, true);
			}
		};
		await runHurlToEndCommand();
	});

	// Run hurl command from selection
	useCommand(commands.runHurlSelection, async () => {
		const runHurlSelectionCommand = async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("No active editor");
				return;
			}

			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);

			if (!selectedText) {
				vscode.window.showErrorMessage("No text selected");
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			const envFile = envFileMapping[filePath];
			const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

			// Store the last command info (without entry number for selections)
			lastCommandInfo = {
				command: runHurlSelectionCommand,
				filePath,
			};

			try {
				const result = await executeHurlWithContent({
					content: selectedText,
					envFile,
					variables,
				});

				showResultInWebView(result);
				saveCapturedValuesFromLastResponse(result.stderr, result.stdout);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				showResultInWebView({ stdout: "", stderr: errorMessage }, true);
			}
		};
		await runHurlSelectionCommand();
	});

	// Rerun the last command
	useCommand(commands.rerunLastCommand, async () => {
		if (lastCommandInfo) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.uri.fsPath === lastCommandInfo.filePath) {
				await lastCommandInfo.command(lastCommandInfo.entryNumber);
			} else {
				vscode.window.showInformationMessage(
					"Last command was run on a different file. Please switch to that file and try again.",
				);
			}
		} else {
			vscode.window.showInformationMessage(
				"No previous Hurl command to rerun.",
			);
		}
	});

	// Show the variables tree view
	const hurlVariablesTreeProvider = new HurlVariablesTreeProvider(
		hurlVariablesProvider,
	);
	const treeView = vscode.window.createTreeView("hurlVariables", {
		treeDataProvider: hurlVariablesTreeProvider,
	});

	// Manage inline variables command
	useCommand(commands.manageInlineVariables, async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage("No active editor");
			return;
		}

		const filePath = editor.document.uri.fsPath;
		await manageEnvVariables(hurlVariablesProvider, {
			filePath,
			isInline: true,
			showVariablesTree: treeView.visible,
		});

		// Refresh the tree view after managing variables
		hurlVariablesTreeProvider.refresh();
	});

	// Select env file command
	useCommand(commands.selectEnvFile, async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage("No active editor");
			return;
		}

		const filePath = editor.document.uri.fsPath;
		const envFile = await chooseEnvFile();
		if (envFile) {
			envFileMapping[filePath] = envFile;
			updateStatusBarText(filePath);
			hurlVariablesTreeProvider.setEnvFile(filePath, envFile);
		}
	});

	// Update status bar when active editor changes
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.languageId === "hurl") {
			const filePath = editor.document.uri.fsPath;
			const envFile = envFileMapping[filePath];
			hurlVariablesTreeProvider.setEnvFile(filePath, envFile);
			updateStatusBarText(filePath);
			statusBarItem?.show();
		} else {
			statusBarItem?.hide();
		}
	});

	function updateStatusBarText(filePath: string) {
		if (!statusBarItem) {
			return;
		}
		const envFile = envFileMapping[filePath];
		const hasCustomVariables =
			Object.keys(hurlVariablesProvider.getInlineVariablesBy(filePath)).length >
			0;

		if (envFile && hasCustomVariables) {
			statusBarItem.text = `$(file) Hurl Env: ${vscode.workspace.asRelativePath(
				envFile,
			)} + Custom`;
		} else if (envFile) {
			statusBarItem.text = `$(file) Hurl Env: ${vscode.workspace.asRelativePath(
				envFile,
			)}`;
		} else if (hasCustomVariables) {
			statusBarItem.text = "$(file) Hurl Env: Custom";
		} else {
			statusBarItem.text = "$(file) Hurl Env: None";
		}
	}

	// Run whole file
	useCommand(commands.runHurlFile, async () => {
		const runHurlFileCommand = async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView({ stdout: "", stderr: "No active editor" }, true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;

			try {
				// Store the last command info
				lastCommandInfo = {
					command: runHurlFileCommand,
					filePath,
				};

				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const result = await executeHurl({
					filePath,
					envFile,
					variables,
					fromEntry: 1,
					// We don't specify fromEntry or toEntry, so it will run all entries
				});

				showResultInWebView(result);
				saveCapturedValuesFromLastResponse(result.stderr, result.stdout);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				showResultInWebView({ stdout: "", stderr: errorMessage }, true);
			}
		};
		await runHurlFileCommand();
	});

	logger.info("vscode-hurl-runner is now active!");

	// Add code lens provider for Hurl files for the actions, e.g. run, run to end, manage variables
	const hurlCodeLensProvider = new HurlCodeLensProvider();
	const codeLensDisposable = vscode.languages.registerCodeLensProvider(
		{ language: "hurl", scheme: "file" },
		hurlCodeLensProvider,
	);

	// Refresh the variables tree view when the active editor changes
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.languageId === "hurl") {
			hurlVariablesTreeProvider.refresh();
		}
	});

	// Run hurl from begin to current entry
	useCommand(commands.runHurlFromBegin, async () => {
		const runHurlFromBeginCommand = async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView({ stdout: "", stderr: "No active editor" }, true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			const currentLine = editor.selection.active.line + 1;
			const fileContent = editor.document.getText();

			try {
				const currentEntry = findEntryAtLine(fileContent, currentLine);
				if (!currentEntry) {
					showResultInWebView(
						{ stdout: "", stderr: "No Hurl entry found at the current line" },
						true,
					);
					return;
				}

				// Store the last command info
				lastCommandInfo = {
					command: runHurlFromBeginCommand,
					filePath,
					entryNumber: currentEntry.entryNumber,
				};

				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const result = await executeHurl({
					filePath,
					envFile,
					variables,
					fromEntry: 1,
					toEntry: currentEntry.entryNumber,
				});

				showResultInWebView(result);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				showResultInWebView({ stdout: "", stderr: errorMessage }, true);
			}
		};
		await runHurlFromBeginCommand();
	});

	// View last response command
	useCommand(commands.viewLastResponse, async () => {
		if (lastResponseInfo) {
			showResultInWebView(lastResponseInfo.result, lastResponseInfo.isError);
		} else {
			vscode.window.showInformationMessage(
				"No previous Hurl response to view.",
			);
			// Create a custom HTML output for usage information
			if (!resultPanel) {
				resultPanel = vscode.window.createWebviewPanel(
					"hurl-runner",
					"Hurl Runner",
					vscode.ViewColumn.Two,
					{ enableScripts: true },
				);
				resultPanel.onDidDispose(() => {
					resultPanel = undefined;
				});
			}

			resultPanel.webview.html = `
				<!DOCTYPE html>
				<html lang="en">
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<title>Hurl Runner: Usage</title>
						<style>
							body {
								font-family: var(--vscode-font-family);
								line-height: 1.6;
								margin: 20px;
								color: var(--vscode-editor-foreground);
								background-color: var(--vscode-editor-background);
							}
							h1 {
								color: var(--vscode-foreground);
								font-size: 24px;
								margin-bottom: 20px;
							}
							.command {
								margin-bottom: 10px;
								padding: 8px;
								background-color: var(--vscode-textCodeBlock-background);
								border-radius: 4px;
							}
							.command-name {
								color: var(--vscode-symbolIcon-methodForeground);
								font-weight: bold;
							}
							.description {
								color: var(--vscode-foreground);
								margin-left: 8px;
							}
							.note {
								margin-top: 20px;
								padding: 10px;
								background-color: var(--vscode-textCodeBlock-background);
								border-radius: 4px;
								border-left: 4px solid var(--vscode-symbolIcon-methodForeground);
							}
						</style>
					</head>
					<body>
						<h1>Hurl Runner Extension Usage</h1>
						<div class="command">
							<span class="command-name">Run at Entry</span>
							<span class="description">Execute the Hurl entry at current cursor position</span>
						</div>
						<div class="command">
							<span class="command-name">Run File</span>
							<span class="description">Execute all entries in the current file</span>
						</div>
						<div class="command">
							<span class="command-name">Run to End</span>
							<span class="description">Execute from current entry to the end of file</span>
						</div>
						<div class="command">
							<span class="command-name">Run from Begin</span>
							<span class="description">Execute from the beginning to current entry</span>
						</div>
						<div class="command">
							<span class="command-name">Run Selected Text</span>
							<span class="description">Execute the selected Hurl content</span>
						</div>
						<div class="command">
							<span class="command-name">Rerun Last Command</span>
							<span class="description">Execute the most recent Hurl command</span>
						</div>
						<div class="command">
							<span class="command-name">View Last Response</span>
							<span class="description">View the result of the last executed command</span>
						</div>
						<div class="command">
							<span class="command-name">Manage Variables</span>
							<span class="shortcut">(⌘+Alt+Shift+V)</span>
							<span class="description">Configure variables for Hurl requests</span>
						</div>
						<div class="command">
							<span class="command-name">Select Environment File</span>
							<span class="description">Choose a file containing environment variables</span>
						</div>
						<div class="note">
							<strong>Note:</strong> Use the Command Palette (⌘+Shift+P / Ctrl+Shift+P) and type 'Hurl Runner' to see all available commands.
						</div>
					</body>
				</html>
			`;
			resultPanel.reveal(vscode.ViewColumn.Two);
		}
	});

	useCommand(commands.removeGlobalVariable, async (item) => {
		if (item.contextValue === "globalVariable") {
			hurlVariablesProvider.removeGlobalVariable(item.label);
			hurlVariablesTreeProvider.refresh();
			vscode.window.showInformationMessage(
				`Removed global variable: ${item.label}`,
			);
		}
	});

	return {
		dispose: () => {
			if (resultPanel) {
				resultPanel.dispose();
			}
			codeLensDisposable.dispose();
			statusBarItem.dispose();
			treeView.dispose();
		},
	};
});

export { activate, deactivate };
