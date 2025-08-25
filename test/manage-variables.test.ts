import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Helper function to find default .env file without VSCode dependencies
async function findDefaultEnvFileHelper(hurlFilePath: string): Promise<string | undefined> {
	const dir = path.dirname(hurlFilePath);
	const baseName = path.basename(hurlFilePath, path.extname(hurlFilePath));
	
	// Check for .env file first
	const defaultEnvPath = path.join(dir, ".env");
	try {
		await fs.access(defaultEnvPath);
		return defaultEnvPath;
	} catch {
		// .env doesn't exist, continue
	}
	
	// Check for {filename}.env file
	const namedEnvPath = path.join(dir, `${baseName}.env`);
	try {
		await fs.access(namedEnvPath);
		return namedEnvPath;
	} catch {
		// {filename}.env doesn't exist
	}
	
	return undefined;
}

// Helper function to get effective env file without VSCode dependencies
async function getEffectiveEnvFileHelper(
	hurlFilePath: string,
	manualEnvFile?: string,
): Promise<string | undefined> {
	// Manual selection has priority
	if (manualEnvFile) {
		return manualEnvFile;
	}
	
	// Try to auto-detect default env file
	return await findDefaultEnvFileHelper(hurlFilePath);
}

describe("Env File Auto-Detection", () => {
	let tempDir: string;

	beforeEach(async () => {
		// Create a temporary directory for each test
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hurl-test-"));
	});

	afterEach(async () => {
		// Clean up the temporary directory
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe("findDefaultEnvFile", () => {
		it("should find .env file in the same directory", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");
			const envFilePath = path.join(tempDir, ".env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "BASE_URL=https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should find {filename}.env file when .env doesn't exist", async () => {
			const hurlFilePath = path.join(tempDir, "scene1.hurl");
			const envFilePath = path.join(tempDir, "scene1.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "BASE_URL=https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should prefer .env over {filename}.env", async () => {
			const hurlFilePath = path.join(tempDir, "scene1.hurl");
			const defaultEnvPath = path.join(tempDir, ".env");
			const namedEnvPath = path.join(tempDir, "scene1.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(defaultEnvPath, "DEFAULT_VAR=value\n");
			await fs.writeFile(namedEnvPath, "NAMED_VAR=value\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(defaultEnvPath);
		});

		it("should return undefined when no env files exist", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");

			// Create only the hurl file
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBeUndefined();
		});

		it("should handle files in nested directories", async () => {
			const nestedDir = path.join(tempDir, "nested");
			await fs.mkdir(nestedDir);

			const hurlFilePath = path.join(nestedDir, "api.hurl");
			const envFilePath = path.join(nestedDir, "api.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://api.example.com\n");
			await fs.writeFile(envFilePath, "API_KEY=secret\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});
	});

	describe("getEffectiveEnvFile", () => {
		it("should return manual env file when provided", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");
			const manualEnvPath = path.join(tempDir, "manual.env");
			const autoEnvPath = path.join(tempDir, ".env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(manualEnvPath, "MANUAL_VAR=value\n");
			await fs.writeFile(autoEnvPath, "AUTO_VAR=value\n");

			const result = await getEffectiveEnvFileHelper(hurlFilePath, manualEnvPath);
			expect(result).toBe(manualEnvPath);
		});

		it("should return auto-detected env file when no manual file", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");
			const envFilePath = path.join(tempDir, ".env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "AUTO_VAR=value\n");

			const result = await getEffectiveEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should return undefined when no manual file and no auto-detected file", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");

			// Create only the hurl file
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");

			const result = await getEffectiveEnvFileHelper(hurlFilePath);
			expect(result).toBeUndefined();
		});

		it("should prioritize manual file even if it doesn't exist", async () => {
			const hurlFilePath = path.join(tempDir, "test.hurl");
			const manualEnvPath = path.join(tempDir, "nonexistent.env");
			const autoEnvPath = path.join(tempDir, ".env");

			// Create files (but not the manual one)
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(autoEnvPath, "AUTO_VAR=value\n");

			const result = await getEffectiveEnvFileHelper(hurlFilePath, manualEnvPath);
			expect(result).toBe(manualEnvPath);
		});
	});
});