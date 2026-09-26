# 10 Plan

## Implementation approach

1. `/qfai-verify` は repo gates と `qfai validate --fail-on error` を必ず実行する
2. downstream quality gate は contract-first validator 群を truth source にする
3. review artifact の `PASS` / `REVISE` と unresolved blocking findings を completion 判定に統合する
4. direct discussion-pack canonical validators は coexist してよいが、repo-root completion path の primary dependency にしない
5. verify summary は fix loop に必要な validate/review/evidence の要点を残す

### Story-tree layout

The change is text in the `qfai-verify` skill under
`packages/qfai/assets/init/.qfai/assistant/skill/qfai-verify/`. No source
module changes. It lands in two steps.

**P6, with the assistant-tree rename.**

1. `SKILL.md` and `references/context-load.md` read the constitution from
   `.qfai/assistant/rule/` and cite no `.qfai/assistant/constitution/` path
   (BR-0014-0029, EX-0014-0033).
2. Routing and review profiles are the built-in defaults with each matching
   `qfai.config.yaml` override replacing its entry. The skill cites
   `rule/agent-selection.md`, which states once where the defaults are read
   from, and names no defaults file itself (P3-D01) (BR-0014-0030,
   EX-0014-0034).
3. An agent's `kind`, `owned_artifacts`, `tool_profile`, `permission_profile`
   and `specialization_tags` are read from its card frontmatter, not from
   `agent-catalog.yml` (BR-0014-0030).
4. The co-changes the Triage row lists for this repository land in the same
   commit: the `skillsDir` config key, the tracked links, and the citations in
   the root documents, rules and scripts.

**P7, with the cutover.**

1. `references/articles.md` restates the constitution's Article V chain rather
   than spelling its own: no TC hop, no `tdd/test-list.md`, and a Tests hop
   that answers a BF from E2E tests, an AC from integration or API tests, and
   an EX from any test (BR-0014-0026, EX-0014-0030).
2. `references/context-load.md` reads the spec tree from `<paths.specsDir>`,
   contracts plus `tech.md` and `structure.md` from `<paths.contractsDir>`, and
   the product facts from `objective.md`, `initiative.md` and `principle.md`
   under `<paths.specsDir>/01_policy/` (BR-0014-0027, EX-0014-0031). It waits
   for P7 because the catalog files move there.
3. `SKILL.md` names the rows of `decisions.md`, cited by `DEC-NNNN`, as its
   decision sources, and reads a row at REJECTED as a rejected option
   (BR-0014-0028, EX-0014-0032).

Verify's own gate stays an unscoped full scan on the story tree. It takes
neither `--spec` nor `--flow` (NFR-0001).

**Architectural elements.** This spec introduces none. It reads the built-in
routing defaults through the rule that states their location (spec-0015,
P6).

**Alternatives rejected.**

- Naming the defaults file in the skill: the location is stated once in
  `rule/agent-selection.md`, and a second statement drifts.
- Reading `constitution/` and `rule/` side by side for a while: rejected by N05.

## Test approach

- Unit tests: verify summary formatting, PASS/REVISE interpretation, contract-first issue grouping
- Integration tests: verify executes repo gates and validate in the correct order
- E2E tests: UI-bearing project with missing screenshot/html or missing design contract fails until corrected

### Story-tree layout

Every new case is L3 (Integration) and reads the shipped skill text. No case
lands at L1, L2 or L4. The E2E story rows (TDD-0037 to TDD-0041) stay as they
are.

| Case         | Reads                                    | Asserts, with its negative                                                                                             |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| TC-0014-0037 | `references/articles.md`                 | Article V restated with the three-way Tests hop; no TC hop and no `tdd/test-list.md`                                   |
| TC-0014-0038 | `references/context-load.md`             | `<paths.specsDir>` and `<paths.contractsDir>` tokens; no literal `.qfai/specs/`, `.qfai/contracts/` or `catalog/` path |
| TC-0014-0039 | `SKILL.md`                               | `decisions.md` rows by `DEC-NNNN`, REJECTED read as rejected; no `07_Decisions.md` or `_policies/08_Decisions.md`      |
| TC-0014-0040 | `SKILL.md`                               | The constitution under `rule/`; no `constitution/` path                                                                |
| TC-0014-0041 | `SKILL.md`, `references/context-load.md` | Defaults with whole-entry overrides; entries from card frontmatter; no `agent-catalog.yml`                             |

The merge itself — one routing entry replaced, profiles left at their defaults
— is proven by spec-0015's unit case for the merge (TC-0015-0040). TC-0014-0041
proves the skill reads the merged result.

Boundary cases that get their own case, not a shared one:

- `paths.specsDir` and `paths.contractsDir` pointed outside `.qfai/`
- a `decisions.md` holding both a DONE row and a REJECTED row
- one routing override with no review-profile override

The tests that pin today's wording change in the commit that changes the text:
`tests/assets/traceabilityChainLayered.test.ts` for `articles.md` at P7, and
every test citing `assistant/skills/qfai-verify` or
`assistant/constitution/` at P6.

## NFR approach

For a project on the story tree:

- **NFR-0001 full-scan gates.** Verify keeps an unscoped `qfai validate`. The
  per-flow scope belongs to `/qfai-atdd` and `/qfai-implement`. Breach
  measurement: the verify gate command in `SKILL.md` carries `--flow` or
  `--spec`, or TC-0014-0018 fails.
