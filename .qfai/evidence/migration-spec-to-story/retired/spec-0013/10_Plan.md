# 10 Plan

## Implementation approach

1. Discussion-pack preflight: validate latest pack readiness
2. Contract-first phase: create/update `.qfai/contracts/(api|db|ui)/**`
3. Outline phase: generate `_policies/01..10` layered artifacts
4. Slice phase: generate `spec-XXXX/01..08` with slice gate enforcement
5. Plan phase: finalize `spec-XXXX/10_Plan.md` after slice gate pass
6. Delta phase: update `spec-XXXX/09_delta.md` with rejected guardrails
7. Validate gate: run `qfai validate --fail-on error` until error=0
8. Density review: triage `QFAI-COV-207` warnings

### Story-tree layout

This spec changes skill text only. It adds no architectural element and no
code module. The skill reaches the code only through `qfai validate`, whose
story-tree families rest on elements from spec-0001's plan:

- E1, the layout and ID grammar
- E2, the story-tree reader
- E3, the decisions and open-questions rows

`--flow` rests on E4, the flow scope, in spec-0004's plan. This plan cites
those elements and does not restate them.

The work runs in three steps of the work order.

1. **P2: templates.**
   - The story-tree templates and their schemas land under spec-0001's mdschema
     row, in
     `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/spec/`.
   - This skill owns their content (BR-0013-0022). Its own rows read them from
     P7.
2. **P6: assistant tree.**
   - `change-classification.md` moves to `.qfai/assistant/rule/`, and
     `requirements-decomposition.md` to `<paths.skillsDir>/qfai-sdd/references/`
     (BR-0013-0033).
   - Every citation of either file in the skill is updated in the same commit.
     Today they are in `references/spec-traceability-rules.md`,
     `templates/specs/spec/04_Business-Rules.md` and
     `templates/specs/spec/09_delta.md`.
   - `packages/qfai/src/core/validators/skillDocReferences.ts` gains the two
     stale `constitution/` paths as patterns (TC-0013-0056).
3. **P7: the skill rewrite, inside the cutover.** `SKILL.md` and its
   references state the story tree only. X1 drops the spec-pack clause in the
   commit that lands the target.
   - Concrete-first order: `01_policy/`, `02_business-flow/`, the stories, then
     `03_contract/` with its BRs. A BR cites only EXs already written
     (BR-0013-0021).
   - Every tree file is written from its template. A story directory holds three
     files, and every contract file gets its `contracts.md` row in the same change
     (BR-0013-0022 to 0024).
   - Records are rows of `decisions.md` and `open-questions.md` (BR-0013-0025,
     0026). `templates/change-request.md` and
     `references/spec-traceability-rules.md` stop naming `.qfai/decisions/`.
   - The five merged files state each fact once, and the gate commands live only
     in `tech.md` (BR-0013-0027).
   - IDs are the highest in their scope plus one, stated as a rule the skill
     follows (BR-0013-0028). The same rule in code is E1's `nextId`, which serves
     migration and spec-0001's unit cases. The skill calls no command.
   - Rules are written inside contracts, and a shared rule is defined once
     (BR-0013-0029, 0030).
   - Edges become BF → US → AC → EX ← BR. The EX-to-AC and BR-to-EX families of
     `qfai validate --profile sdd` enforce them (BR-0013-0031, 0032).
   - Each flow is gated with `--flow BF-NNNN` (BR-0013-0034). The per-spec
     `--spec` gate leaves `SKILL.md` and `references/review-cycle-playbook.md`.
   - The REMOVE rows land:
     - the spec-pack phases, capability batch mode, capability-keyed
       auto-discovery and `spec-XXXX` generation retire;
     - US-0013-0013 retires with its AC, BR, EX and TC, and ledger rows TDD-0025
       and TDD-0026 are tombstoned.

     The spec-pack references are rewritten or removed with them:
     `sdd-execution-playbook.md`, `sdd-phase-checklists.md`,
     `spec-traceability-rules.md` and `sdd-triage.md`.

