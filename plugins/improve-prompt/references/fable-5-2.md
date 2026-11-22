# Claude Fable 5.2 (and Mythos 5.2)

Fable 5.2 thinks before almost every reply, can stop before long work is done, and follows ownership and caution wording closely. Source: [Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2). Apply only the rules that fit this prompt.

## Finishing the work
- For a long, multistep task, add: do not stop while work the person asked for is still owed. Work through ordinary obstacles (errors, timeouts, locked files, empty results, failing tools) by diagnosing them and trying another way. Leave deliberate blockers alone and say so. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#finish-the-whole-task))
- Keep a line that risky or destructive actions still need confirmation. With the line above it asks less often. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#finish-the-whole-task))
- When answering a stop, say exactly what to do ("yes, run the migration on staging"), not just "continue". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#approvals))
- Name the exact actions that need a check. A broad rule such as "sending messages to people outside this conversation needs approval" makes it hold back routine requests. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#approvals))

## Code ownership
- Say who owns the code. Add "you are the owner and long-term maintainer; the design is up to you" only when a restructure is wanted. It then consolidates duplicates, but also makes unrequested changes and many more tokens. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#say-who-owns-the-code))
- When the code belongs to the person and changes should be minimal, leave that sentence out and say to keep the change small and fit the existing structure. A "no drive-by refactors" rule does not cancel the ownership sentence. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#say-who-owns-the-code))

## Updates and reports
- For a person following along, ask for a one-line intent before the first tool call, short updates while it works, and a closing recap that stands on its own (what it found, what it did, what is next). ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#signal-intent))
- If the work runs unattended with nobody reading updates, do not ask for them. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#update-system-prompt-instructions))
- For a final report or handoff, ask for a reader with no context in mind: key points in the first sentences, plain words, short sentences, no terms invented during the work, flowing prose for connected ideas and bullets only for separate items. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#make-reports-easy-to-follow))

## Delegation and caution
- Do not tell it to delegate by default. Say when a subagent is worth its cost (parallel, independent work) and when it is not, and how to brief one. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#set-expectations-for-subagents))
- Remove caution carried over from old notes or earlier prompts that no longer applies, such as stale approval rules, and a token budget shown to the model. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#keep-caution-from-piling-up))
- Do not add "treat the earlier answer as done" lines unless the person wants that. They make it far less likely to point out its own earlier mistakes, so leave them out for long analyses and agentic work. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#review-instructions-written-for-earlier-models))
- Do not add "answer directly without deliberating" to make it think less. At medium effort and above it does not stop the thinking. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#review-instructions-written-for-earlier-models))
- Write "ask for approval before deleting files" rather than "never delete files". It treats "never" as absolute. List the routine steps it may take without asking, instead of "act more freely". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#keep-caution-from-piling-up))
- Do not set hard style limits such as "one idea per sentence, 20 words or fewer". It follows them closely and the prose turns choppy. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#review-instructions-written-for-earlier-models))
- Do not ask it to write out its reasoning in the reply. Ask for the result and a short explanation. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#safeguard-refusals))
