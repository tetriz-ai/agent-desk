# Reference

## What the app reads

| Source | Read by | What the app keeps |
|---|---|---|
| Session files of the six tools in your home folder | [local-session-extractor](../packages/local-session-extractor/) | every session's conversation, masked, with its folder, plus each tool's login email, plan, account and organization ids and device id, unmasked, in `sessions.db` |
| Agent files in your home folder and in each project folder | [harness-discovery](../packages/harness-discovery/) | the last scan in `harness-inventory.json` |
| Marker files in each project folder | the app | stack tags, in memory |

Both files live in `~/Library/Application Support/Agent Desk/`, readable by your user only. The app's log is in its `logs` folder there, with tokens, email addresses and your home folder masked.

## What the Projects page counts

- **Counts** come from `sessions.db`, one row per session. Subagent, plugin and hook runs are not counted.
- **Projects** are the folders `sessions.db` records: the repo a session ran in, or its own folder outside a repo.
- **Stack tags** come from marker files in the project folder and its subfolders, such as `package.json`, `go.mod`, `Cargo.toml` and `pyproject.toml`.

## What a project's sessions show

- **Sessions** are the rows of `sessions.db` a Projects row counts, 50 at a time. The most recently active come first, by each session's newest message, or by when its tool last changed it when no message has a time.
- **A branch** shows when the session recorded one: the last it worked on, as the tool wrote it.
- **A conversation** is the masked messages `sessions.db` keeps for the session, 100 at a time. A message shows at most its first 64 K characters.
- **An Antigravity session** read while Antigravity was not running holds only its title and summary.
- **Never shown:** the login details `sessions.db` keeps beside each session, listed under [What it reads and sends](before-you-rely-on-it.md#what-it-reads-and-sends), and the tools' own session ids. A branch name shows as the tool wrote it, your user name included. Pinned by `sessions.test.ts` and `acceptance.test.mjs` ("Projects").

## What the Harness page lists

| Tab | Types |
|---|---|
| Context / Rules | rules, `CLAUDE.md`, `AGENTS.md` |
| Templates | prompt templates |
| Skills, Subagents, Commands, Plugins, Hooks | one type each |

- **Source** is `User` for a file in your home folder. For a repo file it is the repo's name and `committed` or `local`.
- **Agents** shows every agent that loads the file as a two-letter badge, with its name on hover. CC is Claude Code, CO Codex, CU Cursor and KI Kiro. `AGENTS.md` is loaded by Claude Code, Codex and Cursor.
- **Extra badges:** a Claude Code skill in your home folder or in a plugin also gets a badge for each tool whose user-level skills folder holds a skill of the same name, such as Copilot, Windsurf or Cline. Codex, Copilot and Continue share the CO badge, so hover over it to see which one it is.
- **Not scanned, so this inventory is partial** names each tool or folder the scan could not read. **Skipped while scanning** lists each file it skipped, and the [see-what-the-scan-skipped](../examples/see-what-the-scan-skipped/) example shows one.
- **A failed scan** leaves the last good scan on the page, with the failure and its time above the list.

## Folder access

macOS protects your Desktop, Documents and Downloads folders, and asks before the app reads inside one. A new build may ask again, because macOS may not carry the earlier answer over to it. What the app still reads there before you allow it, and what it skips, is under [What it reads and sends](before-you-rely-on-it.md#what-it-reads-and-sends).

## The file viewer

- It opens only files the last scan listed, as plain text. It refuses a file in your Desktop, Documents or Downloads folder until you allow that folder, even when a symlink leads there. `assetContent.test.ts` and `launch.test.ts` check this.
- It refuses a file over 512 KB, a binary file and anything that is not a regular file. Hooks written inline in `settings.json` show their command, not the settings file.

## Versioning and compatibility

The app is at v0.1.0 and follows semantic versioning. A breaking change is one that removes a page, changes the format of `sessions.db` or `harness-inventory.json`, or drops a tool it reads. Before 1.0, the pages, the files the app keeps and the tools it reads may change in a minor release.

Node 24 builds and packages the app, and the unit tests also run on Node 26. The app itself runs on the Node inside Electron 42.

## Tests

| Command | What it checks |
|---|---|
| `pnpm test` | the unit tests under Electron's Node, from the worker to the launch defaults |
| `pnpm build && pnpm test:acceptance` | the built app on a sample home, compared with the command-line output of local-session-extractor and harness-discovery, with every read, write and connection traced |
| `scripts/run-examples.sh` | the examples' output |

Run all three locally on macOS. The retained CI workflows are disabled.