Four test cases say "fails the check" but no finding family owns the check
(P3-D11). Each is tested by an oracle over the product artifact that states the
rule, and each artifact can fail:

| Row      | Case                                                                            | Oracle                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-0046 | TC-0013-0037, Contracts-first on the story tree                                 | Scans `SKILL.md`, `references/**` and `templates/**` under `packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/` line by line, case-insensitive, and reports file, line and matched text. It fails on any of `/Contracts-first is mandatory/`, `/Phase 0[\s:(\-–]*Contracts-first/` and `/Contracts-first\s*(?:->\|→)/`. Today it fails on `SKILL.md` lines 38, 248, 295, 329, 456 and 494, and on lines in five `references/` files and two `templates/` files |
| TDD-0057 | TC-0013-0044, a record file under `.qfai/decisions/`                            | Reads `SKILL.md`, `references/` and `templates/`. It fails on any path or instruction that writes under `.qfai/decisions/`, which two files still hold today                                                                                                                                                                                                                                                                                                          |
| TDD-0059 | TC-0013-0046, a gate command in one of the other four merged files              | Reads the `objective.md`, `initiative.md`, `principle.md` and `structure.md` templates, one selector entry each. It fails on a gate command listed in the `tech.md` template's Standard commands section that also appears in that file. It shares its oracle with TC-0001-0043                                                                                                                                                                                       |
| TDD-0078 | TC-0013-0046, a gate command in `tech.md` outside its Standard commands section | Reads the `tech.md` template. It fails on a gate command outside its Standard commands section                                                                                                                                                                                                                                                                                                                                                                        |
| TDD-0065 | TC-0013-0050, a separate rules file                                             | Scans the same files the same way. It fails on a file under `templates/` whose name matches `/Business-Rules/`, today `templates/specs/spec/04_Business-Rules.md`, and on the literal `04_Business-Rules.md` on any scanned line                                                                                                                                                                                                                                      |

No finding family is added for these cases (X12). The TC wording, "the check",
is recorded as drift and left as written (X11).

Two more test cases say "fails the check", and a finding family owns each:

| Row      | Case                                                      | Finding family                                                                                                                                                                        |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-0066 | TC-0013-0051, a shared rule restated in a second contract | The ID-grammar family's duplicate-ID error (`qfai-validate.md#finding-families`): the restated rule's BR ID is defined in both contracts, and the finding names the ID and both files |
| TDD-0075 | TC-0013-0056, a stale `constitution/` citation            | `packages/qfai/src/core/validators/skillDocReferences.ts`, which gains the two stale `constitution/` paths as patterns at P6 and reports the citing file                              |

Alternatives rejected:

| Alternative                                          | Why not                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A `qfai` command the skill calls to allocate IDs     | No command was asked for, and a local allocator still cannot see another branch. Collisions surface as a git conflict or as the duplicate-ID error (OQ-0173) |
| A rules file beside the contracts                    | One definition per rule, in the contract that enforces it (BR-0013-0029; OQ-0176)                                                                            |
| Keeping `--spec` beside `--flow` in the skill's gate | On a story tree `--spec` exits 2 (Q2)                                                                                                                        |
| New validator families for the four rows above       | No contract lists them, and none was asked for (X12)                                                                                                         |

## Test approach

- Unit tests: reference direction enforcement, required edge detection, contract index alignment
- Integration tests: phase order enforcement, slice gate validation, validate gate
- E2E tests: full SDD workflow from discussion pack to validate pass

### Story-tree layout

Every new case is L3, in `packages/qfai/tests/integration/`. No case sits at L1,
L2 or L4: the rows are either skill text or the `qfai validate` command. The E2E
story rows keep their form.

- **Skill-text cases** read the shipped `SKILL.md`, `references/` and templates
  the way `sddSkillSpec0013.test.ts` does. Rows TDD-0044, 0046, 0047, 0052,
  0057 to 0063, 0065, 0074, 0076, 0077 and 0078.
  - The allocation rows (TDD-0060 to 0062) check that the skill states the scope
    of each kind and the retired-ID rule of BR-0013-0028.
  - The arithmetic is proven by spec-0001's L1 cases on `nextId` (TC-0001-0060,
    0097).
