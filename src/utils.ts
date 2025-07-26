import { spawn } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { config } from "./config";
import { displayName } from "./generated/meta";
import type { ParsedHurlOutput } from "./hurl-parser";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} Response`);

interface HurlExecutionResult {
	stdout: string;
	stderr: string;
	isVeryVerbose: boolean;
}

export interface HurlExecutionOptions {
	filePath: string;
	envFile?: string;
	variables: Record<string, string>;
	fromEntry?: number;
	toEntry?: number;
}

/**
 * Adds variable arguments to the command args array
 * @param args - The arguments array to append to
 * @param variables - The variables to add
 */
function addVariableArgs(args: string[], variables: Record<string, string>): void {
	for (const [key, value] of Object.entries(variables)) {
		// Don't add quotes - spawn handles escaping properly
		args.push("--variable", `${key}=${value}`);
	}
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
	const verboseMode = config.verboseMode;
	const isVeryVerbose = verboseMode === "very-verbose";
	const verboseFlag = isVeryVerbose ? "--very-verbose" : "--verbose";
	const args = [filePath, verboseFlag];

	addVariableArgs(args, variables);

	if (envFile) {
		args.push("--variables-file", envFile);
	}

	if (fromEntry) {
		args.push("--from-entry", fromEntry.toString());
	}
	if (toEntry) {
		args.push("--to-entry", toEntry.toString());
	}

	// Get the hurlPath from the configuration
	const hurlPath = config.hurlPath;

	logger.info(`Executing command: ${hurlPath} ${args.join(" ")}`);
	return new Promise((resolve, reject) => {
		const hurlProcess = spawn(hurlPath, args);
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
	const verboseMode = config.verboseMode;
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

	addVariableArgs(args, variables);

	if (envFile) {
		args.push("--variables-file", envFile);
	}

	// Get the hurlPath from the configuration
	const hurlPath = config.hurlPath;

	logger.info(`Executing command: ${hurlPath} ${args.join(" ")}`);
	return new Promise((resolve, reject) => {
		const hurlProcess = spawn(hurlPath, args);
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

export interface LastResponseInfo {
	result: {
		stdout: string;
		stderr: string;
		isVeryVerbose?: boolean;
	};
	isError: boolean;
	parsedOutput: ParsedHurlOutput;
}
