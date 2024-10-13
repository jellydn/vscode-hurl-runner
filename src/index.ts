import { defineExtension, useCommand } from "reactive-vscode";
import * as vscode from "vscode";

import { HurlCodeLensProvider } from "./hurl-code-lens-provider";
import { findEntryAtLine } from "./hurl-entry";
import { parseHurlOutput } from "./hurl-parser";
import { HurlVariablesProvider } from "./hurl-variables-provider";
import { HurlVariablesTreeProvider } from "./hurl-variables-tree-provider";
import { chooseEnvFile, manageEnvVariables } from "./manage-variables";
import { executeHurl, logger, responseLogger } from "./utils";

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

		// Parse the output
		const parsedOutput = parseHurlOutput(result.stderr, result.stdout);

		// Create a formatted HTML output for each entry
		const htmlOutput = parsedOutput.entries
			.map((entry) => {
				let bodyType = "text";
				let formattedBody = entry.response.body || "No response body";
				if (formattedBody.trim().startsWith("{")) {
					bodyType = "json";
					try {
						formattedBody = JSON.stringify(JSON.parse(formattedBody), null, 2);
					} catch {
						// If parsing fails, leave it as is
					}
				} else if (formattedBody.trim().startsWith("<")) {
					bodyType = formattedBody.trim().startsWith("<?xml") ? "xml" : "html";
				}

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

				return `
				<div class="entry">
					<h3>Request</h3>
					<pre><code class="language-http">${entry.requestMethod} ${entry.requestUrl}</code></pre>
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
						<summary>cURL Command</summary>
						<pre><code class="language-bash">${entry.curlCommand}</code></pre>
					</details>
					`
							: ""
					}

					<h3>Response Body</h3>
					<pre class="response-body"><code class="language-${bodyType}">${formattedBody}</code></pre>

					<details>
						<summary>Response Details</summary>
						<p>Status: ${entry.response.status}</p>
						<h4>Headers</h4>
						<pre><code class="language-http">${Object.entries(
							entry.response.headers,
						)
							.map(([key, value]) => `${key}: ${value}`)
							.join("\n")}</code></pre>
					</details>

					${timingsHtml}
				</div>
			`;
			})
			.join("<hr>");

		resultPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>${title}</title>
					<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
					<style>
						body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
						pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
						details { margin-bottom: 20px; }
						summary { cursor: pointer; }
						hr { margin: 30px 0; border: 0; border-top: 1px solid #ddd; }
						.response-body { max-height: 100vh; overflow: auto; }
					</style>
				</head>
				<body>
					${isError ? `<pre class="language-bash"><code>${result.stderr}</code></pre>` : htmlOutput}
						<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
						<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
				</body>
			</html>
		`;

		resultPanel.reveal(vscode.ViewColumn.Two);
	};

	useCommand("vscode-hurl-runner.runHurl", async (lineNumber?: number) => {
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
			const entry = findEntryAtLine(fileContent, currentLine);
			if (!entry) {
				showResultInWebView(
					{ stdout: "", stderr: "No Hurl entry found at the current line" },
					true,
				);
				return;
			}

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
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			showResultInWebView({ stdout: "", stderr: errorMessage }, true);
		}
	});

	useCommand("vscode-hurl-runner.runHurlToEnd", async (lineNumber?: number) => {
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
			const entry = findEntryAtLine(fileContent, currentLine);
			if (!entry) {
				showResultInWebView(
					{ stdout: "", stderr: "No Hurl entry found at the current line" },
					true,
				);
				return;
			}

			const envFile = envFileMapping[filePath];
			const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

			const result = await executeHurl({
				filePath,
				envFile,
				variables,
				fromEntry: entry.entryNumber,
				// We don't specify toEntry, so it will run to the end
			});

			showResultInWebView(result);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			showResultInWebView({ stdout: "", stderr: errorMessage }, true);
		}
	});

	// Show the variables tree view
	const hurlVariablesTreeProvider = new HurlVariablesTreeProvider(
		hurlVariablesProvider,
	);
	const treeView = vscode.window.createTreeView("hurlVariables", {
		treeDataProvider: hurlVariablesTreeProvider,
	});

	function refreshVariablesTreeView(filePath?: string) {
		hurlVariablesTreeProvider.refresh(filePath);
	}

	// Modify the manageInlineVariables command
	useCommand("vscode-hurl-runner.manageInlineVariables", async () => {
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
		refreshVariablesTreeView(filePath);
	});

	useCommand("vscode-hurl-runner.selectEnvFile", async () => {
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
		}
	});

	// Update status bar when active editor changes
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.languageId === "hurl") {
			const filePath = editor.document.uri.fsPath;
			updateStatusBarText(filePath);
			statusBarItem.show();
		} else {
			statusBarItem.hide();
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
			statusBarItem.text = `$(file) Hurl Env: ${vscode.workspace.asRelativePath(envFile)} + Custom`;
		} else if (envFile) {
			statusBarItem.text = `$(file) Hurl Env: ${vscode.workspace.asRelativePath(envFile)}`;
		} else if (hasCustomVariables) {
			statusBarItem.text = "$(file) Hurl Env: Custom";
		} else {
			statusBarItem.text = "$(file) Hurl Env: None";
		}
	}

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
			refreshVariablesTreeView(editor.document.uri.fsPath);
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
