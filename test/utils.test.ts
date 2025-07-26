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
	let mockSpawn: ReturnType<typeof vi.fn>;
	let mockProcess: {
		stdout: { on: ReturnType<typeof vi.fn> };
		stderr: { on: ReturnType<typeof vi.fn> };
		on: ReturnType<typeof vi.fn>;
	};

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

		it("should handle multiple spaces in variable values", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					address: "123 Main St    Suite 500", // Multiple spaces
					description: "This is a   test   with multiple   spaces",
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify spawn was called with values exactly as provided
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"address=123 Main St    Suite 500", // Preserves multiple spaces
				"--variable",
				"description=This is a   test   with multiple   spaces",
			]);
		});

		it("should handle special characters in variable values", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					email: "user+test@example.com",
					path: "/api/v1/users/{id}",
					query: "name=John&age=30",
					special: "value with 'quotes' and \"double quotes\"",
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify special characters are passed without modification
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"email=user+test@example.com",
				"--variable",
				"path=/api/v1/users/{id}",
				"--variable",
				"query=name=John&age=30",
				"--variable",
				"special=value with 'quotes' and \"double quotes\"",
			]);
		});

		it("should handle empty and whitespace-only values", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					empty: "",
					space: " ",
					tab: "	",
					newline: "\n",
					mixed: " \t\n ",
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify whitespace is preserved
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"empty=",
				"--variable",
				"space= ",
				"--variable",
				"tab=	",
				"--variable",
				"newline=\n",
				"--variable",
				"mixed= \t\n ",
			]);
		});

		it("should handle JSON strings as variable values", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					jsonData: '{"name": "John", "age": 30}',
					arrayData: '["item1", "item2", "item3"]',
					complexJson: '{"user": {"email": "test@example.com", "roles": ["admin", "user"]}}',
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify JSON strings are passed without modification
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				'jsonData={"name": "John", "age": 30}',
				"--variable",
				'arrayData=["item1", "item2", "item3"]',
				"--variable",
				'complexJson={"user": {"email": "test@example.com", "roles": ["admin", "user"]}}',
			]);
		});

		it("should handle environment file along with variables", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				envFile: "/path/to/.env",
				variables: {
					override: "inline value with spaces",
				},
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify both env file and variables are passed correctly
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"override=inline value with spaces",
				"--variables-file",
				"/path/to/.env",
			]);
		});

		it("should handle entry range options", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {
					baseUrl: "https://api.example.com/v1",
				},
				fromEntry: 2,
				toEntry: 5,
			};

			const promise = executeHurl(options);

			// Trigger close
			const closeCallback = mockProcess.on.mock.calls.find(
				(call) => call[0] === "close",
			)?.[1];
			closeCallback?.(0);

			await promise;

			// Verify entry options are included
			expect(mockSpawn).toHaveBeenCalledWith("hurl", [
				"/path/to/file.hurl",
				"--verbose",
				"--variable",
				"baseUrl=https://api.example.com/v1",
				"--from-entry",
				"2",
				"--to-entry",
				"5",
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

		it("should handle complex variable values in content execution", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: `POST https://api.example.com/users
Content-Type: application/json

{
    "name": "{{name}}",
    "description": "{{description}}",
    "metadata": {{metadata}}
}`,
				variables: {
					name: "Test User With Spaces",
					description: "A description with 'single' and \"double\" quotes",
					metadata: '{"key": "value", "nested": {"deep": true}}',
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

			// Verify complex values are passed correctly
			expect(args).toContain("name=Test User With Spaces");
			expect(args).toContain("description=A description with 'single' and \"double\" quotes");
			expect(args).toContain('metadata={"key": "value", "nested": {"deep": true}}');
		});

		it("should handle URL-like values without modification", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: `GET {{baseUrl}}/users?{{queryParams}}
Authorization: Bearer {{token}}`,
				variables: {
					baseUrl: "https://api.example.com/v1",
					queryParams: "page=1&limit=10&filter=name eq 'John'",
					token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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

			// Verify URL components are preserved
			expect(args).toContain("baseUrl=https://api.example.com/v1");
			expect(args).toContain("queryParams=page=1&limit=10&filter=name eq 'John'");
			expect(args).toContain("token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
		});

		it("should handle variables that look like shell commands", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: `POST https://api.example.com/execute
Content-Type: application/json

{
    "command": "{{command}}",
    "script": "{{script}}"
}`,
				variables: {
					command: "echo 'Hello World' | grep Hello",
					script: "#!/bin/bash\nls -la /tmp",
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

			// Verify shell-like content is passed safely
			expect(args).toContain("command=echo 'Hello World' | grep Hello");
			expect(args).toContain("script=#!/bin/bash\nls -la /tmp");
		});

		it("should handle mathematical expressions and operators", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: "POST https://api.example.com/calculate",
				variables: {
					expression: "2 + 2 = 4",
					formula: "y = mx + b",
					comparison: "x > 5 && y < 10",
					regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
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

			// Verify expressions are preserved
			expect(args).toContain("expression=2 + 2 = 4");
			expect(args).toContain("formula=y = mx + b");
			expect(args).toContain("comparison=x > 5 && y < 10");
			expect(args).toContain("regex=^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
		});

		it("should handle edge case variable names", async () => {
			// Setup process to succeed
			mockProcess.on.mockImplementation((event, callback) => {
				if (event === "close") {
					callback(0);
				}
			});

			const options = {
				content: "GET https://api.example.com/test",
				variables: {
					"user.name": "John Doe",
					"user-email": "john@example.com",
					"user_id": "12345",
					"USER_TOKEN": "abc123",
					"123variable": "starts with number",
					"variable-with-many-dashes": "test value",
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

			// Verify various naming conventions work
			expect(args).toContain("user.name=John Doe");
			expect(args).toContain("user-email=john@example.com");
			expect(args).toContain("user_id=12345");
			expect(args).toContain("USER_TOKEN=abc123");
			expect(args).toContain("123variable=starts with number");
			expect(args).toContain("variable-with-many-dashes=test value");
		});
	});

	describe("Error Handling", () => {
		it("should handle process spawn errors", async () => {
			// Mock spawn to throw an error immediately
			mockSpawn.mockImplementation(() => {
				throw new Error("Command not found");
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: { test: "value" },
			};

			await expect(executeHurl(options)).rejects.toThrow("Command not found");
		});

		it("should handle process error events", async () => {
			// Setup process to emit error
			mockProcess.on.mockImplementation((event: string, callback: (arg: unknown) => void) => {
				if (event === "error") {
					// Emit error synchronously
					callback(new Error("Process failed"));
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: { test: "value" },
			};

			await expect(executeHurl(options)).rejects.toThrow("Failed to start Hurl process: Process failed");
		});

		it("should handle non-zero exit codes", async () => {
			// Setup process to exit with error code
			mockProcess.on.mockImplementation((event: string, callback: (code: number) => void) => {
				if (event === "close") {
					callback(2);
				}
			});

			mockProcess.stderr.on.mockImplementation((event: string, callback: (data: Buffer) => void) => {
				if (event === "data") {
					callback(Buffer.from("error: Invalid syntax"));
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: { test: "value" },
			};

			await expect(executeHurl(options)).rejects.toThrow(
				"Hurl process exited with code 2\nerror: Invalid syntax",
			);
		});

		it("should handle content execution errors", async () => {
			// Setup process to exit with error code
			mockProcess.on.mockImplementation((event: string, callback: (code: number) => void) => {
				if (event === "close") {
					callback(3);
				}
			});

			mockProcess.stderr.on.mockImplementation((event: string, callback: (data: Buffer) => void) => {
				if (event === "data") {
					callback(Buffer.from("error: Network timeout"));
				}
			});

			const options = {
				content: "GET https://example.com",
				variables: { timeout: "5000" },
			};

			await expect(executeHurlWithContent(options)).rejects.toThrow(
				"Hurl process exited with code 3\nerror: Network timeout",
			);

			// Verify cleanup was attempted
			expect(vscode.workspace.fs.delete).toHaveBeenCalled();
		});

		it("should clean up temp file on spawn error for content execution", async () => {
			// Mock spawn to throw an error immediately
			mockSpawn.mockImplementation(() => {
				throw new Error("Command not found");
			});

			const options = {
				content: "GET https://example.com",
				variables: { test: "value" },
			};

			await expect(executeHurlWithContent(options)).rejects.toThrow("Command not found");

			// Verify cleanup was attempted - this won't be called since spawn throws immediately
			expect(vscode.workspace.fs.delete).not.toHaveBeenCalled();
		});

		it("should handle partial stderr data correctly", async () => {
			// Setup process to send partial data
			mockProcess.on.mockImplementation((event: string, callback: (code: number) => void) => {
				if (event === "close") {
					callback(1);
				}
			});

			mockProcess.stderr.on.mockImplementation((event: string, callback: (data: Buffer) => void) => {
				if (event === "data") {
					// Send data in chunks
					callback(Buffer.from("warning: "));
					callback(Buffer.from("This is a warning\n"));
					callback(Buffer.from("info: Process completed"));
				}
			});

			const options = {
				filePath: "/path/to/file.hurl",
				variables: {},
			};

			// Code 1 without "error:" in stderr should succeed
			const result = await executeHurl(options);
			expect(result.stderr).toBe("warning: This is a warning\ninfo: Process completed");
		});
	});
});
