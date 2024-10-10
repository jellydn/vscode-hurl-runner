export class HurlVariablesProvider {
	private variables: Map<string, Map<string, string>> = new Map();

	public getVariablesBy(filePath: string): Record<string, string> {
		return Object.fromEntries(this.variables.get(filePath) || new Map());
	}

	public addVariableBy(filePath: string, name: string, value: string): void {
		const fileVariables = this.variables.get(filePath) || new Map();
		fileVariables.set(name, value);
		this.variables.set(filePath, fileVariables);
	}

	public removeVariableBy(filePath: string, name: string): void {
		const fileVariables = this.variables.get(filePath);
		if (fileVariables) {
			fileVariables.delete(name);
		}
	}

	public setVariablesForFile(filePath: string, variables: Record<string, string>): void {
		this.variables.set(filePath, new Map(Object.entries(variables)));
	}
}