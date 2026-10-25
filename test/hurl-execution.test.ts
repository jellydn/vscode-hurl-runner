import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CancellationToken } from "vscode";
import { config } from "../src/config";
import { executeHurl, executeHurlWithContent } from "../src/utils";

const progress = vi.hoisted(() => ({
	preCancelled: false,
	runs: [] as {
		cancel: () => void;
		listeners: Set<(event: unknown) => unknown>;
	}[],
}));

vi.mock("vscode", () => ({
	ProgressLocation: { Notification: 15 },
	window: {
		withProgress: (
			options: { cancellable: boolean },
			task: (progress: object, token: CancellationToken) => Promise<unknown>,
		) => {
			expect(options.cancellable).toBe(true);
			const listeners = new Set<(event: unknown) => unknown>();
			const token = {
				isCancellationRequested: progress.preCancelled,
				onCancellationRequested: (listener: (event: unknown) => unknown) => {
					listeners.add(listener);
					return { dispose: () => listeners.delete(listener) };
				},
			};
			progress.runs.push({
				listeners,
				cancel: () => {
					token.isCancellationRequested = true;
					for (const listener of listeners) listener(undefined);
				},
			});
			return task({}, token);
		},
	},
}));
vi.mock("reactive-vscode", () => ({ defineLogger: () => ({ info: vi.fn() }) }));
vi.mock("../src/config", () => ({
	config: { hurlPath: process.execPath, verboseMode: "verbose" },
}));

describe("Hurl execution", () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "hurl-execution-test-"));
		progress.runs = [];
		progress.preCancelled = false;
		config.hurlPath = process.execPath;
	});
	afterEach(async () => {
		for (const run of progress.runs) run.cancel();
		await rm(dir, { recursive: true, force: true });
	});

	it.each([false, true])(
		"stops a running selection (ignores SIGTERM: %s) and removes its file",
		async (ignoreTerm) => {
			const marker = join(dir, "ready.json");
			const result = executeHurlWithContent({
				content: `
				const fs = require('node:fs');
				${ignoreTerm ? "process.on('SIGTERM', () => {});" : ""}
				fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ pid: process.pid, file: __filename }));
				setInterval(() => {}, 100);
			`,
				variables: {},
			});
			const rejected = expect(result).rejects.toThrow(
				"Hurl request cancelled.",
			);
			await vi.waitFor(() => expect(existsSync(marker)).toBe(true));
			const { pid, file } = JSON.parse(await readFile(marker, "utf8"));
			progress.runs[0].cancel();
			await rejected;
			expect(() => process.kill(pid, 0)).toThrow();
			expect(existsSync(file)).toBe(false);
			expect(progress.runs[0].listeners.size).toBe(0);
		},
	);

	it("does not start a pre-cancelled file run", async () => {
		progress.preCancelled = true;
		await expect(
			executeHurl({ filePath: join(dir, "missing.hurl"), variables: {} }),
		).rejects.toThrow("Hurl request cancelled.");
	});

	it("keeps concurrent runs independent and preserves successful output", async () => {
		const first = executeHurlWithContent({
			content: "setInterval(() => {}, 100);",
			variables: {},
		});
		const cancelled = expect(first).rejects.toThrow("Hurl request cancelled.");
		await vi.waitFor(() => expect(progress.runs).toHaveLength(1));
		const second = executeHurlWithContent({
			content: 'console.log("second");',
			variables: {},
		});
		progress.runs[0].cancel();
		await cancelled;
		expect(await second).toEqual({
			stdout: "second\n",
			stderr: "",
			isVeryVerbose: false,
		});
	});

	it("reports startup and process failures", async () => {
		const filePath = join(dir, "failure.js");
		await writeFile(
			filePath,
			'console.error("error: failed"); process.exitCode = 1;',
		);
		await expect(executeHurl({ filePath, variables: {} })).rejects.toThrow(
			"Hurl process exited with code 1\nerror: failed",
		);
		config.hurlPath = join(dir, "missing-executable");
		await expect(
			executeHurlWithContent({ content: "", variables: {} }),
		).rejects.toThrow("Failed to start Hurl process");
		expect(progress.runs.every((run) => run.listeners.size === 0)).toBe(true);
	});
});
