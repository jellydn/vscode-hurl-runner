import { describe, it, expect, beforeEach } from 'vitest';
import { HurlVariablesProvider } from '../src/hurl-variables-provider';

describe('HurlVariablesProvider', () => {
	let provider: HurlVariablesProvider;

	beforeEach(() => {
		provider = new HurlVariablesProvider();
	});

	describe('Environment Variables', () => {
		it('should add and get variables by file path', () => {
			const filePath = '/path/to/file.hurl';
			provider.addVariableBy(filePath, 'key1', 'value1');
			provider.addVariableBy(filePath, 'key2', 'value2');

			const variables = provider.getVariablesBy(filePath);
			expect(variables).toEqual({ key1: 'value1', key2: 'value2' });
		});

		it('should remove a variable by file path', () => {
			const filePath = '/path/to/file.hurl';
			provider.addVariableBy(filePath, 'key1', 'value1');
			provider.addVariableBy(filePath, 'key2', 'value2');
			provider.removeVariableBy(filePath, 'key1');

			const variables = provider.getVariablesBy(filePath);
			expect(variables).toEqual({ key2: 'value2' });
		});

		it('should set variables for a file', () => {
			const filePath = '/path/to/file.hurl';
			const variables = { key1: 'value1', key2: 'value2' };
			provider.setVariablesForFile(filePath, variables);

			const retrievedVariables = provider.getVariablesBy(filePath);
			expect(retrievedVariables).toEqual(variables);
		});
	});

	describe('Inline Variables', () => {
		it('should add and get inline variables by file path', () => {
			const filePath = '/path/to/file.hurl';
			provider.addInlineVariableBy(filePath, 'inlineKey1', 'inlineValue1');
			provider.addInlineVariableBy(filePath, 'inlineKey2', 'inlineValue2');

			const variables = provider.getInlineVariablesBy(filePath);
			expect(variables).toEqual({ inlineKey1: 'inlineValue1', inlineKey2: 'inlineValue2' });
		});

		it('should remove an inline variable by file path', () => {
			const filePath = '/path/to/file.hurl';
			provider.addInlineVariableBy(filePath, 'inlineKey1', 'inlineValue1');
			provider.addInlineVariableBy(filePath, 'inlineKey2', 'inlineValue2');
			provider.removeInlineVariableBy(filePath, 'inlineKey1');

			const variables = provider.getInlineVariablesBy(filePath);
			expect(variables).toEqual({ inlineKey2: 'inlineValue2' });
		});

		it('should set inline variables for a file', () => {
			const filePath = '/path/to/file.hurl';
			const variables = { inlineKey1: 'inlineValue1', inlineKey2: 'inlineValue2' };
			provider.setInlineVariablesForFile(filePath, variables);

			const retrievedVariables = provider.getInlineVariablesBy(filePath);
			expect(retrievedVariables).toEqual(variables);
		});
	});

	describe('All Variables', () => {
		it('should get all variables (environment and inline) by file path', () => {
			const filePath = '/path/to/file.hurl';
			provider.addVariableBy(filePath, 'envKey', 'envValue');
			provider.addInlineVariableBy(filePath, 'inlineKey', 'inlineValue');

			const allVariables = provider.getAllVariablesBy(filePath);
			expect(allVariables).toEqual({ envKey: 'envValue', inlineKey: 'inlineValue' });
		});

		it('should prioritize inline variables over environment variables', () => {
			const filePath = '/path/to/file.hurl';
			provider.addVariableBy(filePath, 'key', 'envValue');
			provider.addInlineVariableBy(filePath, 'key', 'inlineValue');

			const allVariables = provider.getAllVariablesBy(filePath);
			expect(allVariables).toEqual({ key: 'inlineValue' });
		});
	});
});
