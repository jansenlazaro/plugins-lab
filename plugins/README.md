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

Check any plugin with `claude plugin validate plugins/<name>`, and test a mod with `claude plugin test plugins/<name>`.
