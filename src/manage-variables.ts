import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

import type { HurlVariablesProvider } from "./hurl-variables-provider";
import { logger } from "./utils";

export async function chooseEnvFile(): Promise<string | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace folder open");
		return;
	}

	const envFiles = await vscode.workspace.findFiles(
		"**/.env*",
		"**/node_modules/**",
	);

	const items = [
		{
			label: "Create New .env File",
			description: "Create a new .env file in the workspace",
			isCreateNew: true,
		},
		...envFiles.map((file) => ({
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
	filePath: string,
) {
	const variables = await loadEnvVariables(filePath);
	hurlVariablesProvider.setVariablesForFile(filePath, variables);

	const action = await vscode.window.showQuickPick(
		[
			{
				label: "View Variables",
				description: "Show all variables in the file",
			},
			{ label: "Add Variable", description: "Add a new variable" },
			{ label: "Edit Variable", description: "Modify an existing variable" },
			{ label: "Remove Variable", description: "Delete a variable" },
			{ label: "Done", description: "Use the variables in the current file" },
		],
		{ placeHolder: "Choose an action" },
	);

	switch (action?.label) {
		case "View Variables":
			await showFileVariables(hurlVariablesProvider, filePath);
			break;
		case "Add Variable":
			await addVariable(hurlVariablesProvider, filePath);
			break;
		case "Edit Variable":
			await editVariable(hurlVariablesProvider, filePath);
			break;
		case "Remove Variable":
			await removeVariable(hurlVariablesProvider, filePath);
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
			await showFileVariables(hurlVariablesProvider, filePath);
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
			await showFileVariables(hurlVariablesProvider, filePath);
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
		await showFileVariables(hurlVariablesProvider, filePath);
	}
}
