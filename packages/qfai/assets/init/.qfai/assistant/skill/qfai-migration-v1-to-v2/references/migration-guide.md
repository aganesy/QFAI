# Move spec packs to the story tree

QFAI 2.0.0 introduces `.qfai/spec/` with policy, business-flow and contract layers.
QFAI 2.x does not read the old spec-pack layout. A project that keeps spec packs
must stay on a pinned 1.x release. To upgrade, migrate the project before using
the 2.x validation and authoring workflow.

## Prepare

1. Save the current project state in version control. Inspect custom
   `paths.specsDir` and `paths.contractsDir` in `qfai.config.yaml`; the scripts
   honor configured paths and may write there even when outside `.qfai/`.
2. Install a QFAI 2.x release as a local project dependency with the project's
   package manager. A copy available only through `npx` is insufficient.
   Complete the launcher preflight in `.qfai/assistant/rule/shared-skill-operating-baseline.md`:
   confirm the local binary or the Plug'n'Play package and loader before invoking the CLI.
3. Run `npx qfai init` from the local dependency (or `yarn exec qfai init` for Plug'n'Play), without `--force`. On an old-layout
   project it installs and links the migration skill without seeding a second
   spec tree.
4. Open `/qfai-migration-v1-to-v2`. Work from the project root. The
   installed skill is under
   `.qfai/assistant/skill/qfai-migration-v1-to-v2/`.

Do not run `npx qfai init --force` to migrate. It can write beyond the migration
scripts' allowed paths and replace local edits.

## Place stories and rules

The AI writes `.qfai/evidence/migration-spec-to-story/plan.yaml` before running
the steps. Its two lists state the decisions the scripts cannot make: which
business flow holds each old story, and which existing contract enforces each
old business rule. Flow order and story order determine the new IDs. A `from`
value identifies an old flow to continue; omit it for a new flow. Add
`criteria` when a criterion's parent story cannot be derived from the old
records. A `from` value is an exact H2 heading in the old
`_policies/04_Business-Flow.md`. For its unnamed opening flow, use the reserved
value `_policies/04_Business-Flow.md`. If `from` is omitted, the script writes a
template flow and reports that its diagram needs a person. Contract paths are
relative to the configured contracts directory.

```yaml
flows:
  - title: Place an order
    stories:
      - id: US-0001-0001
        criteria: [AC-0001-0001]
rules:
  - id: BR-0001-0001
    contract: api/orders.yaml
```

Use IDs from the old files in this plan. Assign each old story and rule at most
once. A `from` value that matches no old flow or matches several, an invalid
plan, a duplicate assignment, or a path outside the configured contract
directory stops step 4 before writing. A valid contract path with no file is
reported for a person, and its rule stays in the old file. Check the step-4 dry
run before accepting its numbering. Step 4 writes
`.qfai/evidence/migration-spec-to-story/id-map.json` once. Later steps use that
map. Once it exists, changing the plan to move or newly place a mapped item is
refused; resolve unplaced content in the new tree through `/qfai-sdd`.

## Run the bundled steps

For each row, run the script with `--dry-run`, read its operations, and then run
it without the flag. Save both complete reports and both exit codes as migration
evidence. The scripts write no report file themselves.

| Step | Script                       | Purpose                                                                                                 |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | `01-rename-directories.mjs`  | Move old owned directories entry by entry; move a colliding entry into the migration `legacy/` archive. |
| 2    | `02-merge-tables.mjs`        | Merge decisions, questions, triage and change records.                                                  |
| 3    | `03-move-catalog.mjs`        | Move policy and assistant content, archive files with no new home, and keep project overrides.          |
| 4    | `04-renumber-ids.mjs`        | Write the flow and story tree, archive old plans and test lists, and write the ID map.                  |
| 5    | `05-cases-to-examples.mjs`   | Turn old cases with no example into examples.                                                           |
| 6    | `06-derive-ac-refs.mjs`      | Give each example one criterion reference where the cases establish it.                                 |
| 7    | `07-rules-to-contracts.mjs`  | Put rules into the contracts named by the plan.                                                         |
| 8    | `08-rewrite-annotations.mjs` | Update resolvable test annotations; keep and report the rest.                                           |
| 9    | `09-repoint-links.mjs`       | Repoint host skill and agent links.                                                                     |
| 10   | `10-update-gitignore.mjs`    | Refresh the managed `.gitignore` block.                                                                 |
| 11   | `11-install-entry.mjs`       | Install the free-text entry: shipped skills, host skill links, entry directive and `.gitignore` lines.  |
| 12   | `12-check-entry.mjs`         | Check, without writing, that `npx qfai workflow start` would accept the project.                        |

Run a row from the project root in this form:

```text
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

The shared `scripts/_step.mjs` loads the locally installed package for each
script. Keep it with the twelve numbered scripts.

## Write boundary

The dry run lists the operations the real run would perform. No step makes a
network call. The scripts write only these targets:

| Target                                                                                                                                                      | Steps                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `.qfai/` and configured spec and contract paths outside it                                                                                                  | 1–7                                  |
| `qfai.config.yaml`                                                                                                                                          | 1, 3                                 |
| `QFAI:` annotation lines in test files                                                                                                                      | 8                                    |
| `.claude/skills`, `.agents/skills`, `.codex/skills`, `.github/skills`, `.claude/agents`, `.github/agents`                                                   | 9; 11 for the four skill directories |
| Managed block of `.gitignore`                                                                                                                               | 10, 11                               |
| Shipped skill directories under `.qfai/assistant/skill/`, and `.qfai/evidence/migration-spec-to-story/legacy/skill/`                                        | 11                                   |
| `AGENTS.md` and `CLAUDE.md`, only to add the entry directive, with a staging file beside each                                                               | 11                                   |
| Temporary staging inside `.qfai/evidence/migration-spec-to-story/`, configured spec, contract or test directories, or `.qfai/report/` for the managed block | 1–8, 10, 11                          |

The scripts verify ownership before clearing staging left by an interrupted
run. If a marker is incomplete or the staged bytes changed, they preserve it
for a person to inspect.

Step 12 writes nothing.

Every report contains `## Operations`. Steps 2 through 12 also contain
`## For a person`; step 5 contains `## Cases to examples`; step 8 contains
`## Annotations kept`. Empty sections say `none`. Exit 0 means the step is
complete. Exit 2 means it refused before writing; read the message and fix the
input or order. Exit 3 means the step completed but reports content that needs a
person. An unexpected failure can be retried after the cause is fixed. A
completed step is safe to run again and changes no file. If steps 1 to 10 all
report `none` on a project already using the story tree, there is nothing to
migrate; run steps 11 and 12 all the same.

