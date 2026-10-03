# 11 OQ Register

<!-- UX-INTENT: If UI-bearing, track design direction OQs against 04_Sources.md and uiux/40_screen_contracts.md -->

## OQ Table

| OQ-ID   | Title | Gate       | Disposition | Owner | Rationale | Options                              | Recommendation | Resolution | Next-Decision-Point                        | Due        | Evidence         |
| ------- | ----- | ---------- | ----------- | ----- | --------- | ------------------------------------ | -------------- | ---------- | ------------------------------------------ | ---------- | ---------------- |
| OQ-0001 | TBD   | discussion | deferred    | user  | TBD       | Option A / Option B (recommended: A) | Option A       | —          | <when, and by what signal, it is reopened> | YYYY-MM-DD | Conversation log |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- The table holds each question's current state. A disposition change edits
  the row; it adds no second row.
- `Resolution` states the answer taken for `resolved`, and why the question
  is not one for `rejected`. It is `—` while the question is `open` or
  `deferred`.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- For `deferred`, `Next-Decision-Point` names when, and by what signal, the
  question is reopened. A deferred row without one blocks completion.
- `Options` must include at least two alternatives and one recommended option —
  for a question that offers a choice.
- `Recommendation` must explicitly state the recommended option, where one is
  permitted.
- **A question asking for a fact is the exception to both.** Nothing is being
  decided, so there is nothing to recommend: `Recommendation` is `—`, and
  `Rationale` says what the value is for. Inventing a preferred answer to fill
  the column records a decision nobody made.
- **`Options` still carries the candidates when the fact has any.** Which of the
  four regions the platform supports is a fact with a finite set, and dropping
  the set loses the constraint the answer has to satisfy — the register would
  ask for a value it has already made unanswerable. Write `fact` there only
  where the value is open, as a name or a number nobody has narrowed.
- All 12 columns are mandatory for every row.
