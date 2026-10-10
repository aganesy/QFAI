# Documentation Clarity

The writing standard for every AI coding agent in this repository. It covers
pull requests, issues, source-code comments, Markdown files, and the reports
and replies an agent writes.

Write for a reader who knows neither the background of the change nor the
habits of this team. Keep only what that reader can follow.

The clauses describe patterns of structure and meaning, not word lists. They
hold in any language: the examples are English, and in another language the
same pattern is rewritten in that language's own words.

## Scope

| Surface                     | When it applies               |
| --------------------------- | ----------------------------- |
| Pull request title and body | On create and on update       |
| Issue title and body        | On create and on update       |
| Comments in source code     | Within the diff of the change |
| Markdown files              | Within the diff of the change |
| Reports and replies         | When written; §§ 3 to 8 apply |

Leave everything outside the diff alone. Reformatting unrelated files is a
separate change.

## 1. No local identifiers

Never write these into source code or Markdown files:

- issue and pull-request numbers (`#123`, `GH-123`)
- ticket, review or thread identifiers
- names and abbreviations that only this project or team understands

When a reader needs the background, write the background itself in ordinary
words instead of pointing at a number.

### Spec-tree IDs

An ID the project's own spec tree defines (a business flow, story, acceptance
criterion, example, business rule, contract or decision) names a document the
reader can open in the repository. It is not a local identifier where that
document is the audience or the target:

- a document inside the spec tree;
- a comment or test annotation in code or tests that points at the contract or
  example the code carries out.

It is one wherever the reader has no access to the tree: a setup guide, a
README or any other document written for operators, and every file the project
ships (`distributed-surface.md`). Describe the rule in words there.

### Names the reader sees

A name the reader meets in the product is not one that only this project
understands. These may appear in a document written for that reader:

- a screen label or button name, exactly as the product shows it;
- an item name in a sheet or form the document tells the reader to fill in;
- a product term the reader meets on screen.

Where the reader cannot already know a term, define it once at its first use.
Use one spelling throughout.

Pull request and issue bodies are outside this clause. Numbers and links belong
there, and in commit messages and the changelog.

## 2. No account of how the work went

What happened while the change was being designed or written stays out of the
result:

- "started as X, changed to Y"
- "adjusted after review"
- "temporary until Z lands"

State the current behaviour and the reason it is that way. The history is
already in the git log and the pull request; do not write it twice.

## 3. Settle the message before writing

Before the first sentence, answer three questions: who reads this, what they
will do with it, and what the one thing is that they must take away. If the
last cannot be said in one sentence, material is missing. Gather it before
writing, and do not hide the gap in vague wording.

- Conclusion first. The title or the opening says the result. No preamble.
- One job per paragraph, stated in its opening sentence. A connective stays
  only where it names the relation between its two neighbours.
- Argue in one direction and conclude once. Do not end on a concession or a
  recap.
- A heading names the concrete subject or question. A bare label such as
  "Overview" or "Details" says nothing and is cut, except a heading that a
  schema or template fixes.
- Depth follows importance: room where a decision depends on it, one line
  elsewhere. Even depth everywhere shows nothing was chosen.
- Do not give three sentences or paragraphs in a row the same shape.
- End with the decision or next action the text leads to, when there is one.
  A short document needs no summary section.

## 4. Cut

- Delete anything self-evident.
- Merge repeated statements into one.
- Shorten wordy phrasing.

The test: if deleting a sentence leaves the reader no worse off, delete it.

### Patterns that add length and no information

| Pattern                 | Shape                                                | Instead                                       |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Announcement            | "The key point is", "as follows", "three reasons"    | Say the point, or give the list               |
| Recap                   | A closing paragraph that repeats the body            | Delete it, or say what follows                |
| Empty intensifier       | "Very important", "crucial", "comprehensive"         | A number, a condition, or nothing             |
| Verb with no act        | "Dive into", "tackle head-on", "leverage"            | The concrete act                              |
| Self-answered question  | A question asked only so the next sentence answers   | State the answer                              |
| Padding connective      | "Furthermore" and "moreover" with no relation behind | Delete, or name the relation                  |
| Set filled to three     | Three items because three feels complete             | List what exists                              |
| Effect for its own sake | A one-line paragraph or dramatic closer for effect   | Keep only at a real turning point             |
| Decoration              | Emoji, rule lines, ornamental dashes                 | Delete, except a line the repository requires |

## 5. Plain language

