# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Builds use Electron 42.11.16, which blocks the compromised eMudhra (emSign) intermediate CA keys. Electron 41 receives no such fix.

### Changed

- Folder-access notifications stay alive for the app launch so asynchronous clicks and failures are handled. A macOS notification the system refuses to show is now logged, since Electron 42 reports it as an event rather than an error.

## [0.1.0] - 2026-10-12

### Added

- Initial public release.
- The Projects page: the number of sessions per tool, for Claude Code, Cursor, GitHub Copilot, Antigravity, Codex and Kiro, and under each tool the project folders those sessions ran in, with their stack tags. Choosing a project lists its sessions, and choosing a session shows its conversation, masked as the app stores it.
- The Harness page: every skill, command, rule, hook, plugin, subagent, prompt template and instruction file your coding agents load, with where it lives and which agents load it, and a read-only view of each file's text.
- The menu bar icon, whose menu shows the window, turns launch at login on or off, and quits.

[Unreleased]: https://github.com/tetriz-ai/agent-desk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tetriz-ai/agent-desk/releases/tag/v0.1.0
