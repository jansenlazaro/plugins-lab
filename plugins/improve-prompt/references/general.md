# General rules for every current Claude model

Rules for writing the Refined prompt. Apply only the ones that fit this prompt. Source: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).

## Say it plainly
- Write as if briefing a new colleague who has no context: state the goal, who the result is for, and what done looks like. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct))
- Ask outright for the extra effort wanted ("go beyond the basics", "include as many relevant features as you can"). The models do what is asked and little more. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct))
- Give the reason behind a constraint, not just the constraint ("this is read aloud, so avoid ellipses"). ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#add-context-to-improve-performance))
- Say what to do instead of what to avoid: "write smooth flowing prose", not "no markdown". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#control-the-format-of-responses))
- Match the prompt's own style to the output wanted. A prompt full of bullets gets bullets back. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#control-the-format-of-responses))

## Action versus advice
- Use a direct verb for action ("change this function to be faster"). "Can you suggest changes" gets suggestions only. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#tool-usage))
- Do not shout. Replace "CRITICAL: you MUST…" with a plain "Use X when…". Emphatic wording makes current models overdo it. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#tool-usage))

## Structure
- Wrap pasted material, documents and examples in descriptive XML tags (`<document>`, `<example>`), and refer to them by tag name. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags))
- Put long documents first and the ask last. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting))
- Give 3 to 5 varied examples inside `<examples>` when the output has a format to copy. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively))
- Set a role in one sentence when the work needs a point of view. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#give-claude-a-role))

## Coding and agentic work
- Ask for a general solution that works for all valid inputs, not one that only passes the given tests. Say to report a wrong or infeasible test rather than work around it. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#avoid-focusing-on-passing-tests-and-hard-coding))
- Say how much to build: the minimum the task needs, with no extra abstractions, files or defensive code. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#overeagerness))
- Ask to read the named files before answering or changing anything, and never to guess about code it has not opened. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#minimizing-hallucinations-in-agentic-coding))
- Ask for scratch and helper files to be removed at the end. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#reduce-file-creation-in-agentic-coding))
- Name the actions to confirm first (deleting, force-pushing, anything others will see) and let local, reversible work go ahead. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#balancing-autonomy-and-safety))
- For a long task, ask for steady progress in small steps, with state kept in files and git. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-horizon-reasoning-and-state-tracking))
- Tell it to reach for subagents only for parallel or independent work, and to do simple tasks directly. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#subagent-orchestration))

## Research and reasoning
- For research, give the success criteria and ask it to check claims across several sources. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#research-and-information-gathering))
- Prefer "think carefully about this" over a hand-written step list. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#leverage-thinking-and-interleaved-thinking-capabilities))
- Ask it to verify its answer against stated criteria before it finishes. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#leverage-thinking-and-interleaved-thinking-capabilities))

## Output
- Ask for a short summary at the end of tool-heavy work, because current models skip it unless asked. ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#communication-style-and-verbosity))
- For frontend work, name the look wanted (fonts, palette, motion) rather than "make it nice". ([source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#frontend-design))
