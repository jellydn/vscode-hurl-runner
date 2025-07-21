# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development

- `pnpm build` - Build the extension using tsup
- `pnpm dev` - Build in watch mode for development
- `pnpm typecheck` - Run TypeScript type checking without emitting files
- `pnpm lint` - Run Biome linter for code quality checks
- `pnpm test` - Run tests using Vitest

### Testing

- `pnpm test` - Run all tests with Vitest
- Tests are located in the `test/` directory
- Individual test files can be run with `pnpm vitest <test-file>`

### Extension Packaging

- `pnpm pack` - Package the extension for distribution
- `pnpm publish` - Publish the extension (requires proper permissions)
- `pnpm release` - Bump version and publish

## Architecture Overview

This is a VSCode extension that enables running Hurl HTTP requests directly from the editor. The extension is built using TypeScript and the reactive-vscode framework.

### Core Components

**Main Extension (`src/index.ts`)**

- Entry point using `defineExtension()` from reactive-vscode
- Manages webview panels for displaying HTTP responses
- Handles command registration and execution
- Maintains state for last commands and responses
- Manages environment file mappings and variable providers

**Hurl Parser (`src/hurl-parser.ts`)**

- Parses Hurl CLI output into structured data
- Extracts request/response details, timings, and captures
- Formats timing data from microseconds to readable units
- Handles both verbose and very-verbose output modes

**Entry Detection (`src/hurl-entry.ts`)**

- Identifies HTTP verbs and their line positions in Hurl files
- Supports extensive HTTP methods including WebDAV verbs
- Determines which Hurl entry corresponds to cursor position

**Variable Management (`src/hurl-variables-provider.ts`, `src/manage-variables.ts`)**

- Manages inline variables and environment files
- Provides variable tree view in the sidebar
- Handles global variables from captured responses

**Utils (`src/utils.ts`)**

- Executes Hurl commands via child process
- Handles environment files and variable passing
- Manages status bar updates during execution

### Key Features

1. **Multiple Execution Modes**: Run single entries, entire files, selections, or ranges
2. **Variable System**: Support for environment files and inline variables
3. **Response Viewer**: Rich webview with syntax highlighting using PrismJS
4. **Code Lens Integration**: Inline action buttons in the editor
5. **Tree View**: Sidebar panel showing variables and their values
6. **Capture Support**: Automatically saves captured values as global variables

### Configuration

The extension uses VSCode configuration with these key settings:

- `vscode-hurl-runner.hurlPath` - Path to Hurl executable (default: "hurl")
- `vscode-hurl-runner.verboseMode` - Verbosity level ("verbose" or "very-verbose")
- `vscode-hurl-runner.captureToGlobalVariable` - Auto-save captures (default: true)

### File Structure

- `src/` - TypeScript source code
- `src/generated/` - Auto-generated metadata from package.json
- `syntaxes/` - Hurl language grammar for syntax highlighting
- `res/` - Extension icons and resources
- `test/` - Test files using Vitest
- `example/` - Sample Hurl files for testing

### Hurl Tips and Best Practices

**Dynamic Data Generation (Hurl 6.0.0+)**

- Use `{{newUuid}}` to generate UUID v4 random strings (e.g., `"email": "{{newUuid}}@test.com"`)
- Use `{{newDate}}` to generate RFC 3339 UTC date strings at current time (e.g., `date: {{newDate}}`)
- These functions eliminate the need for external data generation and variable injection

**Variable Management**

- Environment files can be selected per Hurl file for different testing contexts
- Captured values from responses automatically become global variables when enabled
- Inline variables can be managed through the sidebar tree view

### Development Notes

- Uses Biome for linting and formatting instead of ESLint/Prettier
- Built with tsup for fast TypeScript compilation
- Uses reactive-vscode framework for state management
- Webview responses use PrismJS with Tomorrow Night theme
- Extension activates only when Hurl files are opened
