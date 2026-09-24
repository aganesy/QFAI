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

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                    | Examples                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| BR-0200 | On the story tree, read only explicit `DG-NNNN` entries in Markdown under `<paths.specsDir>/01_policy/` and `<paths.contractsDir>/`. Each entry keeps its ID, type (`non-goal`, `not-now`, or `trade-off`), guardrail statement, rationale, and reconsideration condition. RFC 2119 keywords alone do not create guardrails. | EX-0003-0013-01, EX-0003-0013-04 |
| BR-0201 | list は `# Decision Guardrails (list)` ヘッダ + `- [ID][type] text (file:line)` 形式。0 件時は `- (none)`                                                                                                                                                                                                                    | EX-0003-0013-02, EX-0003-0013-03 |
| BR-0202 | extract の `--keyword` は大文字小文字を区別しない部分一致でフィルタリングする                                                                                                                                                                                                                                                | EX-0003-0014-01                  |
| BR-0203 | `--max` 未指定時はデフォルト 20。非負整数でない場合はエラー（exit 2）                                                                                                                                                                                                                                                        | EX-0003-0014-02                  |
| BR-0204 | extract は formatGuardrailsForLlm() で LLM 向けフォーマットを出力する                                                                                                                                                                                                                                                        | EX-0003-0013-05                  |
| BR-0205 | check は `guardrails check: error=N warning=M` summary + 個別 Issue 行を出力する                                                                                                                                                                                                                                             | EX-0003-0015-01                  |
| BR-0206 | error > 0 → exit 1、error = 0 → exit 0                                                                                                                                                                                                                                                                                       | EX-0003-0015-02                  |
| BR-0207 | action が未指定の場合はエラーメッセージを表示して exit 2                                                                                                                                                                                                                                                                     | EX-0003-0016-01                  |
| BR-0208 | loadDecisionGuardrails のエラー（パス不在等）があれば全エラーを表示して exit 2                                                                                                                                                                                                                                               | EX-0003-0016-02                  |
| BR-0209 | list/extract では normalizeDecisionGuardrails() + sortDecisionGuardrails() で正規化・ソートしてから出力する                                                                                                                                                                                                                  | EX-0003-0013-06                  |
