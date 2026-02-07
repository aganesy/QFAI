# Change Classification (Primary / Tags)

To keep PR/design/review/test planning aligned, classify each change along two axes.

- **Primary**: choose exactly one main purpose (mutually exclusive).
- **Tags**: choose zero or more impacted surfaces.

This classification is used in:

- PR body (Change Classification)
- `.qfai/specs/*/delta.md` Metadata
- Review focus (QA / Architect / Code Reviewer)
- Test strategy (which layers to add/update)

---

## 1. Primary (choose exactly one)

Primary answers: "What is the main purpose of this change?"

| Primary        | Meaning (short)                                            | Typical examples                                                                                           | Expected tests/evidence                                              |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Initial**    | New capability/artifact without changing existing behavior | New command/prompt, new spec pack template, new validator rule                                             | New tests are expected. Update README/templates.                     |
| **Behavior**   | User-observable output changes                             | `validate` results change, output format/defaults change, `init` artifacts change, config/contract changes | Regression tests + acceptance updates. Note migration/compat impact. |
| **Structural** | Internal changes with no external behavior change          | Refactor, internal algorithm swap (same output), type cleanup, deduplication                               | Existing tests should still pass; show evidence of output stability. |
| **Ops**        | Ops/dev/distribution changes (runtime behavior unchanged)  | CI/release/packaging/scripts, docs-only, tests-only                                                        | Provide gate command evidence (format/lint/test/pack).               |

### Primary decision algorithm (for AI)

Pick the **first** that applies:

1. **Behavior**: With the same inputs/assumptions, does user-observable output change?
   - Example: validate error/warn changes, report output changes, `init` artifacts change, config defaults change, CLI options change.
2. **Initial**: A new capability/artifact is added without changing existing behavior.
   - Example: new guardrail check, new command, new template file.
3. **Structural**: Internal structure changes but external behavior stays the same.
4. **Ops**: None of the above; only CI/release/tooling/docs/tests.

#### Common pitfalls

- **`init` outputs** are user-observable. Usually **Behavior**; if only new files are added, **Initial**.
- **Config schema/defaults/allowed inputs** changes are **Behavior** (often with `@api`).
- **Log wording only** can be **Ops**, unless logs are part of an external contract.
- **Tests only** is **Ops** (`@test`), but if tests accompany behavior changes, Primary is **Behavior**.

---

## 2. Tags (multi-select)

Tags indicate which surfaces are affected. They do not replace Primary.

| Tag       | Trigger condition                                            | Examples                                                                                       |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **@api**  | Public interfaces/contracts/inputs/outputs are involved      | CLI options, `qfai.config.yaml` schema, public `validate.json` schema, contracts/specs formats |
| **@db**   | Persisted data formats or DB contracts are involved          | `.qfai/contracts/db/*`, SQL contracts, ledger formats, report data structure                   |
| **@nfr**  | Non-functional goals (perf/reliability/security/operability) | Performance improvements, error/recovery changes, logging/observability, security fixes        |
| **@docs** | Documentation/templates/guides change                        | README, guides, template explanations, rules clarification                                     |
| **@test** | Tests/verification/CI strategy change                        | Tests added/updated, fixtures updated, gate command changes                                    |

### Tag selection (for AI)

- You may assign tags mechanically from file types.
- When in doubt, include the tag (over-tagging is safer than under-tagging).
- If only `@docs` and `@test` remain, re-check whether Primary should be **Ops**.

---

## 3. Where to declare (required)

### 3.1 PR body

Include in the PR template:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags: list from `@api @db @nfr @docs @test`
- Rationale (1-3 lines)

### 3.2 delta.md

Include in each spec pack `delta.md` Metadata:

- Primary
- Tags

Include in each DL entry `#### Verification`:

- `### Plan` with one or more items (`id/level/target/method/owner/expected`)
- If `compat: Change`, `Verification.Plan` is required

---

## 4. Examples

### Example 1: Fix a validate misclassification bug

- Primary: **Behavior** (results change)
- Tags: **@api @test** (public output + tests)

### Example 2: Parser refactor (output unchanged)

- Primary: **Structural**
- Tags: **@nfr @test** (quality/maintainability; add regression tests if needed)

### Example 3: README-only update

- Primary: **Ops**
- Tags: **@docs**
