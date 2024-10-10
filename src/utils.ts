import { exec } from "node:child_process";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { displayName } from "./generated/meta";
import type { HurlExecutionOptions } from "./hurl-entry";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} response`);

// Update the formatOutput function to return a Promise directly
function formatOutput(output: string): Promise<string> {
	return new Promise((resolve) => {
		try {
			JSON.parse(output);
			exec(
				`echo '${output.replace(/'/g, "'\\''")}' | jq .`,
				(error, stdout, stderr) => {
					if (error) {
						logger.error(`Error formatting JSON with jq: ${error.message}`);
						resolve(output);
					} else {
						resolve(stdout || stderr);
					}
				},
			);
		} catch {
			exec(
				`echo '${output.replace(/'/g, "'\\''")}' | prettier --parser html`,
				(error, stdout, stderr) => {
					if (error) {
						logger.error(`Error formatting with prettier: ${error.message}`);
						resolve(output);
					} else {
						resolve(stdout || stderr);
					}
				},
			);
		}
	});
}

// Update the executeHurl function to use async/await
export async function executeHurl(
	options: HurlExecutionOptions,
): Promise<string> {
	// Set status bar message
	const statusBarMessage = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		10000,
	);
	statusBarMessage.text = "Running Hurl...";
	statusBarMessage.show();
	const { filePath, envFile, variables, fromEntry, toEntry } = options;
	const args = [filePath];

	for (const [key, value] of Object.entries(variables)) {
		args.push("--variable", `${key}=${value}`);
	}

	if (envFile) {
		args.push("--variables-file", envFile);
	}

	if (fromEntry) {
		args.push("--from-entry", fromEntry.toString());
	}

	if (toEntry) {
		args.push("--to-entry", toEntry.toString());
	}

	const command = `hurl ${args.join(" ")}`;
	logger.info(`Executing command: ${command}`);

	// Execute Hurl command
	const output = await new Promise<string>((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				logger.error(`Error executing Hurl: ${error.message}`);
				reject(
					new Error(error.message, {
						cause: error.message,
					}),
				);
				statusBarMessage.text = "Error";
				statusBarMessage.dispose();
				return;
			}
			if (stderr) {
				logger.warn(`Hurl command stderr: ${stderr.toString()}`);
				reject(
					new Error("Oops! Something went wrong while running Hurl", {
						cause: stderr.toString(),
					}),
				);
				statusBarMessage.text = "Error";
				statusBarMessage.dispose();
				return;
			}
			// Clear the status bar message
			statusBarMessage.text = "Done";
			statusBarMessage.dispose();
			resolve(stdout);
		});
	});

	const formattedOutput = await formatOutput(output);
	return formattedOutput;
}
