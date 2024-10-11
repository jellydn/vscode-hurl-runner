import { exec } from "node:child_process";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { displayName } from "./generated/meta";
import type { HurlExecutionOptions } from "./hurl-entry";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} response`);

export async function executeHurl(
	options: HurlExecutionOptions,
): Promise<string> {
	// Set status bar message
	const statusBarMessage = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
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

	return output;
}
