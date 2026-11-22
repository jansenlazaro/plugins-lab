# improve-prompt

A Claude Code mod that turns a rough prompt, or just a goal, into a better prompt by asking you a few quick questions first.

```
/improve-prompt add dark mode to the settings page
```

A pane opens beside the chat and walks through four steps: Your prompt, Questions, Rewrite, Review.

Claude asks up to three clarifying questions at a time, each with a few options to pick from. The first option is the one Claude recommends: it is marked **recommended** and starts out picked (●), so you only need to touch the questions where you want something else.

- Pick an option, or choose **Other (type it)** to write your own answer.
- **Skip** leaves a question out of the prompt. **change** reopens an answered one, with the recommended option picked again.
- **Continue** sends your answers. Claude asks again only about what's still open, for three rounds at most. A line above the questions shows where you are, such as "Round 2 of up to 3". After the third round the prompt is written.
- **Write it now** stops early and writes the prompt. A question you left as it was uses its recommended option.

The Review step shows your prompt beside the refined one, the word counts, and a list of what was added:

- **Run it** sends the refined prompt straight away.
- **Edit** puts it in the prompt box, replacing what you've typed, so you can change it and press Enter yourself.
- **Copy** puts it on the clipboard.
- **Change** rewrites it from a note on what should be different.

Run `/improve-prompt` with no text and the pane first asks what you want Claude to do. Esc or **Cancel** closes the pane and ends the run. A reply Claude was still writing is dropped.

## Develop

```
claude plugin validate plugins/improve-prompt
claude plugin test plugins/improve-prompt
```

The tests in `tests/` cover the flow on the terminal and desktop surfaces, the parsing of Claude's replies, finding the session's model and loading its Model reference, and the list of tweaks.

## Tuned for your model

The mod reads your session's model each time it writes or rewrites the prompt. For the current models, Claude Fable 5.2 (and Mythos 5.2), Opus 5.5, Sonnet 5.5 and Haiku 5.5, it loads that model's Model reference, plus a shared general one, and writes the prompt the way Anthropic's [prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) advises for that model. The Review step then lists each tweak it made under **Tuned for**, with the rule behind it.

Any other model, or a Model reference that can't be read, gets the plain prompt, with no warning and no list. Under `opusplan` the mod tunes for Opus when the last prompt was sent in plan mode, and for Sonnet otherwise.

Only the docs for your model are read. The questions are never tuned, only the written prompt. The docs are in `references/`, each rule linked to its source section, and `references/map.ts` says which doc goes with which model. To add a model, add its doc and one line to the map.

## Session context

By default the questions and the refined prompt draw on the current conversation, so Claude knows what you're working on. Those calls reuse the conversation on your session's model. Turn it off for one run with the toggle in the pane, or for every run with the plugin's **Use session context** setting in `/config`. With context off, or before the conversation has started, the mod uses Opus at low effort and sees only your text and answers.

## Install

```
/plugin install improve-prompt --marketplace jansenlazaro/plugins-lab
```

The pane works in the terminal, the desktop app and VS Code. The mobile app can't draw text fields yet.
