# FamixTypeScriptVSIX

A VSCode extension that generates [Famix](https://modularmoose.org/) models from TypeScript projects and keeps them automatically updated as the code evolves. Built on top of [ts2famix](https://github.com/fuhrmanator/FamixTypeScriptImporter) and the Language Server Protocol (LSP).

## Requirements

- Node.js v20 or v22
- VSCode 1.87+
- [ts2famix](https://github.com/fuhrmanator/FamixTypeScriptImporter) (for local development)

---

## Installation from the Marketplace

Search for **ts2famix** in the VSCode Extensions panel, or install directly:

```
ext install Leo-maure.ts2famix-vscode-extension
```

---

## Local Development Setup

There are two ways to work on this extension locally, depending on whether you also need to modify `ts2famix` itself.

---

### Option 1 — Test the extension only (no changes to ts2famix)

Use this when you just want to run the extension and its tests without touching the `ts2famix` library.

**Step 1 — Install dependencies:**

```
cd client && npm install
cd ../server && npm install
cd ..
```

**Step 2 — Build the server:**

```
cd server && node esbuild.mjs
cd ..
```

**Step 3 — Run the smoke tests (rebuilds client automatically):**

```
npm run test:smoke
```

This runs the 7 smoke tests using VSCode 1.124.2 in headless mode. All 7 should pass.

**Step 4 — Debug the extension in VSCode:**

Open `test-isolated` in VSCode and press `F5`. This launches a new VSCode window with the extension loaded. Open a TypeScript project and run `ts2famix: Generate Model` from the Command Palette (`Cmd+Shift+P`).

---

### Option 2 — Full local development with npm link (modifying ts2famix)

Use this when you need to modify `ts2famix` and test the changes in the extension without publishing to npm.

This requires having both repositories cloned locally:

- `FamixTypeScriptImporter/` — the ts2famix library
- `FamixTypeScriptVSIX/` (this repo) — the VSCode extension

**Step 1 — Build and link ts2famix:**

```
cd ../FamixTypeScriptImporter
npm run build
npm link
```

**Step 2 — Link ts2famix in the extension server and rebuild:**

```
cd ../FamixTypeScriptVSIX/server
npm link ts2famix
node esbuild.mjs
```

Or run the convenience script from the root of this repo:

```
npm run build:local
```

This automates Steps 1 and 2 in a single command.

**Step 3 — Run the smoke tests:**

```
npm run test:smoke
```

**Step 4 — Debug the extension in VSCode:**

Press `F5` in VSCode to launch the extension in debug mode.

> **Note:** Every time you modify `ts2famix`, you need to re-run `npm run build:local` to rebuild the library and update the bundle.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run test:smoke` | Rebuild client bundle and run the 7 smoke tests |
| `npm run build:local` | Full npm link workflow: build ts2famix, link it, rebuild server bundle |
| `npm run build:client` | Build the client only (production) |
| `npm run build:server` | Build the server only (production) |

---

## Project Structure

```
FamixTypeScriptVSIX/
├── client/                  # VSCode extension client
│   ├── src/
│   │   ├── extension.ts     # Extension entry point
│   │   ├── commands.ts      # Command handlers
│   │   └── test/            # Smoke tests
│   └── .vscode-test.mjs     # Test configuration (VSCode version pinned to 1.124.2)
├── server/                  # LSP server
│   ├── src/
│   │   ├── server.ts        # LSP server entry point
│   │   ├── model/           # Famix model management
│   │   └── eventHandlers/   # File change handlers
│   └── esbuild.mjs          # Server bundler (ts2famix is external)
├── .vscodeignore            # Files excluded from the .vsix package
└── .github/workflows/
    ├── ci.yml               # CI: tests on Ubuntu, macOS, Windows
    └── publish.yml          # Publish to VSCode Marketplace on tag push
```

---

## Publishing a New Version

1. Bump the version:

```
npm version patch   # or minor / major
```

2. Push the tag:

```
git push origin main --tags
```

The GitHub Actions `publish.yml` workflow will automatically publish to the Marketplace when a tag is pushed. Requires `VSCE_PAT` to be set as a GitHub secret.

---

## Architecture

The extension follows the standard [Language Server Extension](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) pattern:

- **Client** — monitors file changes in the TypeScript project and sends requests to the server via LSP.
- **Server** — uses `ts2famix` to generate or incrementally update the Famix model.

`ts2famix` is marked as `external` in the esbuild configuration, meaning it is not bundled into `server.js` but resolved at runtime from `server/node_modules/`. This is necessary because bundling `ts2famix` would accidentally include its CLI entry point, which executes immediately on `require` and crashes the server.

See the [blog post](https://fuhrmanator.github.io/) for a detailed explanation of the design decisions.