- **Validator-backed cases** run `qfai validate --profile sdd` in-process on a
  `mkdtemp` story tree built from the shipped templates. Each asserts the
  finding family, the file and the ID.
  - The row-rewritten rows (TDD-0055, 0056) build a git repository with a base
    commit.
  - The Mermaid row (TDD-0050) runs `check-mdschema.mjs` on a `business-flow.md`
    with no diagram.
  - TDD-0077 also runs `qfai validate --spec` on the tree and expects exit 2
    naming `--flow`. That behaviour is spec-0004's.

Every boundary already has a ledger row of its own, named in the `Boundary`
column:

- `br-cites-unwritten-ex`
- `contracts-first-mandatory-on-story-tree`
- the story-directory extras
- the table shapes
- `row-cell-rewritten` and `row-removed`
- `file-under-decisions-dir`
- `empty-scope-start` and `retired-id-not-reissued`
- `rule-without-examples` and `separate-rules-file`
- the three EX-to-AC and three BR-to-EX breaks

The ATDD and implement passes of this change write these cases before it merges
(P3-C1).

## NFR approach

- **NFR-0001.** On the story tree the order is concrete-first: `01_policy/`,
  `02_business-flow/`, the stories, then `03_contract/`.
  - Breach: TDD-0044 fails on the step order in `SKILL.md`, or a BR citing an
    unwritten EX passes `qfai validate` (TDD-0045).
- **NFR-0002.** The spec-pack reference-direction rule retires at P7 with the
  US-0001-0005 chain (Q3). On the story tree, an ID is declared only where
  BR-0001-0039 puts it, so a policy or index file only cites.
  - Breach: the ID-grammar family reports a duplicate declaration whose second
    site is in `01_policy/` or an index file of the sample tree. That means a
    citation was counted as a declaration (TC-0001-0061).
- **NFR-0003.** Required edges are BF → US → AC → EX ← BR.
  - Breach: an EX-to-AC or BR-to-EX finding on the sample tree, or TDD-0067
    failing.
- **NFR-0004.** The gate runs once per flow, as `--flow BF-NNNN`.
  - Breach: TDD-0076 or 0077 fails, or `--spec` appears in the shipped
    `qfai-sdd` tree after P7.
- **NFR-0005.** Every contract file has its `contracts.md` row.
  - Breach: an unlisted-contract finding on the sample tree (TDD-0051).
- **NFR-0006.** Each `business-flow.md` carries a Mermaid diagram.
  - Breach: `pnpm lint:mdschema` passes a `business-flow.md` with no diagram
    (TDD-0050), or `pnpm lint:mermaid` fails on the sample tree.

## Dependencies

- Requires: discussion pack from `/qfai-discussion`
- Consumed by: `/qfai-prototyping` or `/qfai-atdd` as next steps

### Story-tree layout

- **spec-0001**: the layout, the ID grammar, the templates and their schemas.
  Its plan holds E1 to E3.
- **spec-0004**: the finding families the gate reports, `--flow`, and `--spec`
  exiting 2 on a story tree.
- **spec-0003**: init seeds the tree from the same templates. Its template
  REMOVE row deletes `templates/specs/`.
- **spec-0009**: `/qfai-configure` writes the same five merged files under the
  same one-fact-one-home rule.

## Risk mitigation

- Large batch mode may exceed context limits for multi-spec projects
- Mitigation: parallel delegation per spec with shared gate at batch tail

### Story-tree layout

