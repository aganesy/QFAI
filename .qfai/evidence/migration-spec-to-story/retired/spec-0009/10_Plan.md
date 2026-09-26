# 10 Plan

## Implementation approach

1. Repository analysis module: detect test frameworks, directories, naming conventions
2. Glob pattern generator: produce include/exclude globs from analysis results
3. Config updater: apply minimal diff to `qfai.config.yaml`
4. Steering populator: fill steering files from repository evidence
5. Evidence sampler: list 5-15 matched test files for user confirmation

### Story-tree layout

The change is text in the `/qfai-configure` skill. No module is added, and the
skill introduces no architectural element. Two edits, in the order the work is
done:

1. **P6, with the assistant-tree rename.** The skill moves to
   `packages/qfai/assets/init/.qfai/assistant/skill/qfai-configure/SKILL.md`,
   and its routing step writes overrides only:
   - It reads the built-in defaults through the path
     `rule/agent-selection.md` states, and does not restate that path.
   - For each skill whose agent assignment the user asks to change, it writes
     one whole entry under `routing:` in `qfai.config.yaml`, keyed by the
     skill. For each review profile the user asks to change, it writes one
     whole entry under `reviewProfiles:`, keyed by the profile's name
     (BR-0009-0007, EX-0009-0007).
   - The write-set lines that name `.qfai/assistant/manifest/*` are replaced
     by `qfai.config.yaml`. The skill writes no routing file and no
     review-profile file.
   - The keys are the ones `.qfai/contracts/cli/qfai-init.md#configuration`
     declares. The merge that reads them belongs to spec-0015, in
     `packages/qfai/src/core/validators/agentDefinition.ts`.
2. **P7, with the cutover.** The story-tree branch of the config and steering
   steps:
   - The config step writes `paths.specsDir: .qfai/spec` only when the key is
     absent, keeps any existing value, and never writes `.qfai/specs`
     (BR-0009-0006, EX-0009-0006).
   - The steering step writes the five files BR-0009-0008 names in place of
     the four catalog files. The quality-gate commands go only into the
     Standard commands section of `<paths.contractsDir>/tech.md`, an
     unverifiable fact is written as `TBD` with the missing evidence, and
     nothing is written under `.qfai/assistant/catalog/` (BR-0009-0001,
     BR-0009-0004, EX-0009-0008).
   - This lands with the moves that create the five files
     (`qfai-init.md#the-spec-tree`). Until then the four catalog files are
     where init seeds them, and the current steering text stays.

Alternatives rejected:

- Writing the full routing into `qfai.config.yaml`. BR-0009-0007 allows only
  the changed entries, and a copied default would keep a package upgrade from
  reaching the project (BR-0015-0019).
- Writing only the changed fields of an entry. An override replaces the
  default entry whole (BR-0015-0020), so a partial entry would drop the
  default's other fields.

## Test approach

- Unit tests: glob pattern generation, config diff minimality
- Integration tests: full configure workflow from analysis to config update

### Story-tree layout

- TC-0009-0010 to TC-0009-0015 are L3 integration cases. Their oracle reads a
  product artifact: the configure `SKILL.md`, the seed templates of the five
  merged files, and the config schema in `packages/qfai/src/core/config.ts`.
  They extend `packages/qfai/tests/integration/configureSkillSpec0009.test.ts`
  rather than adding a harness, and read the skill from `skill/` once P6 has
  renamed it.
- Cases that must not share one:
  - The key absent and written as `.qfai/spec` (TC-0009-0010), and the key
    present and kept (TC-0009-0011). The second fails only when the
    instruction drops the "only when absent" condition.
  - One changed assignment written as one whole entry (TC-0009-0012), and
    nothing written under `.qfai/assistant/` (TC-0009-0013).
  - Gate commands only in the Standard commands section, with `TBD` for an
    unverifiable fact (TC-0009-0014), and the rejection side (TC-0009-0015).
- No validator rejects what TC-0009-0015 describes, so its oracle is the
  artifact that can fail. Each rejection is its own ledger row:
  - a fact in two files (TDD-0020): the five seed templates hold disjoint
    section headings;
  - a gate command in the config (TDD-0021): the config schema declares no
    gate-command key;
  - a catalog write (TDD-0022): the skill's write set names no path under
    `.qfai/assistant/catalog/`.
- Where no artifact can fail for one of its clauses, that clause is recorded as
  drift in `09_delta.md` rather than covered by a test that cannot fail.
- The E2E rows TDD-0010 to TDD-0014 are unchanged.

## NFR approach

- NFR-0002 (evidence-based) is met by sampling 5 to 15 matched test files per
  proposed glob set, and by stopping on zero matches (BR-0009-0005). A breach
  shows as a config update written after a sample outside that range, or after
  a glob that matched nothing.

### Story-tree layout

- NFR-0001 (minimal diff) is met by writing one entry per changed skill or
  profile. A breach shows as a `qfai.config.yaml` diff that holds an entry the
  user did not ask to change, after a run that changed one assignment
  (TC-0009-0012).
- NFR-0003 (non-destructive) is met by the story-tree write set:
  `qfai.config.yaml`, the five merged files and the evidence file. A breach
  shows as any file under `.qfai/assistant/`, or outside that set, changed by
  a run (TC-0009-0013, TC-0009-0015).
- NFR-0004 (steering accuracy) is met by the `TBD` rule on the five files. A
  breach shows as a fact in one of them with neither repository evidence nor a
  `TBD` naming the missing evidence (TC-0009-0014).

## Dependencies

- Requires: initialized QFAI project (`qfai init` completed)
- Consumed by: `/qfai-discussion` as the recommended next step

## Risk mitigation

- Diverse project structures may require custom glob patterns beyond automatic detection
- Mitigation: skill stops and asks when zero matches or ambiguous directories are found

### Story-tree layout

| Risk                                                                                                                                 | Likelihood / impact | Mitigation                                                                                                      | Trigger to act                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| The skill copies a whole default entry set into `qfai.config.yaml` instead of the one changed entry                                  | med / med           | The instruction states the one-entry rule and forbids copying an unchanged default; TC-0009-0012 reads it       | TC-0009-0012 finds a `routing:` or `reviewProfiles:` entry the user did not change                                           |
| The skill reads the defaults from a path the project no longer holds, once P6 stops writing the manifest files                       | med / high          | The skill cites `rule/agent-selection.md`, which states the path once, instead of restating it                  | `skillDocReferences.ts` reports a stale `manifest/agent-routing.yml` or `manifest/review-profiles.yml` citation in the skill |
| The `Owning module` cells of TDD-0015 to TDD-0020 and TDD-0022 name `skills/qfai-configure/SKILL.md`, which P6 renames               | high / low          | The P6 change repoints the seven cells in the same commit as the rename                                         | A ledger cell naming a `skills/` path after the rename commit                                                                |
| The P7 steering text reaches a project before init seeds the five merged files, so the skill writes files the tree does not hold yet | low / med           | The steering text and the file moves land in the same P7 change, and the current steering text stays until then | The skill naming `01_policy/objective.md` on a tree `qfai init` has not seeded with it                                       |
