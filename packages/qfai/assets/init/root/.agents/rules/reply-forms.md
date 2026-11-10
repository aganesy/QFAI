# Reply Forms

The form a user's answer to agent output takes, what puts it in front of them,
and the text it comes back as.

`user-questions.md` decides when a question is asked and the parts it carries.
This rule decides which of four reply forms the answer takes. It adds no
question, step or gate. A form reshapes a question that an existing point
already puts: a grilling round, the confirmation that closes a grilling
session, a decision point, a release approval, a question asked against a
prototype, the session-feedback filing question.

The reason is the cost of a correction. An answer written as free prose, away
from what it answers, leaves the agent to guess which passage or item was
meant, and the guess is the next round of rework.

## 1. Pick the form from what is answered

| What the user answers                           | Form    | The user                                                                        |
| ----------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| One decision among options that can be listed   | choose  | picks one, or as many as the question allows                                    |
| A draft the user is asked to approve or correct | mark up | pins a note on a passage, rewrites a passage in place, or comments on the whole |
| A set of items, each to be put somewhere        | sort    | puts every item in one of a few named columns, in one reply                     |
| A question of taste that talking cannot settle  | compare | picks one of two or three variants and says what they prefer in it              |

What one form puts in front of the user, the draft, the set or the variants, is
a sheet.

- **Choose** is `user-questions.md` as it stands.
- **Mark up** answers a draft: a plan, a specification change, a discussion
  pack, an issue or pull request body, a long answer, the sheet a grilling
  session is confirmed on (`grilling.md`). The draft is one the existing point
  already shows the user.
- **Sort** answers a set such as review findings, open questions or feedback
  drafts. A set the structured question tool carries in one question stays a
  multi-select question. A set with more items than the tool's option limit,
  or with more than two outcomes per item, is one sort. Never split a set
  into one question per item: the user then holds the set in their head.
- **Compare** puts two or three variants side by side: wording, structure,
  layout. It is the artifact `grilling.md` builds where talking cannot settle a
  question, and it is used where that artifact has more than one variant. A
  single prototype is asked against as `grilling.md` says; this rule builds no
  second one. Never one variant with a rating: a comparison recovers a
  preference faster and more reliably than a score.

**Recommend where § 3 permits it, and show what stands against it.** Where
`user-questions.md` § 3 permits a recommendation, a sort places each item in its
recommended column with a one-line reason, and a comparison names the
recommended variant and the strongest point of the one it beat. A
recommendation pulls agreement even when it is wrong, so the alternative stays
in view. Where § 3 permits none, as for a fact or a taste the evidence does not
decide, nothing is placed in advance and the sheet says why. Nothing placed in
advance is applied until the reply confirms it.

**A preference that has not formed yet is asked open.** Where the user has not
said what they want, put the existing question open, as a plain request for the
goal, instead of offering options. Options offered before that steer the
answer.

## 2. The carrier

Take the first carrier that can carry the form in this invocation:

1. **The structured question tool**, where it carries the form: a choose, and a
   sort small enough for one multi-select question.
2. **The host's page publisher**, where it is callable and its page is private
   to the user by default, such as an Artifact on Claude Code, or where this
   rule names it, as it names a Site in the Codex app. Use it for mark
   up, sort and compare, and for a choose whose options need a picture. Where
   it is callable, every mark up, sort and compare goes on it, not in the chat.
3. **Text in the chat**, in the grammar of § 3, numbered so each line can be
   answered by its number.

A page whose default audience is not known to be the user alone is used only
where a standing instruction covers publishing it. Otherwise the sheet goes to
the chat as text, and nothing is asked. Publishing is an action others can see
(`action-reversibility.md`), and asking for it would add a question this rule
does not add. Where the agent cannot confirm a page is private, it treats the
page as not private.

**A Site in the Codex app is that app's page publisher for reply sheets**, as
an Artifact is Claude Code's. This rule is the standing instruction that covers
publishing it, so no other instruction is needed. Every other page not known to
be private still needs one.

A set presented as one, such as a grilling round, takes one carrier: the first
that carries every member. The structured question tool carries a set it
delivers in host-sized batches (`user-questions.md` § 4), so such a set stays
in the tool. Split across two carriers, the set no longer shows what is decided
together.

A page carries what the draft needs and nothing more: no secret, credential or
personal data. It shows the items or the draft with each passage numbered, the
recommendation where there is one, and how many may be chosen. Where the page
has a reply control, the control produces the reply text of § 3 for the user to
send back; otherwise the user replies in the chat in the same grammar. Where
the host relays a comment on the page to the agent, that comment is a reply
too: a note on the passage it is attached to.

Where a callable carrier is passed over, such as a page not known to be
private, say why in one line.

## 3. The reply text

Every form comes back as text. Where a page has a reply control, it produces
the same text the chat form asks for, so a reply means the same wherever it was
written. The first line names the form and the sheet.

Choose:

```text
Reply: choose <sheet title>
Q1: 2
Q2: 1, 3
```

Mark up:

```text
Reply: mark up <sheet title>
[3] "<the passage, quoted>" -> <the note>
[5] rewrite: <the new text of passage 5>
[*] <a comment on the whole>
verdict: revise | approve with notes | approve
```

Sort:

```text
Reply: sort <sheet title>
<column>: 1, 4
<column>: 2
drop: 3, 5
```

Every sort has a column that declines the item: `drop`, or the name the asking
rule gives it, such as `skip`.

Compare:

```text
Reply: compare <sheet title>
pick: B
why: <what the user prefers in it>
keep from A: <optional>
```

Reading a reply:

- A note changes the passage it names and nothing else. A line that names no
  passage or item is a comment on the whole.
- `revise` puts the revised draft again as a new sheet, with the settled notes
  struck through. `approve with notes` applies the notes and asks nothing
  more, unless the asking rule says otherwise, as `grilling.md` does for its
  confirmation sheet.
  `approve` lets the work go on.
- An item the reply neither places nor drops is put again in one sort; it is
  never assumed, unless the asking rule says what an unplaced item means. A
  reply that ends the asking (`stop`, `proceed`, `done`) is read as
  `user-questions.md` § 4 says: an item that is a decision some document
  requires the user to record is still put, and nothing else is put again.
- A note that changes a decision some document requires the user to record is
  that decision. It is recorded as the user's answer, not as an edit.
- A reply whose meaning is unclear is confirmed before it is acted on, as
  `user-questions.md` § 5 confirms a fallback answer. A reply to a sheet
  already applied is not applied again.

## 4. What this rule is not

- Not a reason to ask. A point that asks nothing today asks nothing under this
  rule.
- Not a review step. The reviewers a stage names still review; a sheet is how
  the user answers, not a gate that waits on them.
- Not a page template. The agent builds each sheet with the host's own
  publisher, or writes the text form.

Under a no-question mode nothing is published and nothing is asked. What would
have been put stays open, recorded as the asking rule records an unasked
question.

## Related

- When to ask, and the parts every question carries: `user-questions.md`
- Which design questions to ask, and in what order: `grilling.md`
- Publishing as an action others can see: `action-reversibility.md`
