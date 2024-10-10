import { defineExtension } from "reactive-vscode";
import * as vscode from 'vscode';

import { HurlVariablesProvider } from './hurl-variables-provider';
import { executeHurl, logger, responseLogger } from './utils';
import { findEntryAtLine } from "./hurl-entry";
import { chooseEnvFile, manageEnvVariables } from "./manage-variables";

const { activate, deactivate } = defineExtension(() => {
	const hurlVariablesProvider = new HurlVariablesProvider();
	const envFileMapping: Record<string, string> = {};

	const showResultOutput = (output: string) => {
		responseLogger.clear();
		responseLogger.info(output);
		responseLogger.show();
	};

	const runHurl = vscode.commands.registerCommand('vscode-hurl-runner.runHurl', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const filePath = editor.document.uri.fsPath;
		const currentLine = editor.selection.active.line + 1; // VSCode lines are 0-indexed, Hurl is 1-indexed
		const fileContent = editor.document.getText();

		try {
			const entry = findEntryAtLine(fileContent, currentLine);
			if (!entry) {
				vscode.window.showErrorMessage('No Hurl entry found at the current line');
				return;
			}

			const envFile = envFileMapping[filePath];
			const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

			const output = await executeHurl({
				filePath,
				envFile,
				variables,
				fromEntry: entry.entryNumber,
				toEntry: entry.entryNumber
			});

			showResultOutput(output);
		} catch (error) {
			vscode.window.showErrorMessage(`${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	const runHurlFile = vscode.commands.registerCommand('vscode-hurl-runner.runHurlFile', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const filePath = editor.document.uri.fsPath;
		try {
			const envFile = envFileMapping[filePath];
			const variables = hurlVariablesProvider.getAllVariablesBy(filePath);

			const output = await executeHurl({ filePath, envFile, variables });

			showResultOutput(output);
		} catch (error) {
			vscode.window.showErrorMessage(`${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	const manageVariables = vscode.commands.registerCommand('vscode-hurl-runner.manageVariables', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const filePath = editor.document.uri.fsPath;

		const envFile = await chooseEnvFile();
		if (envFile === 'inline') {
			await manageEnvVariables(hurlVariablesProvider, {
				filePath,
				isInline: true
			});
		} else if (filePath && envFile) {
			envFileMapping[filePath] = envFile;
			await manageEnvVariables(hurlVariablesProvider, {
				filePath,
				envFile
			});
		}
	});

	logger.info('vscode-hurl-runner is now active!');

	return {
		dispose: () => {
			runHurl.dispose();
			runHurlFile.dispose();
			manageVariables.dispose();
		}
	};
});

export { activate, deactivate };