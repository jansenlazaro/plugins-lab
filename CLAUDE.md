# plugins-lab

This repository is a public Claude Code marketplace (`jansenlazaro/plugins-lab`). Everything committed here is public.

## Rules when adding or changing a plugin

- Each plugin lives in `plugins/<name>/` and has `.claude-plugin/plugin.json`. `<name>` uses lowercase letters, digits and hyphens, and matches the manifest's `name`.
- Every plugin must have an entry in `.claude-plugin/marketplace.json` (`name`, `source: "./plugins/<name>"`, `description`), and a row in the Plugins table in `README.md`.
- Layouts for skills, commands, agents, hooks and mods, and things to know when writing a mod, are in `plugins/README.md`. Read it before writing or changing a mod.
- A plugin with its own domain words keeps them in `plugins/<name>/GLOSSARY.md`, with a line in `GLOSSARY-MAP.md`. Use those words in code, docs and UI text.
- A mod's tests live in `plugins/<name>/tests/`. Add a test for each bug you fix.
- Before committing, run `claude plugin validate .` and `claude plugin validate plugins/<name>`, and `claude plugin test plugins/<name>` for a mod with tests.
- Bump `version` in a plugin's `plugin.json` when changing it.
- `claude plugin validate plugins/<name>` reports a missing LICENSE as a problem. That only matters for submitting to the official plugin directory, not for this marketplace.
- Never commit keys, tokens, `.env` files, internal URLs, or anyone's personal data. `IDEAS.md` is private and git-ignored.
