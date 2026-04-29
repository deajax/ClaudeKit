[中文](./README.md) | English

# ClaudeKit

> Built-in terminal. Switch and start working — your Claude Code desktop workbench.

![](/images/ScreenShot_2026-04-29_080137_521.png)

## What It Is

ClaudeKit is a **desktop workbench for Claude Code**. What sets it apart from standalone switcher tools is the built-in multi-tab terminal — provider switching and Claude Code launching happen in one place, without ever leaving the app.

## How Is It Different?

Most Claude Code switcher tools do one thing: inject environment variables. You pick a provider, they set the env vars, and then you have to open your own terminal and type `claude`.

ClaudeKit goes further: **we don't just switch — we give you a place to work.**

| | Standalone Switchers | ClaudeKit |
|---|---|---|
| One-click provider switch | ✅ | ✅ |
| Built-in terminal, switch & start | ❌ Must switch to external terminal | ✅ Launch Claude right in-app |
| Multi-tab parallel work | ❌ | ✅ Claude + dev server + tests in parallel |
| Env variable isolation | ❌ Global, risk of conflicts | ✅ Process-level injection via node-pty |
| Visual config management | Partial | ✅ Full GUI config panel |
| Setup wizard | ❌ | ✅ 5-step onboarding, install to launch |
| Balance check | Partial | ✅ DeepSeek balance in status bar |
| One-click login-free setup | ❌ | ✅ Auto-configure, skip Claude Code login |

## How It Works

Claude Code reads the following environment variables to determine which model provider and model to use:

| Environment Variable | Purpose |
|---|---|
| `ANTHROPIC_BASE_URL` | Model provider API endpoint |
| `ANTHROPIC_AUTH_TOKEN` | API authentication token |
| `ANTHROPIC_MODEL` | Default model |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override Opus model |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override Sonnet model |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override Haiku model |

ClaudeKit **injects environment variables when creating terminal processes via node-pty**, rather than writing directly to `settings.json`. This approach offers:

1. **Clean isolation** — environment variables only take effect within terminal sessions created by ClaudeKit
2. **Conflict avoidance** — the `env` field in settings.json has higher priority than shell environment variables; having both can cause mutual overrides
3. **Instant effect** — simply restart the terminal after switching providers, no manual file editing needed

ClaudeKit also supports one-click Claude Code login-free setup (setting `hasCompletedOnboarding` in `~/.claude.json`), smoothing the first-time experience.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  macOS / Windows                     │
├──────────────────────────────────────────────────────┤
│              Electron Main Process                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │  node-pty │  │  fs-extra │  │sudo-prompt│         │
│  │ (TTY proc) │  │ (file ops) │  │ (elevate) │         │
│  └───────────┘  └───────────┘  └───────────┘         │
│        │               │               │             │
│        └───────────────┼───────────────┘             │
│                        │ IPC Bridge                  │
├────────────────────────┼─────────────────────────────┤
│                        ▼                             │
│            Electron Preload (contextBridge)          │
├────────────────────────┼─────────────────────────────┤
│                        ▼                             │
│                Renderer Process (Vue 3)              │
│  ┌──────────────────────────────────────────────┐    │
│  │  App.vue                                     │    │
│  │  ┌──────┬──────┬──────────────────┐          │    │
│  │  │ Tab1 │ Tab2 │  [+ New Tab]     │          │    │
│  │  ├──────┴──────┴──────────────────┤          │    │
│  │  │ Provider ▼ │ Apply │ Tasks     │          │    │
│  │  ├────────────────────────────────┤          │    │
│  │  │     TerminalTab (xterm.js)     │          │    │
│  │  │                                │          │    │
│  │  ├────────────────────────────────┤          │    │
│  │  │ claude 2.x.x         v0.1.0   │          │    │
│  │  └───────────────────────────────────────────┘    │
│  └───────────────────────────────────────────────────┘
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ xterm.js │  │  Pinia   │  │  Ant Design Vue  │    │
│  │(terminal) │  │ (state)  │  │   (UI library)   │    │
│  └──────────┘  └──────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop Framework | Electron 33+ | Cross-platform desktop app |
| Build Tool | electron-vite 3.x | Vite + Electron best practices |
| Frontend | Vue 3 + TypeScript | Composition API |
| UI Library | Ant Design Vue 4.x | Enterprise Vue components |
| Icon Library | Remix Icons | SVG icons |
| CSS | Tailwind CSS 4 + Less | Utility-first approach |
| Terminal Emulator | xterm.js 5.x | Same renderer as VS Code |
| Terminal Process | node-pty 1.x | Real TTY processes |
| State Management | Pinia 2.x | Official Vue 3 state library |
| Data Persistence | JSON files | `~/.ClaudeKit/` directory |
| Privilege Elevation | sudo-prompt 9.x | Cross-platform sudo |

### Project Structure

