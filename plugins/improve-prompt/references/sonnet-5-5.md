# Claude Sonnet 5.5

Sonnet 5.5 is a fast, capable all-rounder. It can check in early at low effort and adds unrequested extras when coding. Source: [Prompting Claude Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5). Apply only the rules that fit this prompt.

## Scope and follow-through
- For a multipart coding task, add: keep working until everything asked is done, and stop to ask only when it cannot go on without the person or before a risky step. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#steer-initiative-and-scope))
- Say what is out of scope. It tends to add tests, docs and small files that nobody asked for. Add: when the requested work is done and checked, stop and report, and mention any extra that would help instead of doing it. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#steer-initiative-and-scope))
- Keep your own rules for risky or irreversible actions. A "keep going" line does not replace them. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#steer-initiative-and-scope))

## Verification
- For code that can be run, built or type-checked, ask for a real check before it reports done: the tests, the type-checker, the build or the changed command. A syntax-only check does not count. If no real check can run, say which one was skipped and why. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#verification-on-coding-tasks))

## Answers that need working out
- When the answer is a JSON result of a few steps of working out (totals, rules, rankings), end the prompt with: think the problem through before you answer. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#reasoning-tasks-with-json-output))
- Do not tell it not to think. That makes it more likely to leak internal tags into the visible reply. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#running-without-up-front-thinking))

## Facts and tools
- Remove wording like "only use tools when strictly necessary" or "minimize tool calls". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#tool-use-in-chat-and-knowledge-work))
- When details may have changed (what is allowed, required, charged), ask it to check with the search tool even when it feels sure, and to gather current sources for reports and comparisons. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#tool-use-in-chat-and-knowledge-work))
- Remove instructions like "hold all findings for the final response". Ask instead for a line on what it is about to do before the first tool call, and a short recap at the end. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#user-facing-progress-updates))
- For dense charts, diagrams or screenshots, ask it to crop or zoom first when a tool allows. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5#tools-for-complex-visual-inputs))
