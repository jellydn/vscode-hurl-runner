import * as vscode from 'vscode';
import type { HurlVariablesProvider } from './hurl-variables-provider';

class VariableItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly value: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}: ${this.value}`;
		this.description = this.value;
	}
}

export class HurlVariablesTreeProvider implements vscode.TreeDataProvider<VariableItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<VariableItem | undefined | null> = new vscode.EventEmitter<VariableItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<VariableItem | undefined | null> = this._onDidChangeTreeData.event;

	constructor(private hurlVariablesProvider: HurlVariablesProvider) { }

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: VariableItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: VariableItem): Thenable<VariableItem[]> {
		if (element) {
			return Promise.resolve([]);
		}

		const items: VariableItem[] = [];
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.languageId === 'hurl') {
			const filePath = editor.document.uri.fsPath;
			const envVariables = this.hurlVariablesProvider.getVariablesBy(filePath);
			const inlineVariables = this.hurlVariablesProvider.getInlineVariablesBy(filePath);

			if (Object.keys(envVariables).length > 0) {
				items.push(new VariableItem('Environment Variables', '', vscode.TreeItemCollapsibleState.Expanded));
				for (const [key, value] of Object.entries(envVariables)) {
					items.push(new VariableItem(key, value, vscode.TreeItemCollapsibleState.None));
				}
			}

			if (Object.keys(inlineVariables).length > 0) {
				items.push(new VariableItem('Inline Variables', '', vscode.TreeItemCollapsibleState.Expanded));
				for (const [key, value] of Object.entries(inlineVariables)) {
					items.push(new VariableItem(key, value, vscode.TreeItemCollapsibleState.None));
				}
			}
		}
		return Promise.resolve(items);
	}
}
