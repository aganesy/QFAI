# 05 Examples

## EX-0004-0001

- BR-Ref: BR-0004-0003
- Given a screen contract declares `orders-dashboard`
- And screenshot evidence is missing
- Then validate emits `QFAI-UIE-001`

## EX-0004-0002

- BR-Ref: BR-0004-0004
- Given a screen contract declares `orders-dashboard`
- And HTML evidence is missing
- Then validate emits `QFAI-UIE-002`

## EX-0004-0003

- BR-Ref: BR-0004-0005
- Given no screen contract exists
- Then `validateUiEvidenceArtifacts` returns no issue

## EX-0004-0004

- BR-Ref: BR-0004-0001, BR-0004-0002
- Given `qfai validate` runs on a repo with canonical validators enabled
- Then deterministic validator findings are aggregated through the canonical validate path

## EX-0004-0005

- BR-Ref: BR-0004-0006
- Given the prototyping skill contains stale runtime or CLI wording
- Then the skill validator emits a finding instead of silently accepting the drift

## EX-0004-0006

- BR-Ref: BR-0004-0007
- Given a legacy design-system validator slice is still wired in code
- When its prerequisite artifact exists
- Then validate may emit the scoped legacy finding without restoring a removed runtime contract

## EX-0004-0007

- BR-Ref: BR-0004-0008
- Given root `DESIGN.md` does not exist in the consuming project root
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-030` at error severity with message `DESIGN.md not found at <repo-root>/DESIGN.md`

## EX-0004-0008

- BR-Ref: BR-0004-0009
- Given `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256` records `abc123...` while the on-disk `DESIGN.md` sha256 is `def456...`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-031` at error severity with message `DESIGN.md hash drift: lock=abc123..., disk=def456...`

## EX-0004-0009

- BR-Ref: BR-0004-0010
- Given root `DESIGN.md` declares `--color-primary: #2563eb` while `.qfai/contracts/design/design-system.yaml#tokens.color.primary` is `#1d4ed8`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-DCON-032` at error severity with message `design-system.yaml mirror drift: category=color`

## EX-0004-0010

- BR-Ref: BR-0004-0011
- Given `iter-03/review.json` contains `{mode: "full-harness", fullHarness: {iterations: [...]}, allReviewerAxesPerfect100: false}` and lacks `pivotDirective`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (schema-v3-violation) at error severity, listing missing required keys (`scores`, `proseCritique`, `pivotDirective`, `layoutAntiPatternsDetected`, `designMdViolations`)

## EX-0004-0011

- BR-Ref: BR-0004-0012
- Given `iter-05/review.json#layoutAntiPatternsDetected` contains `["lap-099-mystery-pattern"]`
- When `qfai validate --fail-on error` runs
- Then validator emits `QFAI-PROT-002` (lap-whitelist-violation) at error severity, citing `lap-099-mystery-pattern` as an identifier the registry does not declare

## EX-0004-0012

- BR-Ref: BR-0004-0013
- Given `findDesignMdViolations(html, designMd)` is invoked twice with identical inputs across separate test runs
- When the outputs are compared
- Then both arrays are deeply equal and order-stable; static analysis confirms no `fs` / `process` / `Date.now` / network reference inside the call graph

## EX-0004-0013

- BR-Ref: BR-0004-0014
- Given a project with `.qfai/assistant/steering/` (legacy single layer) still on disk
- When `qfai validate` runs in v1.9.x
- Then a warning surface fires naming the offending dir + the canonical 4-layer enum

## EX-0004-0016

- BR-Ref: BR-0004-0017
- Given a reviewer report JSON containing `{"code": "R-REJECTED-READOPT", "justification": ""}`
- When `qfai validate` ingests it
- Then validate exits with error severity (advisory-failing)
- And given a report containing `{"code": "R-WORKLOG-DRIFT", "justification": ""}`, validate raises no justification finding

## EX-0004-0020

- BR-Ref: BR-0004-0021
- Given a project carrying legacy layout in v1.9.x
- When `qfai validate` runs
- Then `D-DEPRECATED-PATH` warning body matches `/sunset: v1\.10\.0/`; ambiguous phrasing like "future release" is absent

