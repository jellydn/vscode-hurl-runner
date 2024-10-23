import * as fs from "node:fs/promises";
import * as vscode from "vscode";

import type { HurlVariablesProvider } from "./hurl-variables-provider";
import { logger } from "./utils";

class VariableItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly value: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contextValue?: string,
		public readonly children?: VariableItem[],
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}: ${this.value}`;
		this.description = this.value;
		this.contextValue = contextValue;
	}
}

export class HurlVariablesTreeProvider
	implements vscode.TreeDataProvider<VariableItem>
{
	private _onDidChangeTreeData: vscode.EventEmitter<
		VariableItem | undefined | null
	> = new vscode.EventEmitter<VariableItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<VariableItem | undefined | null> =
		this._onDidChangeTreeData.event;

	private envFile: string | undefined;

	constructor(private hurlVariablesProvider: HurlVariablesProvider) {}

	setEnvFile(envFile: string | undefined) {
		this.envFile = envFile;
		this.refresh();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: VariableItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: VariableItem): Promise<VariableItem[]> {
		if (element) {
			return element.children || [];
		}

		const rootItems: VariableItem[] = [];
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.languageId === "hurl") {
			const filePath = editor.document.uri.fsPath;
			const envVariables = this.hurlVariablesProvider.getVariablesBy(filePath);
			const inlineVariables =
				this.hurlVariablesProvider.getInlineVariablesBy(filePath);
			const globalVariables = this.hurlVariablesProvider.getGlobalVariables();

			if (this.envFile) {
				const envFileVariables = await this.loadEnvFileVariables(this.envFile);
				if (Object.keys(envFileVariables).length > 0) {
					const relativePath = vscode.workspace.asRelativePath(this.envFile);
					const envFileItems = Object.entries(envFileVariables).map(
						([key, value]) =>
							new VariableItem(
								key,
								value,
								vscode.TreeItemCollapsibleState.None,
								"envFileVariable",
							),
					);
					rootItems.push(
						new VariableItem(
							`.env File (${relativePath})`,
							"",
							vscode.TreeItemCollapsibleState.Expanded,
							"category",
							envFileItems,
						),
					);
				}
			}

			if (Object.keys(envVariables).length > 0) {
				const envItems = Object.entries(envVariables).map(
					([key, value]) =>
						new VariableItem(
							key,
							value,
							vscode.TreeItemCollapsibleState.None,
							"envVariable",
						),
				);
				rootItems.push(
					new VariableItem(
						"Environment Variables",
						"",
						vscode.TreeItemCollapsibleState.Expanded,
						"category",
						envItems,
					),
				);
			}

			if (Object.keys(inlineVariables).length > 0) {
				const inlineItems = Object.entries(inlineVariables).map(
					([key, value]) =>
						new VariableItem(
							key,
							value,
							vscode.TreeItemCollapsibleState.None,
							"inlineVariable",
						),
				);
				rootItems.push(
					new VariableItem(
						"Inline Variables",
						"",
						vscode.TreeItemCollapsibleState.Expanded,
						"category",
						inlineItems,
					),
				);
			}

			if (Object.keys(globalVariables).length > 0) {
				const globalItems = Object.entries(globalVariables).map(
					([key, value]) =>
						new VariableItem(
							key,
							value,
							vscode.TreeItemCollapsibleState.None,
							"globalVariable",
						),
				);
				rootItems.push(
					new VariableItem(
						"Captured Variables",
						"",
						vscode.TreeItemCollapsibleState.Expanded,
						"category",
						globalItems,
					),
				);
			}
		}
		return rootItems;
	}

	private async loadEnvFileVariables(
		envFile: string,
	): Promise<Record<string, string>> {
		try {
			const content = await fs.readFile(envFile, "utf-8");
			const variables: Record<string, string> = {};
			for (const line of content.split("\n")) {
				const trimmedLine = line.trim();
				if (trimmedLine && !trimmedLine.startsWith("#")) {
					const [key, ...valueParts] = trimmedLine.split("=");
					if (key && valueParts.length > 0) {
						variables[key.trim()] = valueParts.join("=").trim();
					}
				}
			}
			return variables;
		} catch (error) {
			logger.error(`Error loading ${envFile} file`, error);
			return {};
		}
	}
}