- **NFR-0002 deterministic output.** Whole-entry override replacement gives
  one result for one input. Breach measurement: two verify runs on the same
  tree and config produce different `.qfai/output/verify.json` gate outcomes.
- **NFR-0003 no stray UI errors.** Unaffected: the change reads no UI input.
  Breach measurement: a non-UI fixture reports a UI validator error after P7.

## Dependencies

- Requires: `/qfai-sdd` により生成された specs/contracts
- Requires: review artifacts and validate output
- Consumed by: completion gate, PR handoff

### Story-tree layout

- Requires, from P6: the `rule/ skill/ agent/ prompt/` assistant tree
  (spec-0003), the built-in routing and review-profile defaults, the override
  keys and `rule/agent-selection.md` (spec-0015).
- Requires, at P7: the Article V rewrite in `rule/constitution.md` (spec-0001),
  the policy files under `01_policy/`, and `tech.md` and `structure.md` under
  `<paths.contractsDir>`.

## Risk mitigation

- historical validator wording に `full-harness` や discussion-side 用語が残る可能性
- mitigation: active path と historical vocabulary を区別し、public guidance では contract-first posture のみを説明する

### Story-tree layout

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                                                                | Trigger to act                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `QFAI-TRACE-001` fails CI: this spec's `03` and `04` changed while the implementation files `16_Traceability-ledger.md` links did not | high / med          | The findings are pinned in `scripts/dogfood-backlog.json` as a recorded one-off exception (user answer Q1). The pin is lifted when the linked files change or when P7 retires the ledgers | A `QFAI-TRACE-001` finding outside the pin, or the pin still present once its lifting condition has been met             |
| A `constitution/` or `manifest/` citation survives the P6 rename in the verify skill                                                  | med / high          | The P6 commit repoints every citation in `skill/qfai-verify/**`; the stale-citation patterns in `skillDocReferences.ts` (spec-0013) report what is missed                                 | A `.qfai/assistant/constitution/` or `.qfai/assistant/manifest/` citation under `skill/qfai-verify/` after the P6 commit |
| The skill cannot open the built-in defaults, because no project file carries routing any more                                         | med / high          | The location is stated once in `rule/agent-selection.md`, and the skill cites that rule. The shipping lint covers the defaults directory (P3-D01)                                         | A verify run on an install with no on-disk package directory cannot read the defaults                                    |
| `context-load.md` cites `01_policy/` before this repository has one                                                                   | low / med           | The P7 change is ordered after the commit that migrates this repository                                                                                                                   | `references/context-load.md` names `01_policy/` in a commit before this repository's migration commit                    |
| The new `todo` integration cases and E2E rows raise `QFAI-ATDD-111` and `QFAI-ATDD-112` on this repository's dogfood lanes            | high / med          | No pin (user answer P3-C1). This change also runs `/qfai-atdd` and `/qfai-implement`, and their tests land before it merges                                                               | A dogfood lane reports either code for spec-0014 when the change is made ready to merge                                  |
| The ledger mixes `skill/` cells (TDD-0045, TDD-0046) with `skills/` cells (TDD-0042 to TDD-0044) until P6                             | high / low          | Cells name the path the module has when the row's work lands. The P6 rename commit repoints the older `skills/` cells                                                                     | `grep -rn "assistant/skills/" .qfai/specs/*/tdd/test-list.md` is non-empty after the P6 commit                           |

The `QFAI-TRACE-001` pin, shared with spec-0017, holds 13 findings under
these keys of `scripts/dogfood-backlog.json`, with the same count in both the
`tdd` and the `full` profiles:

| Key                                                        | Findings |
| ---------------------------------------------------------- | -------- |
| `packages/qfai/src/core/validators/prototypingEvidence.ts` | 2        |
| `packages/qfai/src/core/report.ts`                         | 1        |
| `packages/qfai/src/cli/commands/prototypingCertify.ts`     | 1        |
| `.qfai/specs/spec-0017/07_Decisions.md`                    | 6        |
| `.github/workflows/release.yml`                            | 2        |
| `package.json`                                             | 1        |

- The pin is an exception to the file's own rule, under which a count only
  goes down, and holds only because the user approved it as a one-off (user
  answer Q1).
- A commit that touches a keyed file clears that file's finding, so it re-pins
  the key in the same commit: `core/report.ts` changes at P3, for one. A key
  that reaches zero is struck rather than left at 0.

## SaaS-Package Certify Scope (REQ-0166 certify side, v1.9.2)

- How: `qfai prototyping certify --scope saas-package` writes `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field enumerating each skipped gate (the ATDD / implement-class gates that the spec-0004 validate profile skips).
- How: the certify path withholds any field that would assert full DONE while scope is `saas-package`.
- How: `--upgrade-scope full` re-checks every gate named in `notes:`; it rejects with a message naming still-missing gates and upgrades the sealed certificate to full scope only once all PASS.
- How: `/qfai-prototyping` SKILL.md documents `--scope saas-package` as a SaaS-tenant delivery mode.
- Test strategy: integration test for the seal (`scope` + `notes:`, no full-DONE claim) and the `--upgrade-scope full` reject-then-allow boundary; both assert CLI shape (flags, certificate field shape).
