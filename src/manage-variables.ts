import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

import { config } from "./config";
import type { HurlVariablesProvider } from "./hurl-variables-provider";
import { logger } from "./utils";

export async function chooseEnvFile(): Promise<string | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace folder open");
		return;
	}

	const envFiles = await vscode.workspace.findFiles(
		"**/*env*",
		"**/node_modules/**",
	);

	// Filter files that contain .env in their name
	const filteredEnvFiles = envFiles.filter((file) =>
		file.fsPath.toLowerCase().includes(".env"),
	);

	const items = [
		{
			label: "Create New .env File",
			description: "Create a new .env file in the workspace",
			isCreateNew: true,
		},
		...filteredEnvFiles.map((file) => ({
			label: path.basename(file.fsPath),
			description: vscode.workspace.asRelativePath(file.fsPath),
			fsPath: file.fsPath,
			isCreateNew: false,
		})),
	];

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: "Select .env file to manage or create a new one",
	});

	if (selected?.isCreateNew) {
		return await createNewEnvFile(workspaceFolders[0].uri.fsPath);
	}

	// @ts-expect-error: fsPath is not defined on the selected object
	return selected?.fsPath;
}

async function createNewEnvFile(
	workspacePath: string,
): Promise<string | undefined> {
	const fileName = await vscode.window.showInputBox({
		prompt: "Enter the name for the new .env file",
		placeHolder: ".env.local",
	});

	if (!fileName) {
		return;
	}

	const newFilePath = path.join(workspacePath, fileName);

	try {
		await fs.writeFile(newFilePath, "", "utf-8");
		vscode.window.showInformationMessage(`Created new file: ${fileName}`);
		return newFilePath;
	} catch (error) {
		logger.error(`Failed to create new .env file: ${newFilePath}`, error);
		vscode.window.showErrorMessage("Failed to create new .env file");
		return;
	}
}

export async function manageEnvVariables(
	hurlVariablesProvider: HurlVariablesProvider,
	{
		filePath,
		envFile,
		isInline,
		showVariablesTree,
	}: {
		filePath: string;
		envFile?: string;
		isInline?: boolean;
		showVariablesTree?: boolean;
	},
) {
	if (isInline) {
		await manageInlineVariables({ hurlVariablesProvider, filePath });
		return;
	}

	const variables = envFile ? await loadEnvVariables(envFile) : {};
	hurlVariablesProvider.setVariablesForFile(filePath, variables);

	// Open the variables tree view
	await vscode.commands.executeCommand("workbench.view.extension.hurl-runner");

	const action = await vscode.window.showQuickPick(
		[
			{
				label: "Add",
				description: "Add a new variable",
			},
			{ label: "Edit", description: "Modify an existing variable" },
			{ label: "Remove", description: "Delete a variable" },
			{
				label: "Manage Inline Variables",
				description: "Add, edit, or remove inline variables",
			},
			{ label: "Done", description: "Use the variables in the current file" },
		],
		{ placeHolder: "Choose an action" },
	);

	switch (action?.label) {
		case "Add":
			await addVariable(hurlVariablesProvider, filePath);
			break;
		case "Edit":
			await editVariable(hurlVariablesProvider, filePath);
			break;
		case "Remove":
			await removeVariable(hurlVariablesProvider, filePath);
			break;
		case "Manage Inline Variables":
			await manageInlineVariables({
				hurlVariablesProvider,
				filePath,
				showVariablesTree,
			});
			break;
		default:
			return;
	}
}

async function loadEnvVariables(
	filePath: string,
): Promise<Record<string, string>> {
	try {
		const content = await fs.readFile(filePath, "utf-8");
		const variables: Record<string, string> = {};
		for (const line of content.split("\n")) {
			const [key, value] = line.split("=").map((part) => part.trim());
			if (key && value) {
				variables[key] = value;
			}
		}
		return variables;
	} catch (error) {
		logger.error(`Failed to load .env file: ${filePath}`, error);
		return {};
	}
}

export async function saveEnvVariables(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
): Promise<void> {
	const variables = hurlVariablesProvider.getVariablesBy(filePath);
	const content = Object.entries(variables)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");

	try {
		logger.info(`Saving variables to ${filePath}`, variables);
		await fs.writeFile(filePath, content, "utf-8");
		vscode.window.showInformationMessage("Variables saved successfully");
	} catch (error) {
		logger.error(`Failed to save .env file: ${filePath}`, error);
		vscode.window.showErrorMessage("Failed to save variables");
	}
}

async function showFileVariables(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getVariablesBy(filePath);
	logger.info(`Variables for ${path.basename(filePath)}:`);
	for (const [key, value] of Object.entries(variables)) {
		logger.info(`${key}: ${value}`);
	}
	logger.show();
}

