import { defineExtension } from "reactive-vscode";
import * as vscode from "vscode";

import { findEntryAtLine } from "./hurl-entry";
import { HurlVariablesProvider } from "./hurl-variables-provider";
import { chooseEnvFile, manageEnvVariables } from "./manage-variables";
import { executeHurl, logger, responseLogger } from "./utils";

const { activate, deactivate } = defineExtension(() => {
	const hurlVariablesProvider = new HurlVariablesProvider();
	const envFileMapping: Record<string, string> = {};
	let resultPanel: vscode.WebviewPanel | undefined;

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

	const showResultInWebView = (output: string, isError = false) => {
		responseLogger.clear();
		responseLogger.info(output);

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

		const title = isError ? 'Hurl Runner: Error' : 'Hurl Runner: Result';
		let formattedOutput = output;
		let outputType = 'text';

		// Detect output type and format accordingly
		if (output.trim().startsWith('<')) {
			outputType = 'html';
			formattedOutput = output;
		} else if (!isError) {
			try {
				const jsonObj = JSON.parse(output);
				outputType = 'json';
				formattedOutput = JSON.stringify(jsonObj, null, 2);
			} catch {
				if (output.trim().startsWith('<?xml')) {
					outputType = 'xml';
					formattedOutput = output.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				}
			}
		} else {
			outputType = 'bash';
		}

		resultPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${title}</title>
				<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
				<style>
					.error { color: #D32F2F; }
				</style>
			</head>
			<body>
				${outputType === 'html'
				? formattedOutput
				: `<pre><code class="language-${outputType}${isError ? ' error' : ''}">${formattedOutput}</code></pre>`
			}
				<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
			</body>
			</html>
		`;

		resultPanel.reveal(vscode.ViewColumn.Two);
	};

	const runHurl = vscode.commands.registerCommand(
		"vscode-hurl-runner.runHurl",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView("No active editor", true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			const currentLine = editor.selection.active.line + 1;
			const fileContent = editor.document.getText();

			try {
				const entry = findEntryAtLine(fileContent, currentLine);
				if (!entry) {
					showResultInWebView("No Hurl entry found at the current line", true);
					return;
				}

				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const output = await executeHurl({
					filePath,
					envFile,
					variables,
					fromEntry: entry.entryNumber,
					toEntry: entry.entryNumber,
				});

				showResultInWebView(output);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showResultInWebView(errorMessage, true);
			}
		},
	);

	const runHurlFile = vscode.commands.registerCommand(
		"vscode-hurl-runner.runHurlFile",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				showResultInWebView("No active editor", true);
				return;
			}

			showLoadingInWebView();

			const filePath = editor.document.uri.fsPath;
			try {
				const envFile = envFileMapping[filePath];
				const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

				const output = await executeHurl({ filePath, envFile, variables });

				showResultInWebView(output);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showResultInWebView(errorMessage, true);
			}
		},
	);

	const manageVariables = vscode.commands.registerCommand(
		"vscode-hurl-runner.manageVariables",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("No active editor");
				return;
			}

			const filePath = editor.document.uri.fsPath;

			const envFile = await chooseEnvFile();
			if (envFile === "inline") {
				await manageEnvVariables(hurlVariablesProvider, {
					filePath,
					isInline: true,
				});
			} else if (filePath && envFile) {
				envFileMapping[filePath] = envFile;
				await manageEnvVariables(hurlVariablesProvider, {
					filePath,
					envFile,
				});
			}
		},
	);

	logger.info("vscode-hurl-runner is now active!");

	return {
		dispose: () => {
			runHurl.dispose();
			runHurlFile.dispose();
			manageVariables.dispose();
			if (resultPanel) {
				resultPanel.dispose();
			}
		},
	};
});

export { activate, deactivate };