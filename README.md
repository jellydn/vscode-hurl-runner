<h1 align="center">Welcome to vscode-hurl-runner 👋</h1>
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
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

[![IT Man - Streamline API Development with VSCode Hurl Runner: A Complete Guide](https://i.ytimg.com/vi/fbDu7fusFsw/hqdefault.jpg)](https://www.youtube.com/watch?v=fbDu7fusFsw)

### 🏠 [Homepage](https://github.com/jellydn/vscode-hurl-runner#readme)

## Prerequisites

- vscode ^1.93.0
- [Hurl - Run and Test HTTP Requests](https://hurl.dev/)

## Features

- 🚀 Run Hurl requests directly from VSCode
  - ▶️ Execute single entries
  - ⏭️ Run from a specific entry to the end of the file
  - 📁 Run entire Hurl files
  - ✂️ Run selected text
  - 🔝 Run from the beginning to the current entry
- 🔧 Variable management
  - 🌍 Support for environment files
  - 📝 Inline variable management
  - 🌐 Global variable support (based on captured variables)
- 📊 Capture values from responses and use them in subsequent requests
- 👁️ View detailed HTTP responses in a formatted webview ([PrismJs with Tomorrow Night Theme](https://prismjs.com/))
- 🎨 Syntax highlighting for Hurl files
- 📊 Integration with VSCode's status bar for execution feedback
- 🔍 Code lens support for quick actions
- 🔁 Rerun last command functionality
- 📜 View last response without re-running the request

### Commands

<!-- commands -->

| Command                                    | Title                                  |
| ------------------------------------------ | -------------------------------------- |
| `vscode-hurl-runner.runHurl`               | Hurl Runner: Run at entry              |
| `vscode-hurl-runner.runHurlFile`           | Hurl Runner: Run File                  |
| `vscode-hurl-runner.runHurlToEnd`          | Hurl Runner: Run to End                |
| `vscode-hurl-runner.manageInlineVariables` | Hurl Runner: Manage Inline Variables   |
| `vscode-hurl-runner.selectEnvFile`         | Hurl Runner: Select Environment File   |
| `vscode-hurl-runner.runHurlSelection`      | Hurl Runner: Run Selected Text         |
| `vscode-hurl-runner.rerunLastCommand`      | Hurl Runner: Rerun Last Command        |
| `vscode-hurl-runner.runHurlFromBegin`      | Hurl Runner: Run from Begin to Current |
| `vscode-hurl-runner.viewLastResponse`      | Hurl Runner: View Last Response        |
| `vscode-hurl-runner.removeGlobalVariable`  | Remove Global Variable                 |

<!-- commands -->

### Configs

<!-- configs -->

| Key                                          | Description                                                                                                                                                                         | Type      | Default     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------- |
| `vscode-hurl-runner.hurlPath`                | Path to the Hurl executable                                                                                                                                                         | `string`  | `"hurl"`    |
| `vscode-hurl-runner.verboseMode`             | Set the verbosity level for Hurl execution. 'verbose' provides basic information about requests and responses. 'very-verbose' includes detailed information, including timing data. | `string`  | `"verbose"` |
| `vscode-hurl-runner.captureToGlobalVariable` | When enabled, captured values will be set as global variables.                                                                                                                      | `boolean` | `true`      |

<!-- configs -->

### Keybindings

- `ctrl+alt+h` (Windows/Linux) or `cmd+alt+h` (Mac): Run Hurl entry
- `ctrl+alt+f` (Windows/Linux) or `cmd+alt+f` (Mac): Run Hurl file
- `ctrl+alt+shift+v` (Windows/Linux) or `cmd+alt+shift+v` (Mac): Manage variables

### Demo

#### Running a Single Hurl Entry

[![Run at entry](https://i.gyazo.com/3ceef5b45f68df5bcabe00e7bd39ed27.gif)](https://gyazo.com/3ceef5b45f68df5bcabe00e7bd39ed27)
_Demonstrates running a single Hurl entry directly from VSCode._

#### Running from Entry to the End of File

[![Run to the end](https://i.gyazo.com/294af3f42fca76eb751e8bce2c432d10.gif)](https://gyazo.com/294af3f42fca76eb751e8bce2c432d10)
_Shows how to run Hurl requests from a specific entry to the end of the file._

#### Running an Entire Hurl File

[![Run a file](https://i.gyazo.com/d9188c14d370748f9bc495d0071a130b.gif)](https://gyazo.com/d9188c14d370748f9bc495d0071a130b)
_Illustrates running an entire Hurl file in one go._

#### Managing Variables

[![Manage variable](https://i.gyazo.com/49e3688ff47f5ba32a5094b428a89a60.gif)](https://gyazo.com/49e3688ff47f5ba32a5094b428a89a60)
_Demonstrates how to manage inline variables for Hurl requests._

#### Selecting Environment File

[![Select env file](https://i.gyazo.com/84e3e3ff85a4b6cc254af6398d33d6d2.gif)](https://gyazo.com/84e3e3ff85a4b6cc254af6398d33d6d2)
_Shows the process of selecting an environment file for Hurl requests._

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

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://productsway.com/"><img src="https://avatars.githubusercontent.com/u/870029?v=4?s=100" width="100px;" alt="Dung Duc Huynh (Kaka)"/><br /><sub><b>Dung Duc Huynh (Kaka)</b></sub></a><br /><a href="https://github.com/jellydn/vscode-hurl-runner/commits?author=jellydn" title="Code">💻</a> <a href="https://github.com/jellydn/vscode-hurl-runner/commits?author=jellydn" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/xleshx"><img src="https://avatars.githubusercontent.com/u/4798483?v=4?s=100" width="100px;" alt="Alexey"/><br /><sub><b>Alexey</b></sub></a><br /><a href="https://github.com/jellydn/vscode-hurl-runner/commits?author=xleshx" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