Immediately after step 3, confirm the complete old `_policies/11_Slice-Policy.md`
is archived under `retired/_policies/` and none of its sections was copied to
`principle.md`. Current triage operations and ID allocation are in the shipped
`qfai-sdd/references/sdd-triage.md`. Read `objective.md`, `initiative.md`, `principle.md`,
`tech.md` and `structure.md`. Remove facts repeated in different words. The
scripts remove byte-identical repeats; a person must judge paraphrases. Quality
gate commands have one home: the Standard commands section of `tech.md`.

## Resolve the reports

Keep all files moved to `.qfai/evidence/migration-spec-to-story/legacy/` or
`retired/` until their content is accounted for. Nothing is silently discarded.
Resolve each `## For a person` row using its file path and reason. Common cases
include a story without a flow, a rule without an enforcing contract, an example
without exactly one criterion, an unresolved annotation, an applicable
non-functional requirement, and a catalog overlay without a matching rule. A
migrated test case with no previous example appears
under `## Cases to examples` or `## For a person`; check that none is missing.

Step 8 changes test-case annotations to example annotations where the ID map
resolves them. It changes an old user-story annotation to a business-flow
annotation only in an E2E test. Contract annotations, unresolved annotations
and old deferral markers stay in place and are reported. Step 9 changes only the
host integration links. Step 10 changes only the managed `.gitignore` block.

## Install and check the free-text entry

Step 11 makes each skill directory the package ships equal to the installed
package's copy. A copy the project changed is first moved whole to
`.qfai/evidence/migration-spec-to-story/legacy/skill/<id>/`; nothing is
deleted. Where that archive already holds a different copy, both stay as they
are and the pair is reported for a person: keep the copy you need, delete the
other, and run step 11 again. A skill the package does not ship and
`.qfai/assistant/skill.local/` are left alone. Step 11 also adds each missing
host skill link, the entry directive at the top of `AGENTS.md` and `CLAUDE.md`,
and the `.qfai/run/` and `!.qfai/evidence/workflow/` lines of the managed
`.gitignore` block. A path it cannot write is reported with the reason.

Step 12 makes the checks `npx qfai workflow start` makes on the project,
without starting a run, and checks what step 11 installs. Each failed check is
reported by name:

| Check                 | Fails when                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `contract-undeclared` | A skill a built-in plan names is missing, or its Operations table lacks an operation a plan uses |
| `reviewer-missing`    | A `routing:` override in `qfai.config.yaml` drops a reviewer the package's default routing needs |
| `invalid-mode`        | `workflow.mode` is set to anything other than `active`, `shadow` or `off`                        |
| `entry-directive`     | `AGENTS.md` or `CLAUDE.md` lacks the entry directive                                             |
| `gitignore`           | The managed `.gitignore` block lacks `.qfai/run/` or `!.qfai/evidence/workflow/`                 |
| `qfai-run-link`       | A host skill directory has no link to `.qfai/assistant/skill/qfai-run/`                          |

Run step 11 again for what it installs. A routing override belongs to the
project, so its owner decides whether to restore the reviewer. Rerun step 12
until it exits 0.

After step 12, run `npx qfai validate` from the local dependency (or `yarn exec qfai validate` for Plug'n'Play). Resolve every
layout and chain error. Its test-obligation findings identify any business
flow, acceptance criterion or example still missing a test in its layer. E2E
tests cover flows, integration and API tests cover criteria, and other tests
cover examples. Record a permitted exception in `decisions.md` when a test is
intentionally absent.

Then send the project's first free-text change request to the `qfai-run`
skill. The entry directive step 11 added points agents there.

A migration begun under the skill's earlier name,
`qfai-migration-spec-to-story`, continues from the step it reached: the plan,
the ID map and the archives stay under
`.qfai/evidence/migration-spec-to-story/`.

## Former migration memos

QFAI 2.0.0 has no `.qfai/assistant/process/` directory, and `npx qfai init` writes
no migration memo. Step 3 moves the memos a 1.x release wrote to
`.qfai/assistant/process/migrations/` into
`.qfai/evidence/migration-spec-to-story/retired/assistant/process/migrations/`.
Nothing reads them after that. Keep them as a record, or delete them once the
migration is committed.

The upgrade notes for each release are in the QFAI changelog, under that
release's heading. The memos announced deprecation windows, and every one of
them closed at 1.10.0. A project upgrading from an earlier release meets these
forms as errors for the first time:

| Old form                                                             | Current form                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `playwright-cli` as the browser wrapper or `prototyping.browserTool` | `playwright`                                                                               |
| A reader of `.qfai/output/validate.json`                             | `.qfai/report/validate-<profile>.json`, or `.qfai/report/validate.json` for the latest run |
| A hand-written, per-skill handoff file                               | The canonical `handoff.yaml`. `npx qfai handoff upgrade <legacy-file>` converts one        |
