# CLI Contract: `qfai guardrails`

- Contract scope: the public decision-guardrail command and its source grammar
- Migration origin: `spec-0007`
- Used-by: operators and skills reading explicit non-goals, deferrals, and trade-offs
- SSOT modules: `packages/qfai/src/cli/commands/guardrails.ts` and `packages/qfai/src/core/decisionGuardrails.ts`

## Command surface

On the story tree, the default scan reads Markdown under
`<paths.specsDir>/01_policy/` and `<paths.contractsDir>/`. Repeatable `--path`
selects
explicit files or directories. Each guardrail is an explicit `DG-NNNN` entry
under `## Decision Guardrails`, written as `### DG-0001` or
`- ID: DG-0001`. An entry carries its existing ID, type (`non-goal`, `not-now`,
or `trade-off`), guardrail statement, rationale, and reconsideration condition;
optional related IDs, keywords, and title remain available. RFC 2119 words in
ordinary policy or contract prose do not create entries.

`qfai guardrails list` normalizes and sorts entries before rendering them with
their source location. An empty set renders `- (none)`. `extract --keyword`
filters by case-insensitive substring, and `--max` limits its output to 20 by
default. `check` reports malformed entries and duplicate IDs as issues, then
prints `guardrails check: error=N warning=M`. An issue with `error` severity
returns exit 1; a clean check returns 0. A missing action, invalid argument, or
unreadable source returns exit 2. `--format json` provides a machine-readable
payload even for a refusal.

This command reports decision guardrails. It does not turn every normative
statement into a guardrail, edit a source entry, or enforce unrelated CI lint
rules. The policy or contract containing an entry owns its decision; this
contract owns how the command reads and reports it.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                    | Examples                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-0200 | On the story tree, read only explicit `DG-NNNN` entries in Markdown under `<paths.specsDir>/01_policy/` and `<paths.contractsDir>/`. Each entry keeps its ID, type (`non-goal`, `not-now`, or `trade-off`), guardrail statement, rationale, and reconsideration condition. RFC 2119 keywords alone do not create guardrails. | EX-0003-0013-01, EX-0003-0013-04, EX-0003-0013-07                                   |
| BR-0201 | list は `# Decision Guardrails (list)` ヘッダ + `- [ID][type] text (file:line)` 形式。0 件時は `- (none)`                                                                                                                                                                                                                    | EX-0003-0013-02, EX-0003-0013-03                                                    |
| BR-0202 | `extract --keyword` keeps an entry when the keyword is a case-insensitive substring of its title, statement, rationale, related field or keywords.                                                                                                                                                                           | EX-0003-0014-01, EX-0003-0014-04, EX-0003-0014-10                                   |
| BR-0203 | `extract --max` defaults to 20. A value that is not a non-negative integer is an error with exit 2; `0` is valid and outputs no entry.                                                                                                                                                                                       | EX-0003-0014-02, EX-0003-0014-05, EX-0003-0014-06, EX-0003-0014-07, EX-0003-0014-08 |
| BR-0204 | Without `--format json`, `extract` prints each entry's ID, type, statement, rationale and reconsideration condition in the LLM-oriented format.                                                                                                                                                                              | EX-0003-0014-03                                                                     |
| BR-0205 | check は `guardrails check: error=N warning=M` summary + 個別 Issue 行を出力する                                                                                                                                                                                                                                             | EX-0003-0015-01, EX-0003-0015-03                                                    |
| BR-0206 | error > 0 → exit 1、error = 0 → exit 0                                                                                                                                                                                                                                                                                       | EX-0003-0015-02, EX-0003-0015-03                                                    |
| BR-0207 | action が未指定の場合はエラーメッセージを表示して exit 2                                                                                                                                                                                                                                                                     | EX-0003-0016-01                                                                     |
| BR-0208 | When a guardrail source cannot be read, for example a `--path` that does not exist, every load error is printed and the exit code is 2.                                                                                                                                                                                      | EX-0003-0016-02, EX-0003-0016-03, EX-0003-0016-04                                   |
| BR-0209 | `list` and `extract` output entries ordered by type — `non-goal`, then `not-now`, then `trade-off` — and then by ID.                                                                                                                                                                                                         | EX-0003-0013-06, EX-0003-0014-09                                                    |
