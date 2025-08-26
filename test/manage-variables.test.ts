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

	describe("Edge Cases and Integration", () => {
		it("should handle file paths with special characters", async () => {
			const specialDir = path.join(tempDir, "api v2.0");
			await fs.mkdir(specialDir);

			const hurlFilePath = path.join(specialDir, "test-api.hurl");
			const envFilePath = path.join(specialDir, "test-api.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://api.example.com\n");
			await fs.writeFile(envFilePath, "API_VERSION=2.0\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should handle files with no extension", async () => {
			const hurlFilePath = path.join(tempDir, "hurl-file");
			const envFilePath = path.join(tempDir, "hurl-file.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "BASE_URL=https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should handle complex directory structures", async () => {
			const projectDir = path.join(tempDir, "project");
			const apiDir = path.join(projectDir, "api");
			const v1Dir = path.join(apiDir, "v1");
			await fs.mkdir(projectDir);
			await fs.mkdir(apiDir);
			await fs.mkdir(v1Dir);

			const hurlFilePath = path.join(v1Dir, "users.hurl");
			const envFilePath = path.join(v1Dir, ".env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://api.example.com/v1/users\n");
			await fs.writeFile(envFilePath, "API_BASE=https://api.example.com/v1\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should handle different file case on case-sensitive systems", async () => {
			const hurlFilePath = path.join(tempDir, "Scene1.hurl");
			const envFilePath = path.join(tempDir, "Scene1.env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "BASE_URL=https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(envFilePath);
		});

		it("should return correct path when both .env and named env exist in same directory", async () => {
			const hurlFilePath = path.join(tempDir, "scene1.hurl");
			const defaultEnvPath = path.join(tempDir, ".env");
			const namedEnvPath = path.join(tempDir, "scene1.env");

			// Create all files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(defaultEnvPath, "DEFAULT_BASE_URL=https://default.com\n");
			await fs.writeFile(namedEnvPath, "NAMED_BASE_URL=https://named.com\n");

			// Should prioritize .env over named env file
			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBe(defaultEnvPath);

			// Test that manual selection overrides auto-detection
			const manualResult = await getEffectiveEnvFileHelper(hurlFilePath, namedEnvPath);
			expect(manualResult).toBe(namedEnvPath);
		});

		it("should handle empty directory gracefully", async () => {
			const emptyDir = path.join(tempDir, "empty");
			await fs.mkdir(emptyDir);

			const hurlFilePath = path.join(emptyDir, "test.hurl");
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");

			const result = await findDefaultEnvFileHelper(hurlFilePath);
			expect(result).toBeUndefined();
		});

		it("should work with relative paths", async () => {
			// Test with relative path to ensure path.join works correctly
			const hurlFilePath = path.join(".", "test.hurl");
			const result = await findDefaultEnvFileHelper(hurlFilePath);
			// Should not throw and should return undefined since files don't exist
			expect(result).toBeUndefined();
		});

		it("should handle concurrent access to the same files", async () => {
			const hurlFilePath = path.join(tempDir, "concurrent.hurl");
			const envFilePath = path.join(tempDir, ".env");

			// Create files
			await fs.writeFile(hurlFilePath, "GET https://example.com\n");
			await fs.writeFile(envFilePath, "BASE_URL=https://example.com\n");

			// Test concurrent access
			const promises = Array.from({ length: 10 }, () => 
				findDefaultEnvFileHelper(hurlFilePath)
			);
			
			const results = await Promise.all(promises);
			
			// All results should be the same
			for (const result of results) {
				expect(result).toBe(envFilePath);
			}
		});
	});

	describe("Real-world Example Structure Testing", () => {
		it("should handle example directory structure like the actual project", async () => {
			// Create structure similar to the actual example directory
			const usersDir = path.join(tempDir, "users");
			const postsDir = path.join(tempDir, "posts");
			await fs.mkdir(usersDir);
			await fs.mkdir(postsDir);

			// Users directory: only named env file
			const usersHurlPath = path.join(usersDir, "users.hurl");
			const usersEnvPath = path.join(usersDir, "users.env");
			await fs.writeFile(usersHurlPath, "GET {{api_base}}/users\n");
			await fs.writeFile(usersEnvPath, "api_base=https://api.example.com\n");

			// Posts directory: both .env and named env file (.env should win)
			const postsHurlPath = path.join(postsDir, "posts.hurl");
			const postsDefaultEnvPath = path.join(postsDir, ".env");
			const postsNamedEnvPath = path.join(postsDir, "posts.env");
			await fs.writeFile(postsHurlPath, "GET {{api_base}}/posts\n");
			await fs.writeFile(postsDefaultEnvPath, "api_base=https://jsonplaceholder.typicode.com\n");
			await fs.writeFile(postsNamedEnvPath, "api_base=https://example.com\n");

			// Test users directory (should find users.env)
			const usersResult = await findDefaultEnvFileHelper(usersHurlPath);
			expect(usersResult).toBe(usersEnvPath);

			// Test posts directory (should prefer .env over posts.env)
			const postsResult = await findDefaultEnvFileHelper(postsHurlPath);
			expect(postsResult).toBe(postsDefaultEnvPath);
		});

		it("should work with the exact same file structure as example directory", async () => {
			// Recreate the exact structure from example/ directory
			const exampleDir = path.join(tempDir, "example");
			const postsDir = path.join(exampleDir, "posts");
			const usersDir = path.join(exampleDir, "users");
			
			await fs.mkdir(exampleDir);
			await fs.mkdir(postsDir);
			await fs.mkdir(usersDir);

			// Posts directory files
			await fs.writeFile(path.join(postsDir, "posts.hurl"), "GET {{api_base}}/posts/{{post_id}}\n");
			await fs.writeFile(path.join(postsDir, ".env"), "api_base=https://jsonplaceholder.typicode.com\npost_id=1\n");
			await fs.writeFile(path.join(postsDir, "posts.env"), "# This file will be ignored in favor of .env\napi_base=https://example.com\npost_id=999\n");

			// Users directory files
			await fs.writeFile(path.join(usersDir, "users.hurl"), "GET {{api_base}}/users\n");
			await fs.writeFile(path.join(usersDir, "users.env"), "api_base=https://jsonplaceholder.typicode.com\n");

			// Test posts.hurl should use .env (not posts.env)
			const postsResult = await findDefaultEnvFileHelper(path.join(postsDir, "posts.hurl"));
			expect(postsResult).toBe(path.join(postsDir, ".env"));

			// Test users.hurl should use users.env
			const usersResult = await findDefaultEnvFileHelper(path.join(usersDir, "users.hurl"));
			expect(usersResult).toBe(path.join(usersDir, "users.env"));
		});

		it("should handle priority scenarios with different file combinations", async () => {
			// Test scenario 1: Only .env exists
			const scenario1Dir = path.join(tempDir, "scenario1");
			await fs.mkdir(scenario1Dir);
			const s1HurlPath = path.join(scenario1Dir, "test.hurl");
			const s1EnvPath = path.join(scenario1Dir, ".env");
			await fs.writeFile(s1HurlPath, "GET https://example.com\n");
			await fs.writeFile(s1EnvPath, "VAR=value\n");

			const s1Result = await findDefaultEnvFileHelper(s1HurlPath);
			expect(s1Result).toBe(s1EnvPath);

			// Test scenario 2: Only named env exists
			const scenario2Dir = path.join(tempDir, "scenario2");
			await fs.mkdir(scenario2Dir);
			const s2HurlPath = path.join(scenario2Dir, "api.hurl");
			const s2EnvPath = path.join(scenario2Dir, "api.env");
			await fs.writeFile(s2HurlPath, "GET https://api.example.com\n");
			await fs.writeFile(s2EnvPath, "API_KEY=secret\n");

			const s2Result = await findDefaultEnvFileHelper(s2HurlPath);
			expect(s2Result).toBe(s2EnvPath);

			// Test scenario 3: Both exist (.env should win)
			const scenario3Dir = path.join(tempDir, "scenario3");
			await fs.mkdir(scenario3Dir);
			const s3HurlPath = path.join(scenario3Dir, "service.hurl");
			const s3DefaultEnvPath = path.join(scenario3Dir, ".env");
			const s3NamedEnvPath = path.join(scenario3Dir, "service.env");
			await fs.writeFile(s3HurlPath, "GET https://service.example.com\n");
			await fs.writeFile(s3DefaultEnvPath, "SERVICE_URL=https://default.com\n");
			await fs.writeFile(s3NamedEnvPath, "SERVICE_URL=https://named.com\n");

			const s3Result = await findDefaultEnvFileHelper(s3HurlPath);
			expect(s3Result).toBe(s3DefaultEnvPath);
		});
	});
});