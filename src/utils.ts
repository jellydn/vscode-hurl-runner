import { spawn } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { displayName } from "./generated/meta";
import type { HurlExecutionOptions } from "./hurl-entry";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} Response`);

interface HurlExecutionResult {
	stdout: string;
	stderr: string;
	isVeryVerbose: boolean;
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

	// Get the verbosity configuration
	const config = vscode.workspace.getConfiguration("vscode-hurl-runner");
	const verboseMode = config.get<string>("verboseMode", "verbose");
	const isVeryVerbose = verboseMode === "very-verbose";
	const verboseFlag = isVeryVerbose ? "--very-verbose" : "--verbose";
	const args = [filePath, verboseFlag];

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
		const hurlProcess = spawn("hurl", args);
		let stdout = "";
		let stderr = "";

		hurlProcess.stdout.on("data", (data) => {
			const str = data.toString();
			stdout += str;
		});

		hurlProcess.stderr.on("data", (data) => {
			const str = data.toString();
			stderr += str;
		});

		hurlProcess.on("close", (code) => {
			statusBarMessage.dispose();
			if (code === 0 || (code === 1 && !stderr.includes("error:"))) {
				resolve({ stdout, stderr, isVeryVerbose });
			} else {
				reject(new Error(`Hurl process exited with code ${code}\n${stderr}`));
			}
		});

		hurlProcess.on("error", (error) => {
			statusBarMessage.dispose();
			reject(new Error(`Failed to start Hurl process: ${error.message}`));
		});
	});
}

interface HurlExecutionContentOptions {
	content: string;
	envFile?: string;
	variables: Record<string, string>;
}

export async function executeHurlWithContent(
	options: HurlExecutionContentOptions,
): Promise<HurlExecutionResult> {
	// Set status bar message
	const statusBarMessage = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
	);
	statusBarMessage.text = "Running Hurl...";
	statusBarMessage.show();

	const { content, envFile, variables } = options;

	// Get the verbosity configuration
	const config = vscode.workspace.getConfiguration("vscode-hurl-runner");
	const verboseMode = config.get<string>("verboseMode", "verbose");
	const isVeryVerbose = verboseMode === "very-verbose";
	const verboseFlag = isVeryVerbose ? "--very-verbose" : "--verbose";

	// Create a temporary file to store the content
	const fsPath = path.join(os.tmpdir(), "temp-hurl-content.hurl");
	const tmpFile = await vscode.workspace.fs.writeFile(
		vscode.Uri.file(fsPath),
		Buffer.from(content),
	);
	logger.info(`Created temporary file: ${fsPath}`, tmpFile);

	const args = [fsPath, verboseFlag];

	for (const [key, value] of Object.entries(variables)) {
		args.push("--variable", `${key}=${value}`);
	}

	if (envFile) {
		args.push("--variables-file", envFile);
	}

	logger.info(`Executing command: hurl ${args.join(" ")}`);
	return new Promise((resolve, reject) => {
		const hurlProcess = spawn("hurl", args);
		let stdout = "";
		let stderr = "";

		hurlProcess.stdout.on("data", (data) => {
			const str = data.toString();
			stdout += str;
		});

		hurlProcess.stderr.on("data", (data) => {
			const str = data.toString();
			stderr += str;
		});

		hurlProcess.on("close", (code) => {
			statusBarMessage.dispose();
			// Clean up the temporary file
			vscode.workspace.fs.delete(vscode.Uri.file(fsPath));
			if (code === 0 || (code === 1 && !stderr.includes("error:"))) {
				resolve({ stdout, stderr, isVeryVerbose });
			} else {
				reject(new Error(`Hurl process exited with code ${code}\n${stderr}`));
			}
		});

		hurlProcess.on("error", (error) => {
			statusBarMessage.dispose();
			// Clean up the temporary file
			vscode.workspace.fs.delete(vscode.Uri.file(fsPath));
			reject(new Error(`Failed to start Hurl process: ${error.message}`));
		});
	});
}
