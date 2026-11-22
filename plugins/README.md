# Plugin layout

Each plugin is one folder here. A plugin can hold any mix of the parts below; only the manifest is required.

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json          # required: { "name", "version", "description" }
├── skills/<skill>/SKILL.md  # skills: instructions Claude loads when relevant
├── commands/<cmd>.md        # slash commands: /<cmd>
├── agents/<agent>.md        # subagents Claude can hand work to
├── hooks/hooks.json         # hooks (shell commands on events), or a mod (below)
└── .mcp.json                # MCP servers the plugin brings
```

## Mods

A mod changes Claude Code's own interface or behaviour, for example a pane beside the chat, a band above the prompt, a status line, a toast, a slash command, or a hook on tool calls or prompts. It is a plugin whose `hooks/hooks.json` points at a TypeScript module:

```
plugins/<name>/
├── .claude-plugin/plugin.json
├── hooks/hooks.json         # { "modules": ["./register.tsx"] }
├── hooks/register.tsx       # export const register: Register = (on, options) => { ... }
└── types/index.d.ts         # only if the mod keeps values in $.state
```

Check any plugin with `claude plugin validate plugins/<name>`, and test a mod with `claude plugin test plugins/<name>`. A mod's tests live in `plugins/<name>/tests/` as `*.test.ts` or `*.test.tsx`.

### Things to know when writing a mod

- A mod's own hook does not run for a `$` call the mod makes itself. For example, its `ui.close` hook fires when the person presses Esc, but not when the mod calls `$.ui.close`. Do the clean-up at the call as well.
- `update($, atom, fn)` resolves to the value it wrote, so there is no need to `read` again afterwards.
- Change an atom's `shape` tag whenever the stored value's fields change. A value written by an earlier version is then treated as absent.
- Work out a value that follows from others where it is used, rather than storing a copy in state. For example, a default answer can be read from the question when nothing was picked. A stored copy needs a flag to keep it in step, and adding one changes the stored fields, which needs a new `shape` tag and drops saved values.
- A model call can come back after its pane was closed or a new run started. Tag each run with an id that never repeats, even after the state is cleared, and drop replies whose id no longer matches.
- Use the test kit's `mock.clock(on).settle()` to let pending work finish. Timers such as `setTimeout` don't type-check in a mod.

## Glossaries

Each plugin keeps the words of its own domain in `plugins/<name>/GLOSSARY.md`. [`GLOSSARY-MAP.md`](../GLOSSARY-MAP.md) at the root lists each glossary.
