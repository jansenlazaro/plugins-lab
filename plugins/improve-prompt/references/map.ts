// The Reference map: which Model reference to load for which Session model.
//
// Only the Model reference of the model in use is read, with GENERAL_DOC, so
// a run loads a few small files instead of every guide.
//
// To support a model: add its doc next to this file (one condensed rule per
// line, each with a link to its source section) and one entry below.

export type ModelRef = {
  /** Stable name for the model, also the doc's file name without `.md`. */
  key: string
  /** How the Tweak list and the pane name the model. */
  name: string
  /** Full model ids, without a date, a `[1m]` suffix or a provider prefix. */
  ids: string[]
  /** Short names `/model` accepts that stand for this model. */
  aliases: string[]
  /** The doc in this folder. */
  doc: string
}

/** Rules that hold for every model in MODELS. Read only with a model's doc. */
export const GENERAL_DOC = 'general.md'

/** The current generation. Models not listed here are not tuned for. */
export const MODELS: readonly ModelRef[] = [
  {
    key: 'fable-5-2',
    name: 'Claude Fable 5.2',
    ids: ['claude-fable-5-2', 'claude-mythos-5-2'],
    aliases: ['fable'],
    doc: 'fable-5-2.md',
  },
  {
    key: 'opus-5-5',
    name: 'Claude Opus 5.5',
    ids: ['claude-opus-5-5'],
    aliases: ['opus'],
    doc: 'opus-5-5.md',
  },
  {
    key: 'sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    ids: ['claude-sonnet-5-5'],
    aliases: ['sonnet'],
    doc: 'sonnet-5-5.md',
  },
  {
    key: 'haiku-5-5',
    name: 'Claude Haiku 5.5',
    ids: ['claude-haiku-5-5'],
    aliases: ['haiku'],
    doc: 'haiku-5-5.md',
  },
]