async function addVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const name = await vscode.window.showInputBox({
		prompt: "Enter variable name",
	});
	if (name) {
		const value = await vscode.window.showInputBox({
			prompt: `Enter value for ${name}`,
		});
		if (value !== undefined) {
			hurlVariablesProvider.addVariableBy(filePath, name, value);
			await saveEnvVariables(hurlVariablesProvider, filePath);
			vscode.window.showInformationMessage(
				`Variable ${name} added successfully`,
			);
		}
	}
}

async function editVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getVariablesBy(filePath);
	const variableNames = Object.keys(variables);
	const name = await vscode.window.showQuickPick(variableNames, {
		placeHolder: "Select variable to edit",
	});
	if (name) {
		const currentValue = variables[name];
		const newValue = await vscode.window.showInputBox({
			prompt: `Enter new value for ${name}`,
			value: currentValue,
		});
		if (newValue !== undefined) {
			hurlVariablesProvider.addVariableBy(filePath, name, newValue);
			await saveEnvVariables(hurlVariablesProvider, filePath);
			vscode.window.showInformationMessage(
				`Variable ${name} updated successfully`,
			);
		}
	}
}

export async function removeVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getVariablesBy(filePath);
	const variableNames = Object.keys(variables);
	const name = await vscode.window.showQuickPick(variableNames, {
		placeHolder: "Select variable to remove",
	});
	if (name) {
		hurlVariablesProvider.removeVariableBy(filePath, name);
		await saveEnvVariables(hurlVariablesProvider, filePath);
		vscode.window.showInformationMessage(
			`Variable ${name} removed successfully`,
		);
	}
}

async function manageInlineVariables({
	hurlVariablesProvider,
	filePath,
	showVariablesTree,
}: {
	hurlVariablesProvider: HurlVariablesProvider;
	filePath: string;
	showVariablesTree?: boolean;
}) {
	// Open the variables tree view
	await vscode.commands.executeCommand("workbench.view.extension.hurl-runner");

	const action = await vscode.window.showQuickPick(
		[
			{
				label: "Add Inline Variable",
				description: "Add a new inline variable",
			},
			{
				label: "Edit Inline Variable",
				description: "Modify an existing inline variable",
			},
			{
				label: "Remove Inline Variable",
				description: "Delete an inline variable",
			},
		],
		{ placeHolder: "Choose an action for inline variables" },
	);

	switch (action?.label) {
		case "Add Inline Variable":
			await addInlineVariable(hurlVariablesProvider, filePath);
			break;
		case "Edit Inline Variable":
			await editInlineVariable(hurlVariablesProvider, filePath);
			break;
		case "Remove Inline Variable":
			await removeInlineVariable(hurlVariablesProvider, filePath);
			break;
	}
}

async function showInlineVariables(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getInlineVariablesBy(filePath);
	logger.info(`Inline variables for ${filePath}:`);
	for (const [key, value] of Object.entries(variables)) {
		logger.info(`${key}: ${value}`);
	}
	logger.show();
}

async function addInlineVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const name = await vscode.window.showInputBox({
		prompt: "Enter inline variable name",
	});
	if (name) {
		const value = await vscode.window.showInputBox({
			prompt: `Enter value for ${name}`,
		});
		if (value !== undefined) {
			hurlVariablesProvider.addInlineVariableBy(filePath, name, value);
			vscode.window.showInformationMessage(
				`Inline variable ${name} added successfully`,
			);
		}
	}
}

async function editInlineVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getInlineVariablesBy(filePath);
	const variableNames = Object.keys(variables);
	const name = await vscode.window.showQuickPick(variableNames, {
		placeHolder: "Select inline variable to edit",
	});
	if (name) {
		const currentValue = variables[name];
		const newValue = await vscode.window.showInputBox({
			prompt: `Enter new value for ${name}`,
			value: currentValue,
		});
		if (newValue !== undefined) {
			hurlVariablesProvider.addInlineVariableBy(filePath, name, newValue);
			vscode.window.showInformationMessage(
				`Inline variable ${name} updated successfully`,
			);
		}
	}
}

async function removeInlineVariable(
	hurlVariablesProvider: HurlVariablesProvider,
	filePath: string,
) {
	const variables = hurlVariablesProvider.getInlineVariablesBy(filePath);
	const variableNames = Object.keys(variables);
	const name = await vscode.window.showQuickPick(variableNames, {
		placeHolder: "Select inline variable to remove",
	});
	if (name) {
		hurlVariablesProvider.removeInlineVariableBy(filePath, name);
		vscode.window.showInformationMessage(
			`Inline variable ${name} removed successfully`,
		);
	}
}

export async function saveCapturedValues(
	hurlVariablesProvider: HurlVariablesProvider,
	captures: Record<string, string>,
): Promise<void> {
	if (config.captureToGlobalVariable) {
		for (const [key, value] of Object.entries(captures)) {
			hurlVariablesProvider.setGlobalVariable(key, value);
			logger.info(`Captured value set as global variable: ${key} = ${value}`);
		}
	}
}
