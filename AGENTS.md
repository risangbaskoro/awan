# Awan: Another local-cloud sync plugin for Obsidian.

## Project overview

Awan is Obsidian plugin to sync files between local and S3 compatible bucket. The project aims to be an alternative to [Obsidian Sync](https://obsidian.md/sync).

The goal of this project is to be a plugin that can sync files (including dotfiles) in the Obsidian vault, using user provided S3 compatible credentials. In later development, WebDav also should be supported, but not until the S3 support is robust.

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Target features

The expected features for this project including:

- Cloud storage support:
	- Amazon S3 or S3-compatible (R2, B2, MinIO, etc)
	- WebDAV
- **Supports Obsidian Mobile**: Vaults can be synced across mobile and desktop devices with the cloud service as the "broker".
- **End-to-end encryption**: User can pick a password and set that password as the encryption key for the cloud storage. The files should be decrypted locally. The password should be using Obsidian's `SecretStorage`.
- **Scheduled auto-sync**: The sync feature can be scheduled to run per minute, every file save, or triggered manually using Command, Ribbon, or Status Bar.
- **Minimal Intrusive**: The plugin must have minimal to no intrusion. It should enable the user's to sync between devices. No need to manually pull and manually push the files.
- **Skip files and paths**: The plugin must be able to choose which files or paths to ignore by regex expressions.

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`
- Alternatively, run `npm run lint` for linting.

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- **Example file structure**:
  ```
  src/
    main.ts           # Plugin entry point, lifecycle management
    settings.ts       # Settings interface and defaults
    commands/         # Command implementations
      command1.ts
      command2.ts
    ui/              # UI components, modals, views
      modal.ts
      view.ts
    utils/           # Utility functions, helpers
      helpers.ts
      constants.ts
    types.ts         # TypeScript interfaces and types
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Sync Strategy

The default sync strategy is to prioritize the latest changes, regardless where the file changes comes from. The local database (whether that's from Obsidian's localstorage, indexedDB, or localforage) is used to track changes within the files.

The user should be able to choose the syncing strategy for the current vault.

For syncing using S3, use the official `aws-sdk` packages, including but not limited to: `client-s3`, `lib-storage`, `signature-v4-crt`, and `types`.

Use the following export plans as the reference:

```json
{
  "brain is an elastic storage.md": {
    "key": "brain is an elastic storage.md",
    "remote": {
      "key": "brain is an elastic storage.md",
      "keyRaw": "brain is an elastic storage.md",
      "mtimeSvr": 1769111346000,
      "mtimeCli": 1769111346000,
      "sizeRaw": 1615,
      "size": 1615,
      "etag": "\"ac2b26cf45db08b1114ee8ecc29a88a5\"",
      "synthesizedFolder": false,
      "keyEnc": "brain is an elastic storage.md",
      "sizeEnc": 1615,
      "mtimeCliFmt": "2026-01-23T02:49:06+07:00",
      "mtimeSvrFmt": "2026-01-23T02:49:06+07:00"
    },
    "prevSync": {
      "key": "brain is an elastic storage.md",
      "keyRaw": "brain is an elastic storage.md",
      "mtimeSvr": 1769111346000,
      "mtimeCli": 1769111341000,
      "sizeRaw": 1615,
      "size": 1615,
      "etag": "\"ac2b26cf45db08b1114ee8ecc29a88a5\"",
      "synthesizedFolder": false,
      "keyEnc": "brain is an elastic storage.md",
      "sizeEnc": 1615,
      "mtimeCliFmt": "2026-01-23T02:49:01+07:00",
      "mtimeSvrFmt": "2026-01-23T02:49:06+07:00"
    },
    "local": {
      "key": "brain is an elastic storage.md",
      "keyRaw": "brain is an elastic storage.md",
      "mtimeCli": 1769111356000,
      "mtimeSvr": 1769111356000,
      "size": 1614,
      "sizeRaw": 1614,
      "mtimeCliFmt": "2026-01-23T02:49:16+07:00",
      "mtimeSvrFmt": "2026-01-23T02:49:16+07:00",
      "keyEnc": "brain is an elastic storage.md",
      "sizeEnc": 1614
    },
    "decisionBranch": 10,
    "decision": "local_is_modified_then_push",
    "change": true
  },
  "/$@meta": {
    "key": "/$@meta",
    "sideNotes": {
      "version": "20240714 fs version",
      "generateTime": 1769111368972,
      "generateTimeFmt": "2026-01-23T02:49:28+07:00",
      "service": "s3",
      "concurrency": 5,
      "hasPassword": false,
      "syncConfigDir": true,
      "syncBookmarks": true,
      "syncUnderscoreItems": true,
      "skipSizeLargerThan": 10000000,
      "protectModifyPercentage": 90,
      "conflictAction": "keep_newer",
      "syncDirection": "bidirectional",
      "triggerSource": "auto_sync_on_save",
      "sizeof": 605072
    }
  }
}
```

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.
- Use Obsidian `SecretStorage` to handle secrets. See https://docs.obsidian.md/plugins/guides/secret-storage.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```ts
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```ts
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
