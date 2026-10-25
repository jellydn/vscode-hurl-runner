import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { defineLogger } from "reactive-vscode";
import * as vscode from "vscode";

import { config } from "./config";
import { displayName } from "./generated/meta";
import type { ParsedHurlOutput } from "./hurl-parser";

export const logger = defineLogger(displayName);
export const responseLogger = defineLogger(`${displayName} Response`);

/**
 * Find default .env file in the same directory as the Hurl file
 * Looks for common .env file patterns: .env, .env.local, [filename].env
 */
export function findDefaultEnvFile(hurlFilePath: string): string | undefined {
	const dir = path.dirname(hurlFilePath);
	const baseName = path.basename(hurlFilePath, path.extname(hurlFilePath));

	// List of possible .env file names to check
	const possibleEnvFiles = [
		`${baseName}.env`, // e.g., scene1.env for scene1.hurl
		".env", // Standard .env file
		".env.local", // Local environment file
		".env.development", // Development environment file
		".env.production", // Production environment file
		".env.test", // Test environment file
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
	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Running Hurl...",
			cancellable: true,
		},
		async (_progress, token) =>
			new Promise<HurlExecutionResult>((resolve, reject) => {
				if (token.isCancellationRequested) {
					reject(new Error("Hurl request cancelled."));
					return;
				}
				const hurlProcess = spawn(hurlPath, args);
				let stdout = "";
				let stderr = "";
				let cancelled = false;
				let killTimeout: ReturnType<typeof setTimeout> | undefined;
				const cancel = () => {
					if (cancelled) return;
					cancelled = true;
					// Hurl owns the retry loop; terminate it even during a retry delay.
					hurlProcess.kill();
					killTimeout = setTimeout(() => hurlProcess.kill("SIGKILL"), 1000);
				};
				const cancellation = token.onCancellationRequested(cancel);
				if (token.isCancellationRequested) cancel();
				const cleanup = () => {
					cancellation.dispose();
					clearTimeout(killTimeout);
				};

				hurlProcess.stdout.on("data", (data) => {
					const str = data.toString();
					stdout += str;
				});

				hurlProcess.stderr.on("data", (data) => {
					const str = data.toString();
					stderr += str;
				});

				hurlProcess.on("close", (code) => {
					cleanup();
					if (cancelled) {
						reject(new Error("Hurl request cancelled."));
					} else if (code === 0 || (code === 1 && !stderr.includes("error:"))) {
						resolve({ stdout, stderr, isVeryVerbose });
					} else {
						reject(
							new Error(`Hurl process exited with code ${code}\n${stderr}`),
						);
					}
				});

				hurlProcess.on("error", (error) => {
					cleanup();
					reject(new Error(`Failed to start Hurl process: ${error.message}`));
				});
			}),
	);
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
	const { content, variables, contextFilePath } = options;

	// Use provided envFile or find default .env file in the context directory
	let envFile = options.envFile;
	if (!envFile && contextFilePath) {
		envFile = findDefaultEnvFile(contextFilePath);
	}

	// Isolate concurrent selections and retain the file until the process stops.
	const tempDir = await fs.promises.mkdtemp(
		path.join(os.tmpdir(), "hurl-runner-"),
	);
	const filePath = path.join(tempDir, "selection.hurl");
	try {
		await fs.promises.writeFile(filePath, content);
		return await executeHurl({ filePath, envFile, variables });
	} finally {
		await fs.promises.rm(tempDir, { recursive: true, force: true });
	}
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
