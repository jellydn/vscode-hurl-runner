# Contributing to VSCode Hurl Runner

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to VSCode Hurl Runner. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [dung@productsway.com](mailto:dung@productsway.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue list](https://github.com/jellydn/vscode-hurl-runner/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Explain why this enhancement would be useful
- Include code examples if applicable

### Pull Requests

- Fork the repo and create your branch from `main`
- If you've added code that should be tested, add tests
- Ensure the test suite passes
- Make sure your code lints
- Update the documentation accordingly

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Create a branch for your changes: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `pnpm test`
6. Push to your fork and submit a pull request

### Development Workflow

1. The project uses TypeScript + [Biome](https://github.com/biomejs/biome/)
2. Commit messages should follow [conventional commits](https://www.conventionalcommits.org/)

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Style Guide

- Use TypeScript's strict mode
- Use meaningful variable names
- Document public APIs using JSDoc comments

### Documentation Style Guide

- Use Markdown for documentation
- Keep language clear and concise
- Include code examples when relevant
- Update README.md if adding new features

## Additional Notes

### Issue and Pull Request Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed

## License

By contributing to VSCode Hurl Runner, you agree that your contributions will be licensed under its MIT License.
