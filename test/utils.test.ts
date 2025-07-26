import { spawn } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { executeHurl, executeHurlWithContent } from "../src/utils";

// Mock vscode
vi.mock("vscode", () => ({
	window: {
		createStatusBarItem: vi.fn(() => ({
			text: "",
			show: vi.fn(),
			dispose: vi.fn(),
		})),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			show: vi.fn(),
			clear: vi.fn(),
		})),
	},
	StatusBarAlignment: {
		Left: 1,
		Right: 2,
	},
	workspace: {
		fs: {
			writeFile: vi.fn(),
			delete: vi.fn(),
		},
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path })),
	},
}));

// Mock child_process spawn
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

// Mock reactive-vscode
vi.mock("reactive-vscode", () => ({
	useLogger: vi.fn(() => ({
		info: vi.fn(),
		error: vi.fn(),
		clear: vi.fn(),
		show: vi.fn(),
	})),
}));

// Mock config
vi.mock("../src/config", () => ({
	config: {
		hurlPath: "hurl",
		verboseMode: "verbose",
		captureToGlobalVariable: true,
	},
}));

describe("Utils - Variable Expansion", () => {
	let mockSpawn: any;
	let mockProcess: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock process
		mockProcess = {
			stdout: {
				on: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
			},
			on: vi.fn(),
		};

		// Setup spawn mock
		mockSpawn = vi.mocked(spawn);
		mockSpawn.mockReturnValue(mockProcess);
	});

	describe("executeHurl", () => {
		it("should pass variables without quotes for values with spaces", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					email: "user@example.com",
					name: "John Doe", // Contains space
					token: "abc123",
				},
			};

			const promise = executeHurl(options);

			// Trigger stdout/stderr data
			const stdoutCallback = mockProcess.stdout.on.mock.calls[0]?.[1];
			const stderrCallback = mockProcess.stderr.on.mock.calls[0]?.[1];
			stdoutCallback?.(Buffer.from("Response data"));
			stderrCallback?.(Buffer.from("Request data"));

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify spawn was called with correct arguments
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"email=user@example.com",
				"--variable",
				"name=John Doe", // No quotes added
				"--variable",
				"token=abc123",
			]);
		});

		it("should pass variables without quotes for template variables", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					email: "{{email}}",
					uuid: "{{newUuid}}",
					date: "{{newDate}}",
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify spawn was called with correct arguments - no quotes around template variables
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"email={{email}}", // No quotes added
				"--variable",
				"uuid={{newUuid}}", // No quotes added
				"--variable",
				"date={{newDate}}", // No quotes added
			]);
		});
	});

	describe("executeHurlWithContent", () => {
		it("should pass variables without quotes for values with spaces", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: "GET https://api.example.com",
				variables: {
					email: "user@example.com",
					name: "Jane Smith", // Contains space
					apiKey: "xyz789",
				},
			};

			const promise = executeHurlWithContent(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Get the actual call arguments
			const spawnArgs = mockSpawn.mock.calls[0];
			expect(spawnArgs[0]).toBe("hurl");

			// The first argument should be the temp file path
			const args = spawnArgs[1];
			expect(args[1]).toBe("--verbose");
			expect(args[2]).toBe("--variable");
			expect(args[3]).toBe("email=user@example.com");
			expect(args[4]).toBe("--variable");
			expect(args[5]).toBe("name=Jane Smith"); // No quotes added
			expect(args[6]).toBe("--variable");
			expect(args[7]).toBe("apiKey=xyz789");
		});

		it("should pass variables without quotes for inline template variables", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: `POST https://httpbin.org/post
Content-Type: application/json

{
    "email": "{{email}}",
    "id": "{{newUuid}}"
}`,
				variables: {
					email: "test@example.com",
				},
			};

			const promise = executeHurlWithContent(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Get the actual call arguments
			const spawnArgs = mockSpawn.mock.calls[0];
			const args = spawnArgs[1];

			// Verify no quotes are added around the variable value
			expect(args).toContain("--variable");
			expect(args).toContain("email=test@example.com"); // No quotes
		});
	});
});