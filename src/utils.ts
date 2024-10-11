import { spawn } from "node:child_process";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { displayName } from "./generated/meta";
import type { HurlExecutionOptions } from "./hurl-entry";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} Response`);

interface HurlExecutionResult {
	stdout: string;
	stderr: string;
}

export async function executeHurl(
	options: HurlExecutionOptions,
): Promise<HurlExecutionResult> {
	// Set status bar message
	const statusBarMessage = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
	);
	statusBarMessage.text = "Running Hurl...";
	statusBarMessage.show();
	const { filePath, envFile, variables, fromEntry, toEntry } = options;
	// Refer https://hurl.dev/docs/manual.html#verbose
	const args = [filePath, '--verbose'];

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

	logger.info(`Executing command: hurl ${args.join(" ")}`);

	return new Promise((resolve, reject) => {
		const hurlProcess = spawn('hurl', args);
		let stdout = '';
		let stderr = '';

		hurlProcess.stdout.on('data', (data) => {
			const str = data.toString();
			stdout += str;
			logger.info(`Hurl stdout: ${str}`);
		});

		hurlProcess.stderr.on('data', (data) => {
			const str = data.toString();
			stderr += str;
			logger.info(`Hurl stderr: ${str}`);
		});

		hurlProcess.on('close', (code) => {
			statusBarMessage.dispose();
			if (code === 0 || (code === 1 && !stderr.includes("error:"))) {
				resolve({ stdout, stderr });
			} else {
				reject(new Error(`Hurl process exited with code ${code}\n${stderr}`));
			}
		});

		hurlProcess.on('error', (error) => {
			statusBarMessage.dispose();
			reject(new Error(`Failed to start Hurl process: ${error.message}`));
		});
	});
}
