# improve-prompt

Turns a rough prompt or a bare goal into a better prompt by asking the person a few clarifying questions first.

## Language

**Seed**:
The text the person gives `/improve-prompt`: a rough prompt or just a goal. It may be empty.
_Avoid_: Draft, input, original prompt

**Draft**:
The text in the person's prompt box. Not the Seed, even when they hold the same words.
_Avoid_: Prompt, input

**Clarifying question**:
One question the mod asks about the Seed, always offered with Options.
_Avoid_: Prompt, question card

**Option**:
One answer the person can pick for a Clarifying question. They can also type their own, or skip the question.
_Avoid_: Choice, chip

**Recommended answer**:
The Option the mod proposes for a Clarifying question. It is always listed first, marked as recommended, and starts out picked until the person picks another, types their own, or skips.
_Avoid_: Default, suggestion

**Round**:
A batch of up to three Clarifying questions asked together. Later Rounds build on earlier answers.
_Avoid_: Batch, page

**Step**:
One of the four stages the pane shows a run moving through: Your prompt, Questions, Rewrite, Review. Several Rounds can pass within the Questions step.
_Avoid_: Phase, page

**Refined prompt**:
The prompt the mod writes from the Seed and the answers, offered to the person to use.
_Avoid_: Improved prompt, output, result

**Addition**:
One line in the "What I added" list, naming something the Refined prompt says that the Seed did not.
_Avoid_: Change, diff

**Change note**:
What the person types under the Refined prompt to have it rewritten. The code calls it the Redo note.
_Avoid_: Feedback, comment

**Run**:
One use of `/improve-prompt`, from the command to the pane closing. Closing the pane ends the Run, and a model reply that arrives after that is dropped.
_Avoid_: Session, attempt

**Session context**:
The current conversation, which the mod can read to ask sharper questions. The person can turn it off.
_Avoid_: History, transcript
