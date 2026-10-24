# plugins-lab

This repository is a public Claude Code marketplace (`jansenlazaro/plugins-lab`). Everything committed here is public.

## Rules when adding or changing a plugin

- Each plugin lives in `plugins/<name>/` and has `.claude-plugin/plugin.json`. `<name>` uses lowercase letters, digits and hyphens, and matches the manifest's `name`.
- Every plugin must have an entry in `.claude-plugin/marketplace.json` (`name`, `source: "./plugins/<name>"`, `description`), and a row in the Plugins table in `README.md`.
- Layouts for skills, commands, agents, hooks and mods are in `plugins/README.md`.
- Before committing, run `claude plugin validate .` and `claude plugin validate plugins/<name>`, and `claude plugin test plugins/<name>` for a mod with tests.
- Bump `version` in a plugin's `plugin.json` when changing it.
- Never commit keys, tokens, `.env` files, internal URLs, or anyone's personal data. `IDEAS.md` is private and git-ignored.
