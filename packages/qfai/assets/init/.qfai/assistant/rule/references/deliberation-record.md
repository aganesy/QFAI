# Deliberation Record

Read when a run writes its deliberation record, or reads one.

A run keeps a memo of the questions it put to the user and the decisions its agents took. It starts from the record template the operating baseline names.

## Writing a record

- **Where.** One Markdown file directly under `paths.deliberationDir` (default `.qfai/deliberation`), named `<YYYYMMDDhhmmss>-<slug>.md`: the time in UTC and a slug naming the subject. It is tracked in git.
- **When.** A run writes one only when it asks the user a question or takes an Agent decisions row. Each stage of the run writes under a subheading of its own in the same file.
- **Interview.** One row per question put to the user. The options offered go into Options 1 to 3 in the order offered, and `Chosen option number` holds the number of the one picked. Quote a free answer word for word in `Option 4 (other)` and choose `4`. A question with no candidate values leaves Options 1 to 3 empty, holds the answer in Option 4 and chooses `4`. A source the options rest on goes into Background as a URL.
- **Agent decisions.** One row per choice that no specification, contract, rule or convention settles and whose answer changes an artifact's meaning, behaviour, structure or policy, and one per decision settled between agents. Consider at least three options for each row. A choice a convention settles, a formatting choice and a choice with one possible answer are not rows.
- **A memo.** A record has no ID, cites no ID, and nothing cites it. Once committed, it may be edited only to repair its table layout (a table's columns and a row's cell count), never its content: a correction is a new record. A later row that overturns an earlier row of the same record says so in its Background, and the earlier row stays.
- **Language.** The language the project states it keeps its documents in, otherwise the language the user works in.

## What the reports keep

- An agent decision is an Agent decisions row of the record, never a line of the stage report or the final report.
- The stage report keeps the evidence: gate results, CI receipts, review skips and quoted delegation instructions.
- An assumption a no-question mode takes is a row too, and the final report also lists it.

## Committing a record

- `verify-commit` commits the record with the change.
- A stage skill invoked by name, outside a `qfai-run` plan and with no `verify-commit` step, makes its record final at its last step. That step commits locally only the record and the `open-questions.md` rows the run wrote, and pushes nothing.

`npx qfai validate` checks only the layout (`QFAI-DELIB-001`): both sections exist, and every table in them has the six template columns in order and six cells per row.

## Reading a record

- The current specification, the settled decisions and the open questions come from the story tree, `decisions.md` and `open-questions.md`, never from a record. Where a record disagrees with them, they win and the record stays unchanged.
- `/qfai-sdd` reads the record of its own run, or the one its work order names.
- Outside an implement, verify or prototyping stage, before you take a decision yourself, search the option cells of the records, with the `Declined:` rows of `decisions.md`, for the option you are about to choose. Read only the rows that match. An option the user turned down before goes back to the user, or is registered as an open question under a no-question mode.
- An implement, verify or prototyping stage reads no record.
