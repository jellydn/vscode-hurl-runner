<p align="center">
  <img src="res/icon.png" alt="VSCode Hurl Runner Logo" width="200"/>
</p>

<h1 align="center">Welcome to vscode-hurl-runner 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.2-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/vscode-%5E1.92.0-blue.svg" />
  <a href="https://github.com/jellydn/vscode-hurl-runner#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/jellydn/vscode-hurl-runner/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/jellydn/vscode-hurl-runner/blob/main/LICENSE.md" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/jellydn/vscode-hurl-runner" />
  </a>
</p>

> Streamline API development in VSCode. Run Hurl requests, manage variables, and view responses directly in your editor.

### 🏠 [Homepage](https://github.com/jellydn/vscode-hurl-runner#readme)

## Prerequisites

- vscode ^1.92.0
- [Hurl - Run and Test HTTP Requests](https://hurl.dev/)

## Features

- Run Hurl requests directly from VSCode
- Execute single entries or entire Hurl files
- Manage environment variables for Hurl requests
- Support for inline variables
- View detailed HTTP responses in a formatted webview
- Syntax highlighting for Hurl files
- Integration with VSCode's status bar for execution feedback

### Commands

<!-- commands -->

| Command                                    | Title                         |
| ------------------------------------------ | ----------------------------- |
| `vscode-hurl-runner.runHurl`               | Hurl: Run at entry            |
| `vscode-hurl-runner.runHurlFile`           | Hurl: Run File                |
| `vscode-hurl-runner.runHurlToEnd`          | Hurl: Run to End              |
| `vscode-hurl-runner.manageInlineVariables` | Hurl: Manage Inline Variables |
| `vscode-hurl-runner.selectEnvFile`         | Hurl: Select Environment File |

<!-- commands -->

### Configs

<!-- configs -->

| Key                                       | Description                                                                                                                                                                         | Type     | Default     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `vscode-hurl-runner.hurlPath`             | Path to the Hurl executable                                                                                                                                                         | `string` | `"hurl"`    |
| `vscode-hurl-runner.environmentVariables` | Environment variables to be used when running Hurl files                                                                                                                            | `object` | `{}`        |
| `vscode-hurl-runner.verboseMode`          | Set the verbosity level for Hurl execution. 'verbose' provides basic information about requests and responses. 'very-verbose' includes detailed information, including timing data. | `string` | `"verbose"` |

<!-- configs -->

### Keybindings

- `ctrl+alt+h` (Windows/Linux) or `cmd+alt+h` (Mac): Run Hurl entry
- `ctrl+alt+f` (Windows/Linux) or `cmd+alt+f` (Mac): Run Hurl file
- `ctrl+alt+shift+v` (Windows/Linux) or `cmd+alt+shift+v` (Mac): Manage variables

## Demo

- Running a single Hurl entry
  [![Run at entry](https://i.gyazo.com/cbad7080f4c93697439d54301faf2da2.gif)](https://gyazo.com/cbad7080f4c93697439d54301faf2da2)

- Running from entry to the end of file
  [![Run to the end](https://i.gyazo.com/329844ae8a37e6d24a529e9d29edc146.gif)](https://gyazo.com/329844ae8a37e6d24a529e9d29edc146)

- Running an entire Hurl file
  [![Run a file](https://i.gyazo.com/5228daf93d1d18be73d90ca6a9eda5ef.gif)](https://gyazo.com/5228daf93d1d18be73d90ca6a9eda5ef)

- Manage variables
  [![Manage variable](https://i.gyazo.com/1e8be3690eefef9c408277912561cf6f.gif)](https://gyazo.com/1e8be3690eefef9c408277912561cf6f)

- Select env file
  [![Select env file](https://i.gyazo.com/83ca9f1514cb3c91a7b6305740c7957f.gif)](https://gyazo.com/83ca9f1514cb3c91a7b6305740c7957f)

## Related Projects

### For Neovim Users

If you prefer Neovim, check out my companion plugin:

- [hurl.nvim](https://github.com/jellydn/hurl.nvim): A Neovim plugin for running Hurl requests directly within Neovim.

This plugin offers similar functionality to this VSCode extension, tailored for the Neovim environment.

### Other Tools in the Ecosystem

- [pfeiferj/vscode-hurl](https://github.com/pfeiferj/vscode-hurl)
- [Verseth/vscode-hurl-runner](https://github.com/Verseth/vscode-hurl-runner)

Whether you're using VSCode, Neovim, or the command line, there's a tool to help you work efficiently with Hurl files.

# Author

👤 **Dung Huynh Duc <dung@productsway.com>**

- Website: https://productsway.com/
- Github: [@jellydn](https://github.com/jellydn)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/jellydn/vscode-hurl-runner/issues). You can also take a look at the [contributing guide](https://github.com/jellydn/vscode-hurl-runner/blob/master/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2024 [Dung Huynh Duc <dung@productsway.com>](https://github.com/jellydn).<br />
This project is [MIT](https://github.com/jellydn/vscode-hurl-runner/blob/master/LICENSE) licensed.

[![kofi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/dunghd)
[![paypal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/dunghd)
[![buymeacoffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dunghd)
