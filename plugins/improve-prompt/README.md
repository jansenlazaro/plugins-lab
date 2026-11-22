# improve-prompt

A Claude Code mod that turns a rough prompt, or just a goal, into a better prompt by asking you a few quick questions first.

```
/improve-prompt add dark mode to the settings page
```

A pane opens beside the chat and walks through four steps: Your prompt, Questions, Rewrite, Review.

Claude asks up to three clarifying questions at a time, each with a few options to pick from. The first option is the one Claude recommends.

- Pick an option, or choose **Other (type it)** to write your own answer.
- **Skip** leaves a question out of the prompt. **change** reopens an answered one.
- **Continue** sends your answers. Claude asks again only about what's still open, for three rounds at most. A line above the questions shows where you are, such as "Round 2 of up to 3". After the third round the prompt is written.
- **Skip the rest, write it now** stops early and writes the prompt.

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

The tests in `tests/` cover the flow on the terminal and desktop surfaces, and the parsing of Claude's replies.

## Session context

By default the questions and the refined prompt draw on the current conversation, so Claude knows what you're working on. Those calls reuse the conversation on your session's model. Turn it off for one run with the toggle in the pane, or for every run with the plugin's **Use session context** setting in `/config`. With context off, or before the conversation has started, the mod uses Sonnet and sees only your text and answers.

## Install

```
/plugin install improve-prompt --marketplace jansenlazaro/plugins-lab
```

The pane works in the terminal, the desktop app and VS Code. The mobile app can't draw text fields yet.
