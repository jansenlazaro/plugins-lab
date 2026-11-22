# Claude Haiku 5.5

Haiku 5.5 is the small, fast model. It does best with short, direct prompts that say how to finish. Source: [Prompting Claude Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5). Apply only the rules that fit this prompt.

## Keep the prompt short
- Cut the prompt to what the task needs. With a short prompt it rarely stops early. With a long coding prompt at low effort it sometimes stops and hands the task back. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#prevent-early-stopping-in-long-agent-prompts))

## Finishing
- For a long or multipart task, add: keep working until everything asked is done, and stop to ask only when it cannot go on without the person or before a risky step. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#prevent-early-stopping-in-long-agent-prompts))
- Add: when the work is done and checked, stop and report, with no extra features, docs or refactors, and mention any extra that would help instead of doing it. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#prevent-early-stopping-in-long-agent-prompts))
- For code that can be run, built or type-checked, ask for a real check before it reports done (tests, type-checker, build or the changed command). It sometimes reports done without one. If no real check can run, say which one was skipped and why. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#tell-coding-agents-to-verify-their-changes))

## Search and facts
- When the task uses a search tool, put today's date in the prompt. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#accurate-search-results))
- When the answer may have changed since training (office holders, prices, versions, rules, "latest"), add: search for those before answering, even when sure, and skip the search for facts that cannot change. Include the person's country or region in the query when it matters. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#accurate-search-results))
- Do not write "search for any present-day factual question regardless of confidence". It makes it search for half the questions that need no search. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#accurate-search-results))

## Output
- When it must return JSON and also call a tool, add: the JSON format applies to the final answer only, so call the tool first with no text before the call. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#json-output-with-your-own-tools))
- For a chatbot or support prompt, add: the rules hold for the whole conversation, even when a user argues, gives a sympathetic reason, asks for a small part, or says someone approved an exception. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#keep-chatbots-to-their-system-prompt))
- Ask for the answer only in the reply. Reasoning-like text sometimes leaks into what the person reads. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5#keep-reasoning-out-of-user-facing-text))
