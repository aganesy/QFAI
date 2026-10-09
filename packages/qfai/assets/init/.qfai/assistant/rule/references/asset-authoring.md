# Asset Authoring

Read when you write or change a shipped asset.

## Asset Authoring Shape (Mandatory)

A `SKILL.md` states the contract and points at the file that carries the detail. It is not where the detail lives.

- **Keep in `SKILL.md`**: what the skill is for, its non-goals, its hard constraints, the phase/step order, and the gate conditions. Enough for an agent to know what it must do and when it is done.
- **Move out**: command sets, table schemas, field-by-field contracts, worked procedures, checklists and rationale. These go under the owning tree's own directory:
  - `references/` — normative detail the body cites (`references/<topic>.md`)
  - `templates/` — artifacts the file produces, as fillable skeletons
  - `examples/` — worked instances that illustrate, and bind, nothing
- **One topic per file.** Do not replace an oversized `SKILL.md` with an oversized `references/everything.md`; that is the same problem one directory down. Split by topic and keep each file readable on its own — a reader who followed one pointer should not have to scan past three unrelated subjects to reach the one they came for.
- **Every pointer resolves.** A line that moves detail out must name the file (and anchor, when the file covers more than one topic) so the reader is never left guessing where the rule went.

A hard line ceiling backs this up: **500 lines per Markdown assistant asset file** and **800 lines per YAML assistant asset file**, for every `.qfai/assistant/**/*.{md,yml,yaml}` file, counted as `content.split(/\r?\n/).length` — blank lines included.
`npx qfai doctor` measures it and reports every file over its ceiling as `assets.lineBudget`.
The ceiling is a backstop, not the rule: a file approaching it is a signal to move a section out, not to raise the number.

The Markdown ceiling is the limit an agent can follow in one file: it follows fewer instructions as its context grows, and follows those in the middle of a long file worst. A Markdown file has a `references/` home to move detail into. A YAML asset is parsed as data and cannot be split that way (see below), which is why its ceiling is higher.

A body at its ceiling stops shedding topics and starts packing them into longer lines, and a line count cannot see that. The width ceiling below is what catches it.

**A width ceiling makes the count honest: 400 characters per line.** A count of lines bounds reading cost only while a line is a roughly constant unit of reading, and packing broke that — one line in the shipped tree ran 9,104 characters against a median of 118, and cost the budget one unit. The two are read together, because each permits what the other refuses: width alone allows a thin
file of a thousand short lines, and the count alone allows a packed one.

Two shapes are not measured, and for the same reason — the author cannot make them narrower:

| not measured   | why                                                       |
| -------------- | --------------------------------------------------------- |
| a table row    | markdown gives it no continuation, so it cannot wrap      |
| a fenced block | its content is a command, a diagram or a sample, verbatim |

A table is found by its delimiter row, not by a leading pipe: that pipe is optional, so a table written without one is still a table, and a paragraph that opens with one is still a paragraph. Rows a blank line has cut off from their delimiter are prose, because that is how they render.

Some shipped files predate the ceiling and carry a recorded width of their own. It is the width each arrives with, so `npx qfai doctor` does not report a fresh tree for content you received rather than wrote. That record belongs to the package and shrinks there; it is not a per-project allowance, and it never loosens the ceiling on an asset you write. **Everything you author is held
at 400.**

The exemption from the line ceiling does not carry here. Its reason is about a file's length, not about how wide one line may be.

No shipped prose asset has a line-ceiling exemption. Agent definitions are
individual cards under `assistant/agent/`, so their count does not lengthen
one roster file.

### The owning tree is the one the file sits in

The ceiling applies to **every** shipped assistant prose asset, including
rules and cards. A rule at the ceiling moves topic detail to
`rule/references/<topic>.md`; a skill uses its own `references/` directory.
The tree that owns the file owns its detail.

For a prose asset, raising the ceiling or claiming an exemption is not the remedy. An exemption claims no split is possible, and a Markdown file whose tree has a `references/` home available cannot make that claim.

### Machine-readable assets split in their own format, or say why they cannot

The ceiling is measured over YAML assets too — package routing and review-profile defaults and the shipped contract templates. The split above is not open to them: a validator parses those files as structured data, or a skill copies one whole into a project, so an entry moved into a Markdown sibling under `references/` leaves the parsed document and stops meaning anything. Prose about the
file may move there; the file's own items may not.

So for a machine-readable asset at the ceiling the remedy is, in order:

1. **Split it in its own format** — a sibling of the same kind that the loader or schema already reads, so every item stays parsed.
2. **Record an exemption** where the document has to stay whole — a file generated from another asset, one the schema admits only as a single document — naming what makes the split impossible. "This file is long" is not that reason, and a prose asset may not use this step.

## Citation Path Form (Mandatory)

A pointer only resolves if the reader knows what base to resolve it against. There is one base, and it is the project root.

- **Cite a shared rule by its full path from the project root.** Write the path from the project root, with `#anchor` appended when one applies: `.qfai/assistant/rule/drift-protocol.md`. Not the bare filename, not a relative climb. That form resolves from every directory in the tree,
  and the only one that still resolves when read with the cwd at the project root — which is where an agent's cwd is.
- **The same holds when a rule cites another one**, including a sibling in its own directory. A bare name works there only by accident of where the citing file sits; it stops working the moment the text is quoted elsewhere.
- **Within a skill's own directory, keep pointers relative to that directory**: `references/<topic>.md`, `templates/<name>.md`. Those name the skill's own parts, not a shared document, and the surrounding text already establishes which skill is meant.