## EX-0004-0021

- BR-Ref: BR-0004-0022
- Given `qfai-implement/SKILL.md` without a trailing `project_memory:` YAML block
- When `qfai validate` runs
- Then an error fires naming `qfai-implement` and the missing block

## EX-0004-0022

- BR-Ref: BR-0004-0023
- Given a SKILL.md body containing `.qfai/assistant/steering/agent-routing.yml` (a non-canonical path)
- When `qfai validate` runs in v1.9.x
- Then `W-SKILL-DOC-BROKEN-REF` fires naming the SKILL.md and the broken path

## EX-0004-0023

- BR-Ref: BR-0004-0024
- Given a validate run on a freshly-upgraded project where `qfai init --upgrade-assistant-tree` emitted `W-USER-EDIT-PRESERVED` notes
- When `qfai validate` runs immediately afterwards
- Then validate exits 0; `counts.info >= 1`; the report has an "Informational" section listing the preserved files

<!-- EX-0004-0024..0025 reserved (NNNN gap; the next live row is EX-0004-0026, the ssot-guard worked example which pairs with AC-0004-0026). -->

## EX-0004-0026

- BR-Ref: BR-0004-0001
- Given the `agent-catalog.yml` row for `acceptance-test-engineer` carries `developer_instructions: "## Mission\n- old body"` while the canonical `.qfai/assistant/agents/acceptance-test-engineer.md` body has changed to `"## Mission\n- new body"`
- When the SSOT-guard test in `packages/qfai/tests/codex/agents.test.ts` runs
- Then the test FAILS with `agent-catalog.yml developer_instructions diverges from canonical MD` so the 3-way SSOT cannot drift

## EX-0004-0032

- BR-Ref: BR-0004-0025
- Given a working tree where `qfai validate --profile prototyping` ran first and `qfai validate --profile default` ran second
- When the report directory `.qfai/report/` is listed
- Then both `validate-prototyping.json` and `validate-default.json` exist with independent contents; `validate.json` exists with top-level `{"profile": "default", ...}` reflecting only the second (most recent) run

## EX-0004-0033

- BR-Ref: BR-0004-0026
- Given a downstream consumer that still points at the legacy `.qfai/output/validate.json` path on `qfai@1.9.x`
- When `qfai validate` runs
- Then the legacy path is written AND `D-DEPRECATED-PATH` warning fires with body literally containing `sunset: 1.10.0`
- And in `qfai@1.10.0+`, the same condition exits with error severity and the legacy path is no longer written

## EX-0004-0034

- BR-Ref: BR-0004-0027
- Given a PR that edits `packages/qfai/src/core/validators/findDesignMdViolations.ts` to add a new Tailwind preflight literal exemption but does NOT touch `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md`
- When the SSOT-sync-pair `pnpm ci:lint` lane runs
- Then the lane FAILS emitting `R-PROMPT-SCANNER-DRIFT` (severity error) naming both the modified scanner path and the un-paired prompt path

## EX-0004-0035

- BR-Ref: BR-0004-0027
- Given a PR that touches neither `findDesignMdViolations.ts` nor `generator-prompt.md` (e.g. README typo fix)
- When the SSOT-sync-pair lane runs
- Then the lane passes silently with no `R-PROMPT-SCANNER-DRIFT` emission and no exit-code regression

## EX-0004-0036

- BR-Ref: BR-0004-0028
- Given a Reviewer-Gate report JSON containing `{"code": "R-PROMPT-SCANNER-DRIFT", "justification": "   "}` (whitespace-only)
- When `qfai validate` ingests it
- Then validate exits with severity error (advisory-failing); a corrected justification naming (a) `findDesignMdViolations.ts`, (b) `generator-prompt.md`, and (c) the Tailwind preflight clause whose match could not be confirmed passes

## EX-0004-0037

