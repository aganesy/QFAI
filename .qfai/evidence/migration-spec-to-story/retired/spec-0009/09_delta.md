# 09 Delta (Migration Record)

## Origin

- New spec (no old equivalent)
- CAP-0009: qfai-configure skill specification

## Adopted

- AD-0009-0001: New spec creation -- `/qfai-configure` skill was previously undocumented; now formalized as spec-0009

## Rejected

No rejected options.

## ID Renumbering

N/A -- new spec with no prior IDs to renumber.

## Triage

| Source                                            | Subject                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discussion-20260804173914356#REQ-0023` (CHG-007) | per-layer tool-selection rationale gains a cross-reference to the layer-to-CI-lane map | spec-0009     | UPDATE    | MODIFY | -           | Cascade from CHG-007. spec-0009 scopes adopter-repository config discovery, not QFAI's own workspace; the mapping document is authored under the asset catalog tree and owned by spec-0017. Cross-reference only — the layer vocabulary must not grow, so no new layer token, heading or annotation form is introduced here. |

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                                             | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Depends-On                                     |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0001                                                                               | `/qfai-configure` writes `paths.specsDir: .qfai/spec` for a new-layout project      | spec-0009     | UPDATE    | APPEND | -           | Slice A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | -                                              |
| discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0023 | Configure refreshes the `01_policy` and `03_contract` files, stating each fact once | spec-0009     | UPDATE    | MODIFY | -           | Slice B, lands P7 (P4 merged into cutover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | OQ-0170                                        |
| discussion-20260923063306456#REQ-0016                                                                               | Configure writes the project's overrides to `qfai.config.yaml`                      | spec-0009     | UPDATE    | MODIFY | -           | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |

## 2026-09-24 — Spec-to-story run: change summary, landing and recorded drift

Run: `/qfai-sdd` batch `sdd-batch-20260923100952585`, from the discussion pack
`discussion-20260923063306456`. The rows are the ones under
`## Triage (2026-09-23 spec-to-story)` above. No approved Change Request
ordered this run, so no Change Request row is recorded.

### Change summary

- Added: AC-0009-0008; BR-0009-0006 to BR-0009-0008; EX-0009-0006 to
  EX-0009-0008; TC-0009-0010 to TC-0009-0015, each at `Level: integration`;
  ledger rows TDD-0015 to TDD-0022 at `todo`, with `Owning module` filled.
  TC-0009-0015 has one row per rejection, named in the `Boundary` column:
  TDD-0020 `fact-in-two-files`, TDD-0021 `gate-command-in-config` and
  TDD-0022 `catalog-write` (review ruling D2).
- Changed in place, with the story-tree or new-assistant-tree clause added
  beside the current one (ruling X1): `01_Spec.md` Scope In, NFR-0001, REQ-0005
  and Relevant Requirements; US-0009-0002; US-0009-0003; AC-0009-0003;
  AC-0009-0004; BR-0009-0001; BR-0009-0004.
- `tech.md` and `structure.md` are written as `<paths.contractsDir>/tech.md`
  and `<paths.contractsDir>/structure.md`, as BR-0009-0008 settles, in
  `01_Spec.md` Scope In and REQ-0005, US-0009-0003, AC-0009-0004 and
  TC-0009-0014. EX-0009-0008 is concrete, so its Given states the default
  `paths.contractsDir`, `.qfai/spec/03_contract`, and its Then names the
  file under it.
- `10_Plan.md` gains a `### Story-tree layout` subsection under Implementation
  approach, Test approach, NFR approach and Risk mitigation.
- Nothing was removed, and no existing ledger row changed Status (X2, X3).

### Landing

The work lands in three pull requests: P1 on its own and merged first; P2 to
P8 in one pull request that also carries the `/qfai-atdd` and
`/qfai-implement` tests; then the removal of the migration-memo guard
exception on its own. Every spec-0009 row lands in the second.

| Triage row (Source)                                  | Phase | Pull request | What the landing change carries                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ----- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001 (`paths.specsDir` written when absent)      | P7    | P2 to P8     | The configure step writes `paths.specsDir: .qfai/spec` only when the key is absent (BR-0009-0006). TC-0009-0010 and TC-0009-0011 go green here                                                                                                                                                                                                                                                     |
| REQ-0002, REQ-0005, REQ-0023 (the five merged files) | P7    | P2 to P8     | The steering step writes the five files BR-0009-0008 names, in the same change as the file moves that create them. Drops the current four-file steering clause from `01_Spec.md` Scope In, REQ-0005, US-0009-0003, AC-0009-0004, BR-0009-0001 and BR-0009-0004. Rewrites EX-0009-0003 (it names `steering/tech.md`) and TC-0009-0004 with their test; TDD-0004 goes stale and is re-verified there |
| REQ-0016 (overrides in `qfai.config.yaml`)           | P6    | P2 to P8     | The skill moves to `skill/qfai-configure/` and writes overrides only (BR-0009-0007). Rewrites TC-0009-0003 (today: the diff touches only glob keys) with its test; TDD-0003 goes stale and is re-verified there. Drops the current `catalog/` location from the CHG-007 lane-map cross-reference in Scope In                                                                                       |

No row removes an item, so nothing is retired and no ledger row is tombstoned.

### Co-changes the landing carries

- The co-change list in the REQ-0016 Triage row's Rationale, at P6.
- `01_Spec.md` Evidence Summary names
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-configure/SKILL.md`.
  No row covers it; it is repointed in the P6 rename commit.
- The `Owning module` cells of TDD-0015 to TDD-0022 name the `skills/` path
  and are repointed in the same commit.
- `packages/qfai/tests/integration/configureSkillSpec0009.test.ts` reads the
  skill from `skill/` once P6 has renamed it.
- The seed templates of the five merged files and the P7 file moves, which
  spec-0003 owns (`.qfai/contracts/cli/qfai-init.md#the-spec-tree`).

### Recorded drift

- EX-0009-0003 names `steering/tech.md`, a path no current layout has; today
  the steering files are the four catalog files. Handled at P7 with the row
  above.
- TC-0009-0015 has, for each rejection it names, a product artifact that can
  fail (the seed templates, the skill's write set, the config schema). None
  was found without one. If `/qfai-atdd` finds one, it is recorded here, not
  covered by a test that cannot fail.

### Adopted

- Overrides are written only for the skills and review profiles the user
  asks to change, each as one whole entry keyed like its default
  (Phase 2 node G6-5 (a), griller ruling).
- `paths.specsDir` is written only when absent, and never as `.qfai/specs`
  (G6-1).
- The five merged files replace the four catalog files, each fact stated in
  one of them (G6-4); `tech.md` and `structure.md` follow
  `paths.contractsDir` (Phase 2c).
- Existing test cases keep their text until the landing change rewrites them
  with their tests (X2).

### Rejected

- Candidate: write the full routing and every review profile into
  `qfai.config.yaml`.
- Reason: BR-0009-0007 allows only the changed entries. A copied default
  stops a package upgrade from reaching the project (BR-0015-0019).
- DO NOT: copy an unchanged default entry into the project config.
- Temptation: a complete file looks easier to read and edit than a partial
  one.

- Candidate: write only the changed fields of an entry.
- Reason: an override replaces its default entry whole (BR-0015-0020), so a
  partial entry drops the default's other fields.
- DO NOT: merge an override into its default field by field.
- Temptation: a one-field change reads like a one-field diff.

- Candidate: nest the overrides under an `agents:` key, or keep one map per
  skill (G6-5 (b) and (c)).
- Reason: the top-level `routing:` list and `reviewProfiles:` map keep the
  default's own entry shape, which the contract states once
  (`.qfai/contracts/cli/qfai-init.md#configuration`).
- DO NOT: add a second override key shape.
- Temptation: grouping everything agent-related under one key looks tidier.

- Candidate: pin `tech.md` and `structure.md` under the spec tree whatever
  `paths.contractsDir` says.
- Reason: every reader of the contract directory resolves it through
  `paths.contractsDir` (`qfai-init.md`); the upstream contract wins (X10).
- DO NOT: hard-code `03_contract/` in a rule a relocated project reads.
- Temptation: the default path is shorter to write than the placeholder.
