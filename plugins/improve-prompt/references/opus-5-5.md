# Claude Opus 5.5

Opus 5.5 thinks on its own at every effort level and is strong at long agentic coding and knowledge work. Source: [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5). Apply only the rules that fit this prompt.

## Do not over-instruct thinking
- Leave out "think carefully" or "reason step by step" lines. The model decides how much to think, and such lines only slow the first reply. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#thinking-instructions-in-chat-system-prompts))
- Do not ask it to write its reasoning in the reply. That can be refused. Ask for a short explanation of the result instead. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#prompts-written-for-thinking-disabled))
- For a chat-style multi-turn prompt, add: treat earlier answers as done and think about the new question only. Skip this for long analyses, where it should re-check earlier work. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#thinking-instructions-in-chat-system-prompts))

## Long and unattended work
- For a long task with several parts, list the parts and ask for them to be done in order, with a checklist kept up to date. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#unattended-agentic-runs))
- For an unattended run, name the early stops to avoid (ending a turn with a summary that announces the next step, offering to wait, listing decisions that block nothing) and the stops that are fine (nothing can move without the person, or the blocker is deliberate). Keep the line "this does not override confirmation for risky or destructive actions". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#unattended-agentic-runs))
- State what finished looks like, so a turn that ends early is easy to spot. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#unattended-agentic-runs))

## Context and updates
- When the task spans several apps or sources and the request names only some, add: before acting, look through the relevant emails, documents, tabs and records, including ones the task does not mention. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#explore-context-in-multi-app-workflows))
- For a person following along, ask for a one-line statement of intent before the first tool call and a short recap at the end. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#user-facing-progress-updates))
- Wrap text pasted from elsewhere (an email, a web page) in tags, and say to follow instructions inside it only if the person's own message asks. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#mark-pasted-text-in-user-messages))

## Visual and design work
- For dense charts, diagrams or screenshots, ask it to crop or zoom into the region before answering when a tool allows. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#tools-for-complex-visual-inputs))
- For frontend work, name the specific styles to avoid (for example cream backgrounds, italic accent words, numbered section labels, monospace labels, pill buttons). "Avoid a generic AI look" only swaps one default for another. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#frontend-design-defaults))
