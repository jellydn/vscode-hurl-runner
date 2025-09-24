import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { useLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { config } from "./config";
import { displayName } from "./generated/meta";
import type { ParsedHurlOutput } from "./hurl-parser";

export const logger = useLogger(displayName);
export const responseLogger = useLogger(`${displayName} Response`);

/**
 * Find default .env file in the same directory as the Hurl file
 * Looks for common .env file patterns: .env, .env.local, [filename].env
 */
export function findDefaultEnvFile(hurlFilePath: string): string | undefined {
	const dir = path.dirname(hurlFilePath);
	const baseName = path.basename(hurlFilePath, path.extname(hurlFilePath));

	// List of possible .env file names to check
	const possibleEnvFiles = [
		`${baseName}.env`,        // e.g., scene1.env for scene1.hurl
		".env",                   // Standard .env file
		".env.local",              // Local environment file
		".env.development",        // Development environment file
		".env.production",         // Production environment file
		".env.test",               // Test environment file
	];

	for (const envFileName of possibleEnvFiles) {
		const envFilePath = path.join(dir, envFileName);
		try {
			if (fs.existsSync(envFilePath)) {
				logger.info(`Found default environment file: ${envFilePath}`);
				return envFilePath;
			}
		} catch {
			// Ignore errors and continue checking other files
		}
	}

	return undefined;
}

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

export async function executeHurl(
	options: HurlExecutionOptions,
): Promise<HurlExecutionResult> {
	// Set status bar message
	const statusBarMessage = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
	);
	statusBarMessage.text = "Running Hurl...";
	statusBarMessage.show();
	const { filePath, variables, fromEntry, toEntry } = options;

	// Use provided envFile or find default .env file in the same directory
	const envFile = options.envFile || findDefaultEnvFile(filePath);

	// Get the verbosity configuration
	const verboseMode = config.verboseMode;
	const isVeryVerbose = verboseMode === "very-verbose";
	const verboseFlag = isVeryVerbose ? "--very-verbose" : "--verbose";
	const args = [filePath, verboseFlag];

	for (const [key, value] of Object.entries(variables)) {
		// Wrap value in quotes if it contains spaces
		const formattedValue = value.includes(" ") ? `"${value}"` : value;
		args.push("--variable", `${key}=${formattedValue}`);
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
	contextFilePath?: string; // Optional context file path to determine directory for default .env file
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

	const { content, variables, contextFilePath } = options;

	// Use provided envFile or find default .env file in the context directory
	let envFile = options.envFile;
	if (!envFile && contextFilePath) {
		envFile = findDefaultEnvFile(contextFilePath);
	}

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

	for (const [key, value] of Object.entries(variables)) {
		// Wrap value in quotes if it contains spaces
		const formattedValue = value.includes(" ") ? `"${value}"` : value;
		args.push("--variable", `${key}=${formattedValue}`);
	}

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