```
ClaudeKit/
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point, window creation
│   ├── preload.ts               # contextBridge API exposure
│   └── ipc/                     # IPC handlers
│       ├── db.ts                # JSON database read/write
│       ├── terminal.ts          # node-pty terminal management
│       ├── env.ts               # Environment variable operations
│       ├── config.ts            # Config file read/write
│       ├── provider.ts          # Provider management
│       └── task.ts              # Task management
├── src/                         # Renderer process (Vue 3)
│   ├── main.ts                  # Entry point
│   ├── App.vue                  # Root layout
│   ├── components/              # Core components
│   │   ├── Toolbar.vue          # Toolbar
│   │   └── TerminalTab.vue      # Terminal tab
│   ├── views/                   # Feature panels
│   │   ├── SetupWizard.vue      # First-run wizard
│   │   ├── ProviderConfig.vue   # Provider configuration
│   │   ├── Settings.vue         # App settings
│   │   ├── EnvManager.vue       # Environment variable manager
│   │   ├── HelpDocs.vue         # Help documentation
│   │   ├── TaskDrawer.vue       # Task drawer
│   │   └── About.vue            # About dialog
│   ├── stores/                  # Pinia state
│   │   ├── providers.ts         # Provider state
│   │   ├── terminal.ts          # Multi-tab terminal state
│   │   └── settings.ts          # App settings state
│   ├── lib/                     # Utilities
│   │   ├── db.ts                # Database access wrapper
│   │   └── utils.ts             # General utilities
│   └── help.md                  # Help doc source
├── shared/                      # Shared types & constants
│   ├── types.ts
│   └── constants.ts
├── resources/                   # Static assets
├── package.json
└── electron.vite.config.ts      # Build configuration
```

### Data Persistence

No traditional database is used. All data is stored as JSON files under `~/.ClaudeKit/`:

| File | Purpose |
|---|---|
| `providers.json` | Provider config (name, URL, API key, models, etc.) |
| `tasks.json` | Quick tasks (commands, working directory, etc.) |
| `settings.json` | App settings (theme, font, shell type, etc.) |
| `terminal.json` | Terminal tab state |
| `env.json` | Environment variable management |
| `profiles.json` | Quick-switch configuration profiles |

## Features

- **Multi-tab Terminal** — xterm.js + node-pty based, independent sessions per tab with persistence
- **Provider Quick Switch** — dropdown selector for provider and model, one-click apply
- **4 Built-in Providers** — Alibaba Bailian, DeepSeek, OpenRouter, SiliconFlow, ready out of the box
- **Task Runner** — preset commands (npm dev/build/lint/test), full CRUD support for custom tasks
- **Environment Variable Manager** — code editor mode on macOS / table editor mode on Windows
- **One-Click Login-Free Setup** — auto-configure `~/.claude.json` to skip Claude Code login wizard
- **First-Run Wizard** — 5-step guide (environment check → install Claude → configure provider → login-free → done)
- **DeepSeek Balance Query** — manual refresh, displayed in the status bar
- **Version Check** — GitHub Releases API integration for update detection
- **Dark/Light Theme** — theme switching with smooth transitions

## Installation & Build

### Prerequisites

- Node.js 18+
- npm 9+
- Claude Code CLI (optional, can be installed via the setup wizard)

### Development

```bash
# Clone the repository
git clone https://github.com/deajax/claudekit.git
cd claudekit

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Build Distributables

```bash
# Build production version
npm run build

# Package into installable app (macOS .dmg / Windows .exe)
# Handled by electron-builder
npx electron-builder
```

Build output is located in the `out/` directory.

### Data Directory

User data is stored in `~/.ClaudeKit/`. Uninstalling the app does not automatically remove this directory. Delete it manually if you want to clean up.

## Usage

### Switching Model Providers

1. Select a provider from the toolbar dropdown
2. Select a model from the secondary dropdown
3. Click the **Apply** button
4. The terminal restarts automatically with the new configuration

### Starting Claude Code

1. Make sure a provider is selected and applied
2. Click the **▶ Claude** button inside the terminal tab
3. Claude Code starts in the terminal; the button changes to ⏹ Stop

### Running Tasks

1. Click the **Tasks** button
2. Select a task from the list
3. The task runs in a new tab

### First-Run Wizard

ClaudeKit automatically launches the setup wizard on first launch:

1. **Environment Check** — auto-detects Shell, Node.js, npm
2. **Install Claude Code** — one-click install if not present
3. **Configure Provider** — select a provider and enter your API key
4. **Login-Free Setup** — one-click skip Claude Code login
5. **Done** — enter the main interface

You can re-trigger the wizard later via **Settings → Run Setup Wizard**.

### Configuring Providers

API keys are obtained from each provider's platform:

- **Alibaba Bailian** — Obtain from Alibaba Cloud Bailian console
- **DeepSeek** — Obtain from DeepSeek platform, supports balance query
- **OpenRouter** — Obtain from OpenRouter platform; requires additional `ANTHROPIC_API_KEY=""`
- **SiliconFlow** — Obtain from SiliconFlow platform

## FAQ

### Authentication Failed

API key is not set or has expired. Check and re-enter the correct key.

### Model Not Found

The current provider does not support this model. Verify the model ID is correct.

### Configuration Conflict

Both settings.json and shell environment variables have conflicting values. It's recommended to use only ClaudeKit's environment variable injection and avoid manually editing the `env` field in settings.json.

### Claude Code Not Found

Run `npm install -g @anthropic-ai/claude-code` to install, or use the one-click install in the setup wizard.

## Feedback & Contributing

- [GitHub Issues](https://github.com/deajax/claudekit/issues)
- [Repository](https://github.com/deajax/claudekit)

## License

MIT