- Use ordinary vocabulary. Avoid coined terms and in-group phrasing.
- State the point directly, not through a metaphor or a flourish. Write "a
  parameter worth varying", not "a dial worth turning". A metaphor carries
  associations the writer did not choose, and the reader has to translate it
  back.
- One claim per sentence. Keep sentences short.
- Break lines so no line is hard to scan.
- Name who acts. Software does not know, want or decide: say what the program
  does, or who chose. Where the reader needs to know who performed an act, do
  not leave that out.
- Test a figurative verb by reading it literally. If the reader pictures a
  physical act (carry, break, dissolve, land), it is either literally true or
  replaced by the plain verb.
- Use concrete nouns. Name the file, the number, the date or the version
  instead of "some", "many", "various", "the tool" or "the system".
- One word per concept, defined before first use, with the function before the
  name. Use the field's standard term, and do not stretch jargon into a
  metaphor.
- Set a negated claim against the real one only to correct a belief the reader
  holds or a mistake already made ("not A but B"). Used for rhythm, it denies
  a claim nobody made.

## 6. Say how sure you are, and on what basis

- Mark a claim the reader would otherwise take as verified: say whether it is
  a fact, an inference or an opinion. A fact names its source: a file, a
  command and its output, a link.
- Hedge only a real uncertainty, and say what is unconfirmed and how to confirm
  it. A stack of hedges ("may possibly tend to") is deleted.
- A causal claim carries a one-sentence mechanism. An event with several causes
  is not reduced to one, and an example must support the whole claim, not part
  of it.
- Never turn "under investigation" into a result, a plan into finished work, or
  program behaviour into somebody's decision.
- A rewrite for clarity adds no condition, cause, actor
  or number, and drops or weakens no constraint, warning or mandatory step.

## 7. Make it readable at a glance

- Parallel items become a bullet list.
- Three or more paired values become a table.
- Ordered steps become a numbered list.
- A chain of cause and effect stays in prose. A list drops the "because" between items.
- Bold marks the one thing a skimmer must not miss, once or twice per section.
  Bold on many phrases makes none stand out.
- Add one new element at a time. A second example says how it differs from the
  first.
- Say what each table, figure or code block shows. One the text never uses is
  cut.
- Cut identifiers the reader will not meet again, such as a function name
  mentioned once.
- More than two nested conditions or negations in a sentence, or three
  coordinate items buried in prose, become separate sentences or a list.

## 8. Reports and replies

A report to the user is a document. It covers a status update, a review
result and a final summary.

- Open with the outcome: done, partly done, blocked or failed.
- Separate what was verified, with the command and its result, from what was
  not run or not checked. Never write "verified" for something unrun.
- List what changed by its effect, not every step taken.
- Name work that was not requested, and work that remains, as such.
- State a failure with its evidence. Do not soften it with a hedge or bury it
  below good news.
- End with what the reader must decide or do next, or with nothing when
  nothing is owed.

## 9. Re-read what you wrote

Read every line you changed and check three things:

1. Is any phrasing still hard to follow?
2. Does any sentence read as a literal translation?
3. Does any sentence match a pattern in § 4 to § 7?

An agent that reasons in one language and writes in another leaves translation
artefacts behind. This happens in every language pair. Rewrite the sentence
the way someone writing natively in that language would put it.

A pattern is a candidate, not a verdict. Keep a phrase that is literally true
and that the reader needs, and rewrite one that only matches the shape.

After a rewrite, compare it with the text it replaced. Nothing is added or
lost, the certainty is unchanged, and every reference still points at the same
thing. Read again until a pass finds nothing new. A finding that keeps coming
back means the paragraph is wrong in its structure: rewrite the paragraph.

## Automatic reminder

`.claude/settings.json` and `.codex/hooks.json` carry hooks that re-state this
standard at the two moments it is easiest to forget:

| Moment                                                           | Hook        |
| ---------------------------------------------------------------- | ----------- |
| Posting a pull request, issue or review through the GitHub tools | PreToolUse  |
| Writing or editing a Markdown file                               | PostToolUse |

Each hook prints one message from `.agents/rules/reminders.json`, with no
network, and a missing file prints nothing. Claude Code runs `node` directly,
with no shell. Codex runs it as one command line, the same under every shell,
once the project's hooks are trusted, and reminds after a patch that adds or changes a
Markdown file. Delete the entries from both files to turn the reminder off; the
rule still applies.

The `gh` command line is out of scope. A shell-argument condition also matches
compound commands that have nothing to do with GitHub, which would put the
reminder in front of unrelated work. The standard reaches the agent through
`CLAUDE.md` and `AGENTS.md` either way.

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