| Risk                                                                                                                      | Likelihood / impact | Mitigation                                                                                                                 | Trigger to act                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A "fails the check" row passes whatever the artifact says (TDD-0046, 0057, 0059, 0065, 0078)                              | medium / medium     | Each oracle reads the named product artifact. A row whose artifact cannot fail gets no test and is recorded as drift (X11) | The case still passes after its artifact is edited to break the rule                              |
| `--spec` survives in a `qfai-sdd` file after P7, and the skill's own gate exits 2 on a story tree                         | medium / high       | TDD-0077's oracle reads `SKILL.md` and every file under `references/`                                                      | A grep of the shipped `qfai-sdd` tree for `--spec` is non-empty after P7                          |
| A `constitution/` citation survives P6 in a template that lives until P7                                                  | medium / low        | The P6 commit updates all three citing files and adds the stale patterns to `skillDocReferences.ts`                        | `skillDocReferences.ts` reports a stale pattern, or TDD-0075 fails, after P6                      |
| The skill's allocation rule and E1's `nextId` drift apart                                                                 | low / medium        | TDD-0060 to 0062 hold the skill text to BR-0013-0028, and spec-0001's L1 cases hold `nextId` to BR-0001-0038               | One of the two rules changes without the other                                                    |
| The spec-pack text of this plan, the numbered phases and the test bullets above, reads as current after P7                | medium / low        | The P7 commit that lands the REMOVE rows takes that text out                                                               | This plan names Contracts-first or `_policies/01..10` after P7                                    |
| E2E row TDD-0042 is keyed to US-0013-0013, which the REMOVE row retires, and is not among the rows listed for tombstoning | high / low          | The Phase 4 delta lists TDD-0042 with TDD-0025 and TDD-0026 (X3)                                                           | After P7 the ledger holds a row whose `US-Refs` names US-0013-0013                                |
| The new L3 cases raise `QFAI-ATDD-111` and `QFAI-ATDD-112` in the dogfood lanes while they are `todo`                     | high / medium       | The ATDD and implement passes of this change write them before it merges, so no pin is added (P3-C1)                       | A dogfood lane reports `QFAI-ATDD-111` or `QFAI-ATDD-112` naming spec-0013 on the merge candidate |

## v1.8.1 Implementation Notes

- Discussion readiness gate: `packages/qfai/src/core/preflight/sddPreflight.ts` — blockers are derived from required markdown readiness and blocking OQ state
- Optional side artifacts: `packages/qfai/src/core/discussionPack.ts` retains `missingSideArtifacts` only as a compatibility-shaped empty array
- Current sync reflects the removal of required prototyping side artifacts from preflight.

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0013-0018 per AC-0013-0018..0019:
  1. UI spec template `templates/contracts/ui-contract.sample.yaml` gets a `primary_tasks: []` slot per `screens[]` entry.
  2. `requirements-analyst` agent guide instructs authoring ≥ 1 `primary_task` per screen during SDD Phase 2 Slice.
  3. New validate lane (QFAI-AUD-001 aligned) blocks `/qfai-prototyping` from proceeding when any contracted screen has empty `primary_tasks`.
- Cross-spec coupling: validator implementation lives in spec-0004 territory; the template + author guide are spec-0013 territory.

## v1.9.2 Second-Wave — How

- Active pointer reader (REQ-0155 / DR-0266): add a single helper that reads `.qfai/state.json#discussion.currentId` (writer in spec-0010); downstream `/qfai-sdd` skills resolve the active pack through it. Reject absent/missing/duplicate with an error naming candidate `discussion-*` dirs + `qfai discussion use <id>`. No mtime inference.
- `surface_type` auto-population (REQ-0163): add a `/qfai-sdd` SKILL.md step that sets `surface_type: ui-bearing` frontmatter for every spec with a `.qfai/contracts/ui/<spec>-*.yaml` companion; `qfai sdd lint` emits `D-SURFACE-TYPE-MISSING` (warning during the window, sunsets to error). `resolveAllUiBearingSpecs()` keeps requiring the frontmatter as the strict signal.
- `primary_tasks` band + shape (REQ-0164 / DR-0267 / DR-0268): document band 3..7 in `templates/contracts/ui-spec.yaml` comments and `references/ui-contract-guide.md`; `QFAI-AUD-020` warning text names the band; `auditProfile.ts` accepts string-only AND structured `{id,label,acceptance}` (all-required, closed) items during the window. Validator-implementation side is shared with spec-0004 (Source REQ-0164); this slice owns the SDD authoring + doc + template surface.
