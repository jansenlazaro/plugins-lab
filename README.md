# plugins-lab

A Claude Code marketplace: one place for my plugins, whether they're mods, skills, slash commands, agents or hooks.

## Install a plugin

At the prompt in Claude Code:

```
/plugin marketplace add jansenlazaro/plugins-lab
/plugin install <plugin>@plugins-lab
```

Or in one line:

```
/plugin install <plugin> --marketplace jansenlazaro/plugins-lab
```

When asked `Add marketplace?`, answer `y`, then pick a scope (User installs it for every project).

From a shell:

```
claude plugin install <plugin> --marketplace jansenlazaro/plugins-lab
```

In the desktop app: click **+** next to the prompt box, then **Plugins** → **Add marketplace** with `jansenlazaro/plugins-lab`, then **Add plugin**.

## Plugins

None yet. Each plugin lives in [`plugins/`](plugins/) and is listed in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).

| Plugin | What it does |
| --- | --- |
| _coming soon_ | |

## Add a plugin

1. Make a folder `plugins/<name>/` with a manifest at `plugins/<name>/.claude-plugin/plugin.json`:
   ```json
   { "name": "<name>", "version": "0.1.0", "description": "<one line>" }
   ```
2. Add what the plugin provides (see [`plugins/README.md`](plugins/README.md) for the layout).
3. List it in `.claude-plugin/marketplace.json`:
   ```json
   { "name": "<name>", "source": "./plugins/<name>", "description": "<one line>" }
   ```
4. Check it: `claude plugin validate plugins/<name>`, and run `claude plugin validate .` at the repository's top level.
5. Commit and push. Anyone who has added the marketplace gets it with `/plugin marketplace update plugins-lab`.
