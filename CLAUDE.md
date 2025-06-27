# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `pnpm run build` - Compiles TypeScript using tsup
- **Development**: `pnpm run dev` - Builds in watch mode for development
- **Lint**: `pnpm run lint` - Runs Biome linter
- **Test**: `pnpm run test` - Runs Vitest test suite
- **Type Check**: `pnpm run typecheck` - Runs TypeScript compiler for type checking
- **Package**: `pnpm run pack` - Creates VSIX package
- **Update Metadata**: `pnpm run update` - Regenerates extension metadata

## Architecture Overview

This is a VSCode extension for running Hurl HTTP test files with the following key architecture:

### Main Entry Point
- `src/index.ts` - Extension activation using reactive-vscode framework
- Uses `defineExtension()` pattern for lifecycle management
- Registers all commands, providers, and UI components

### Core Components

**Command System**: All commands are registered using `useCommand()` from reactive-vscode:
- `runHurl` - Execute entry at cursor position
- `runHurlFile` - Execute entire file
- `runHurlToEnd` - Execute from current entry to end
- `runHurlSelection` - Execute selected text
- `runHurlFromBegin` - Execute from beginning to current entry
- `rerunLastCommand` - Re-execute last command
- `viewLastResponse` - View cached response

**Variable Management System**:
- `HurlVariablesProvider` - Manages three types of variables:
  - Environment file variables (per-file)
  - Inline variables (per-file)  
  - Global variables (captured from responses)
- `HurlVariablesTreeProvider` - VSCode tree view for variables
- Variables are merged in priority order: env < global < inline

**Output Processing**:
- `parseHurlOutput()` in `hurl-parser.ts` - Parses Hurl's verbose output into structured data
- Extracts request/response details, timings, captures, and curl commands
- `showResultInWebView()` - Renders formatted HTML output with syntax highlighting

**Code Lens Integration**:
- `HurlCodeLensProvider` - Adds inline action buttons to .hurl files
- Provides quick access to run commands directly in editor

### Key Technical Details

**Package Manager**: Uses pnpm with workspace configuration
**Build System**: tsup for TypeScript compilation targeting VSCode extension format
**Linting**: Biome for code formatting and linting
**Testing**: Vitest for unit tests
**UI Framework**: Native VSCode webviews with PrismJS syntax highlighting

**Extension Configuration**: Defined in package.json contributes section:
- Commands with keybindings (Ctrl+Alt+H for run, etc.)
- Language support for .hurl files
- Settings for Hurl executable path and verbosity
- Tree view container in activity bar

**State Management**:
- Environment file mapping per Hurl file
- Last command info for rerun functionality
- Last response caching for view without re-execution
- Status bar integration showing current environment

The extension integrates deeply with VSCode's extension API while using reactive-vscode for simplified state management and command registration.