- BR-Ref: BR-0004-0029
- Given a `certify` invocation that reads `.qfai/report/validate.json` whose top-level `profile` field is `"default"` but the certify gate expects `profile: "prototyping"`
- When `certify` performs the read,
- Then certify aborts the read, surfaces the mismatch with both the observed and expected profile names, and emits the recovery command `qfai validate --profile prototyping --fail-on error` so the operator can re-emit the correct profile-suffixed artifact
- And in `qfai@1.10.0+`, a downstream consumer still reading the legacy `.qfai/output/validate.json` path receives an `error`-severity `D-DEPRECATED-PATH` finding instead of the deprecation-window warning

## EX-0004-0038

- BR-Ref: BR-0004-0030
- Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with `.qfai/contracts/design/design-system.yaml` present (DCON-005) and a conforming CLI-HANDOFF handoff
- When `qfai validate --profile saas-package` runs
- Then validate PASSes and emits two `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) findings: one naming the skipped ATDD-class gate and one naming the skipped implement-class gate
- And given the same repo with `.qfai/contracts/design/design-system.yaml` removed, `qfai validate --profile saas-package` does NOT PASS

## EX-0004-0039

- BR-Ref: BR-0004-0031
- Given a UI contract with `primary_tasks: ["View orders", "Refund an order"]` (string-only) and a sibling contract with `primary_tasks: [{ id: "view-orders", label: "View orders", acceptance: "orders table renders within budget" }]` (structured)
- When `auditProfile.ts` evaluates both
- Then both PASS (string-only during the deprecation window; structured `{id,label,acceptance}` closed shape per DR-0268), and a `QFAI-AUD-020` warning naming the `3..7` recommended count band (DR-0267) fires on a screen declaring 9 tasks

## EX-0004-0040

- BR-Ref: BR-0004-0032
- Given a PR that adds `review-2026-05-27/` at the repository root (outside the allowed roots)
- When `check-pack-locations.mjs` runs in `pnpm ci:lint`
- Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes `.qfai/review/2026-05-27/` as the correct path

## EX-0004-0041

- BR-Ref: BR-0004-0033
- Given a PR that adds `.qfai/discussion/discussion-20260527075558258/` (under an allowed root) and edits an unrelated README
- When `check-pack-locations.mjs` runs
- Then the lane passes silently with no `R-PACK-LOCATION-DRIFT`, and a pre-existing legacy `review-old/` directory untouched by the PR is not re-flagged

## EX-0004-0042

- BR-Ref: BR-0004-0034
- Given a tree whose `.qfai/steering/` holds five entries: one with broken frontmatter, one whose `links` names a spec that does not exist, one `active` entry last updated more than 90 days ago, one whose `promote-to` has no Decisions row, and one `kind: handoff` entry missing sections
- And the tree has no `.qfai/assistant/steering/` directory
- When `qfai validate --profile full` runs
- Then no finding carries `W-WORKLOG-SCHEMA`, `W-WORKLOG-BROKEN-LINK`, `W-WORKLOG-STALE`, `W-PENDING-PROMOTION` or `R-HANDOFF-INCOMPLETE`
- And no finding names a path with a `.qfai/steering/` segment
- The validator that reads the directory raises all five codes on this tree, so the example fails until that validator is gone

## EX-0004-0043

- BR-Ref: BR-0004-0034
- Given a tree `qfai init` wrote, with `.qfai/assistant/catalog/worklog-entry.schema.md` written back into it
- When `qfai validate --profile full` runs
- Then `QFAI-ASSETS-006` (error) names `.qfai/assistant/catalog/worklog-entry.schema.md`

## EX-0004-0044

- BR-Ref: BR-0004-0035
- Given a ledger with a `blocked` row whose `Blocked-By` is `spec-0004:TDD-0001 — blocked at todo`, and no `.qfai/steering/` directory
- When `qfai validate --profile tdd` runs
- Then no error-severity finding names that row
- And given the same row with an empty `Blocked-By`, `TDDLIST_BLOCKED_MISSING_REF` names it
- And given a ledger with a `blocked` row whose `Blocked-By` is `spec-0004:TDD-0001 — blocked at todo`, plus a file under `.qfai/steering/` that cannot be read, no finding names `.qfai/steering/`
