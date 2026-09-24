# 11 OQ Register

<!-- UX-INTENT: If UI-bearing, track design direction OQs against 04_Sources.md and uiux/40_screen_contracts.md -->

## OQ Table

| OQ-ID   | Title | Gate       | Disposition | Owner | Rationale | Options                              | Recommendation | Next-Decision-Point  | Due        | Evidence         |
| ------- | ----- | ---------- | ----------- | ----- | --------- | ------------------------------------ | -------------- | -------------------- | ---------- | ---------------- |
| OQ-0001 | TBD   | discussion | deferred    | user  | TBD       | Option A / Option B (recommended: A) | Option A       | Trigger and due date | YYYY-MM-DD | Conversation log |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
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
- All 11 columns are mandatory for every row.
