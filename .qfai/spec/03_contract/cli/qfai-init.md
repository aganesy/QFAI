# CLI Contract: `qfai init`

- Contract scope: public CLI surface for project initialization and assistant-tree upgrade
- Owning spec: `spec-0003`
- Used-by: `spec-0003`, `spec-0004` (path SSOT consumer), `spec-0011`, `spec-0014`
- SSOT modules:
  - `packages/qfai/src/cli/commands/init.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/cli/lib/fs.ts` (asset mirror copier via
    `copyTemplateTree` / `copyTemplatePaths`; also carries the create-only vs
    `--force` overwrite policy. Note: `core/validators/assistantAssets.ts` is a
    validator, not the copier)
- Companion contracts:
  - `.qfai/contracts/cli/worklog-entry.schema.md` — the work-log entry schema
    this command seeds
  - `.qfai/contracts/cli/shipped-workflows.md` — the ownership boundary,
    provenance record and file-state enum for the GitHub Actions workflows this
    command writes into an adopter's `.github/workflows/`

## Public sub-commands

### `qfai init [--upgrade-assistant-tree]`

Initializes or upgrades the QFAI surface inside a consuming project.

#### Default (no flag)

Seeds a fresh consuming-project tree from the embedded assets. Required outputs are:

- `.qfai/spec/` with the singleton policy, decision, question, business-flow and contract files listed under [The spec tree](#the-spec-tree). These are create-only, including under `--force`.
- `.qfai/assistant/rule/**`, `.qfai/assistant/skill/**`, `.qfai/assistant/agent/**` and `.qfai/assistant/prompt/**`. Shipped skills and agents are regenerated under `--force`; edited rules follow the provenance policy.
- `.qfai/steering/.gitkeep` and `.qfai/steering/_template/entry.md`.
- Host integration links to the canonical skill and agent files.

Init writes no `README.md` or assistant `manifest/`, `catalog/`, `constitution/` or `process/` tree. It does not write routing or review-profile YAML into a project. Their defaults are loaded from the installed package and project overrides live in `qfai.config.yaml`.

The steering seed is create-only, including under `--force`. When an existing `_template/entry.md` differs from the current seed, init reports its first differing line and both line counts; line endings do not count as drift. An unreadable, non-regular or oversized seed is reported as incomparable. User-authored `.qfai/steering/*.md` entries are never overwritten. An old assistant `README.md` is removed only when its entire body still matches the former generated signature.

#### Reminder hooks

The `.claude/settings.json` hook groups carry no message text. Each entry runs
`node -e` with one fixed reader, the path
`${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json` and the key of one
message. The reader prints that message and nothing else. A missing or
unreadable file, or a missing key, prints nothing and exits 0.

`.agents/rules/reminders.json` is refreshed the way a rule master is: on every
run, wherever the project's copy still matches what init last recorded. A
changed message therefore reaches an existing project without the settings
template changing.

Existing groups are recognized by their sorted status-message list within the
same event, including repeated markers. For each group whose identity the
template also declares:

| The project's group                                | Ordinary init and `--force`                           |
| -------------------------------------------------- | ----------------------------------------------------- |
| Equal to the template's group                      | Left as it is                                         |
| Exactly a group an earlier release's template held | Replaced in place by the template's group             |
| Anything else                                      | Left as it is, and named in the output as edited here |

A template group whose identity the project does not carry is appended after the
project's groups for that event. Nothing is reordered or removed.

To update an edited group by hand, obtain a fresh settings file with the
installed release's `qfai init --dir <scratch-dir>` in an unused scratch
directory, and compare the group with the same event and marker list.

Exit codes:

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| 0    | Initialization completed. An old spec layout may still need migration. |
| 2    | Invalid command arguments.                                             |
| 64   | A required file or directory could not be read or written.             |

#### `--force` (asset regeneration)

`--force` refreshes shipped `assistant/skill/**` and `assistant/agent/**`, generated wrappers and files that the provenance record still identifies as unedited. It preserves the story tree, steering entries, rule overlays and project routing or review-profile overrides. It does not write an assistant manifest or merge routing YAML.

#### `--upgrade-assistant-tree`

This helper copies known files from `.qfai/assistant/instructions/` and `.qfai/assistant/steering/` to their singular `rule/` or skill `references/` destinations. It does not copy unknown files, the four adopter-owned catalog documents or an assistant manifest. It never deletes a legacy file or overwrites an existing destination. A destination already present is reported as preserved.

The helper then runs the ordinary init flow. A clean working tree makes its changes reviewable but is not a precondition. `--force` may be combined with this flag and retains its documented regeneration scope. A relocation I/O error exits 64 and leaves the source file in place.

## Constitution and safety-floor compatibility

The constitution is installed or refreshed only when the complete regular file
`.agents/rules/minimal-implementation.md` matches the shipped master. Only
line-ending differences are ignored. Other edits remain protected and require
a manual merge of the rule and constitution. A matching substring is not
authorization: Markdown outside § 2 can make the floor non-operative.

A missing, unreadable or non-regular master, including a leaf symlink or linked
`.agents` / `.agents/rules` parent, cannot
authorize the upgrade. Init keeps the previous constitution and its receipt,
and reports that the shipped master could not be verified. A first init in that
state does not install the constitution or record it as written.
For an absent constitution, preserve master edits by manually installing and
reconciling the constitution. Automatic installation requires backing up
customizations and restoring the exact shipped master before rerunning init.
An existing constitution requires a manual merge of both files; the note does
not request a force rewrite of unrelated adopter assets.

The governed writer rechecks the master after the other template copies and
the destination hash. The generic template copier excludes both governed
layers; every missing governed asset uses the exclusive staging writer.
The check is not an atomic filesystem transaction with the write.

A dry run includes the constitution when the same plan would create or update
its compatible rule master under unlinked parents. A planned write through a
linked parent cannot authorize the preview. It writes neither file.

Creating missing governed assets, including publication after a forced occupant
repair, requires hard-link support and permission.
An uninspectable force-repair candidate stops the run with its original cause
before copies, migration or repair.
Init first verifies the complete readable shipped governed set. Failure stops
before any copy or migration and asks the user to restore or reinstall QFAI.
Before any asset copy or migration, init probes the nearest existing directory
for each eligible absent governed path or force-repaired unreadable occupant.
It removes only its own probe files.
The creation handle pins the probe's device and inode. Before each removal,
init rechecks the no-follow identity. A changed or unverifiable occupant is
preserved and aborts initialization with inspection guidance, not a deletion
instruction. Metadata verification and removal are not an atomic transaction.
If removal fails, init attempts the remaining owned cleanup, reports every
retained probe path and aborts before copying or migrating package assets.
Restore access and remove only the reported probe files before retrying.
A failed probe creation or link check aborts with the affected directory,
write-access and hard-link recovery guidance, and preserves existing assets;
it never falls back to a partial final-path copy or an overwriting rename.
Existing readable regular governed files and a constitution deferred by an
edited safety master need no creation probe. Dry runs perform no probe or writes.
The check cannot prevent a filesystem or permission change later in the run.

If cleanup fails after exclusive publication, init keeps the complete published
file and its receipt. It reports the staging path and asks the user to restore
access, remove only that staging file and rerun init. The published file is not
removed or rewritten to clean up its hard-link alias.
If exclusive publication loses a creation race and staging cleanup fails,
init reports that retained staging path before propagating the original write
error. Accepting a concurrent destination never hides this cleanup warning.

The exclusive creation handle also pins the publication stage's device and
inode. It writes complete bytes and applies the shipped permission bits through
that handle, independently of the creator's umask. The writer verifies the
stage's no-follow identity before publication and the destination's identity
immediately after linking. A changed destination follows the protected
concurrent-content path, not a successful-copy classification. Before recording
a successful shipped write, init also verifies the destination's canonical bytes.
Neither check authorizes overwriting concurrent content. The writer closes
the handle before unlinking the staging name and rechecks ownership immediately
before cleanup on either outcome. A close failure retains the stage for manual
cleanup after the handle is closed.
A changed or unverifiable stage remains untouched and is reported with
ownership-inspection guidance, never an instruction to delete its replacement.
When inspection fails, that warning retains the original error reason.
Identity verification and pathname removal are not an atomic transaction.
Metadata and close failures remain available. Every created handle has a close
attempt, and a close failure propagates rather than authorizing unlink.
Stage-creation failures retain their cause and stop initialization. An occupied
stage is not evidence that another process created the final governed file.
Existing canonical governed assets are reported as skipped, including their
paths under `--verbose`. Their bytes and provenance classification are unchanged.

## Shipped GitHub Actions workflows

`qfai init` writes the shipped workflow set into `<root>/.github/workflows/`.
The ownership boundary over that directory — the reserved `qfai-` filename
prefix, the in-binary write and prune name lists, the provenance record, and
the closed `absent` / `adopter-owned` / `installed` / `modified` / `declined`
file-state enum — is specified once in
`.qfai/contracts/cli/shipped-workflows.md` and is not restated here.

The obligations that are specific to this command:

- The shipped root tree is copied **create-only**. The `force: false` literal at
  the `copyTemplateTree(rootAssets, destRoot, …)` call site is load-bearing for
  the ownership contract and is not lifted to `options.force`. `--force`
  reaches shipped `assistant/skill/**`, `assistant/agent/**` and generated
  integration wrappers — never the shipped root tree, so no workflow file in
  `.github/workflows/` is written or rewritten by it.
- A name in the `declined` state is removed from the copy set **before** the
  copy runs. Create-only alone does not cover it: the file is absent, so
  create-only would write it.
- After each successful write of a shipped workflow name, init records the
  provenance entry defined by that contract. A skipped file records nothing.
- Removal on that directory goes through `pruneMatchingEntries` with a
  predicate that is **name-set membership over the retired-name list** — never
  `entry.name.startsWith("qfai-")`. The three existing prefix-scoped pruners in
  `pruneStaleQfaiWrappers` cover generated wrapper directories QFAI owns
  entirely; `.github/workflows/` is adopter-authored and is not one of them.
- Running init twice into the same tree writes nothing and changes no
  provenance entry, except for the missing rule citations or review directive
  described below.

### Rule citations in an existing entry point

Create-only leaves an `AGENTS.md`, a `CLAUDE.md` or a
`.github/copilot-instructions.md` the project already has. A rule master the
same run writes into `.agents/rules/` would then be cited by nothing, so init
adds one bullet for it and only for it.

**What it may change.** One bullet line per rule master the run's own copy
report says it wrote, lifted from the shipped template rather than composed,
inserted after the last rule bullet — inside the managed markers where the file
has them, and anywhere in the list where it does not, because the Copilot file
is generated whole and carries none.

It may also replace a rule summary a release wrote that a later template
rewords. The line qualifies only when its own text, less a trailing CR, is
exactly a spelling that shipped; it takes the template's bullet for the same
master and keeps its terminator. It applies inside the markers, and in the
Copilot file only under its `## Cross-AI rules (master)` heading, up to the next
heading of the same or a higher level; elsewhere in that file a matching line is
the project's. The master a summary describes is refreshed wherever the project
has not edited it, and a summary left at the older wording would contradict it.
A line with any other text — reworded, indented, quoted — is the project's. Both
edits land in one write, and the report names each.

Init also adds the shipped review directive to `AGENTS.md` and `CLAUDE.md`
when no operative copy exists. It asks agents to read `REVIEW.md` before
reviewing or writing a PR description, only when the project has that file.
Init does not create `REVIEW.md`. The directive is prepended so an unfinished
example or comment cannot hide it. Existing text and line endings are preserved.

**What it may not.** Anything else in the file. A bullet the project deleted is
not restored, because that master's file is on disk and the copy skips it.
Prose the project wrote inside the section survives. The heading is never
duplicated: an existing section is edited in place, and the append path is for a
file that has no section at all.

**A file with no markers that cites rules anyway** was wired in by hand. The
masters it does not name go into the list it keeps, one bullet each; the section
is not appended on top, which would restate every citation the file already has.
Nothing records a bullet as removed there, so an uncited master is one the file
never named. Where the citations are not a bullet list a line can be added to —
prose, a numbered list — the run names the masters to add without inserting
rule bullets. It may still add the missing review directive.

**What it refuses, naming the file and the reason.** A symbolic link at the
target or at any path component below the destination root, a hard link with
more than one name, a file whose bytes are not valid UTF-8, and a file that
changed between the read and the write. The append path refuses the same four:
it writes to the same file, and a link there reaches whatever it points at. An
unreadable Copilot file is reported and skipped rather than failing the run.

**What it reports and leaves alone.** A file carrying the begin marker without
the end marker. It reads as connected, so nothing appends the section, and there
is no closed region to insert a citation into — the run names the missing marker
instead, because a silent skip leaves the rule uncited and gives the next run no
reason to look at the file again.

**How it writes.** The merged text is staged beside the target and renamed over
it, so an interrupted write leaves the adopter's file as it was. The staging
file is created owner-only and takes the target's own mode before the rename: a
file the project kept to itself is not published by being rewritten. Where the
run does not already own the file, it restores the owner too, and refuses the
write when it cannot — a renamed file owned by whoever ran init is one its owner
may no longer edit.

The walk that refuses a linked path component runs again immediately before the
rename, and so does the comparison with the bytes that were read: a parent
replaced in between would have the write land wherever it now points, and a save
in between would be replaced by a merge of the contents before it. Both are
checks rather than locks, and what they buy is a window of one statement.

**What a fenced block is.** An example, wherever it sits — a block quote's `>`
prefix does not hide it, and a fence opened inside one ends where the quote
does. Neither a rule path nor a managed marker inside one is
read as live: the file is not hand-wired by it, the example is not mistaken for
the section, and nothing is written into it.

**What a bullet is.** The whole list item, continuation lines included. A
citation is added after the last of them, so the project's own explanation stays
under the bullet it explains.

A staging file an earlier run was killed before renaming is removed at the start
of the next one. Two things bound that: the name has to be one the writer could
have produced — the prefix, a version 4 identifier, the suffix — and the file has
to have sat still for an hour, so a second init running now keeps the file it is
about to rename.

**What it reads.** The Copilot file belongs to the adopter, so it is opened
once, refused unless it is an ordinary file, and read to a ceiling. A larger one
is left alone rather than buffered and decoded whole for the sake of one line,
and is reported when the run has a citation to add. With none, only a summary
could be out of date, and a warning on every run about a file that may need
nothing is noise. A file carrying no rule list to add a line to — a project that
wrote its own instructions — is reported too, naming the masters: the wrapper
sync skips an existing file, so nothing else will carry them.

**Under `--force` the Copilot file belongs to the wrapper sync**, which writes it
whole from the same source later in the run. Nothing is added to it or replaced
in it here, and no refusal is reported for it, because a refusal would name a
file this run goes on to replace.

**What a refusal keeps.** The masters it could not cite. A master this run copied
is one no later copy offers again, because the file is on disk and the next copy
skips it. So a refused rewrite records those masters for its entry point in
`.agents/rules/.qfai-citations.pending.json`, and the refusal says they are
kept. A later run cites every recorded master still on disk once the file can
be rewritten, and clears that entry point from the record when they land.

| Refused because                                                                                                                       | Recorded under                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| The entry point is a symbolic or hard link, cannot be read back, holds bytes that are not UTF-8, or changed while the run was writing | that entry point                  |
| `.github/copilot-instructions.md` is not an ordinary file, or is past the read ceiling                                                | `.github/copilot-instructions.md` |

Only a recorded master is retried. A bullet the project deleted, with its master
still on disk, was never recorded and stays deleted. A dry run records nothing.
An out-of-date summary needs no record: it is still in the file, so the next run
finds it again. Where the refusal asks for an edit by hand, it names the edit it
refused.

**A rule the project deleted stays deleted.** `.agents/rules/.qfai-rules.lock.json`
records, per master, the hash of what `init` last wrote there. A master with an
entry in that record and no file on disk is one an earlier run wrote and the
project removed, so the run copies neither it nor its citation, and names it on
stderr. A master with no entry is a rule shipped for the first time and arrives
as before.

`--force` does not restore one. It rewrites what the project has; it is not a
request to reinstate what the project removed. The way back is to delete the
master's entry from that record, which puts it in the same position as a rule
shipped today.

The record began after some projects had already run `init`, so a master it does
not name is treated as the adopter's — the same conservative side the update
path takes. Deleting such a master gets it back once, and the run that restores
it records it, so the next deletion holds.

Reporting drift on an already-installed shipped workflow is **not** this
command's job — it belongs to `qfai doctor`
(`.qfai/contracts/cli/qfai-doctor.md` §`workflows.integrity`). `qfai init`
stays silent about a `modified` file; it skips it like any other existing file.

## Path SSOT enforcement

Both `init` and `validate` use `packages/qfai/src/core/paths/assistantPaths.ts` for canonical assistant-tree paths. Its layer enum is `rule`, `skill`, `agent` and `prompt`.

## Deprecation window

Old assistant paths under `instructions/` and `steering/` are migration inputs only. Init reports their presence and offers `--upgrade-assistant-tree`; ordinary readers use the singular tree. The helper remains additive, so a retained old path may still require a person to remove it after reviewing its content.

## Distributed-surface obligations

The seeded `.qfai/steering/_template/entry.md` MUST pass `packages/qfai/scripts/check-no-internal-version-leakage.sh`. The work-log surface itself (`.qfai/steering/`) is not shipped in `packages/qfai/package.json#files`.

The seeded body is not a static asset. `buildProjectSteeringEntryTemplate` in `packages/qfai/src/cli/commands/init.ts` builds it in TypeScript, taking the `status` enum from `WORKLOG_ENTRY_STATUSES` and the mandatory handoff headings from `HANDOFF_REQUIRED_SECTIONS` (`packages/qfai/src/core/paths/assistantPaths.ts`), so neither list can drift from the validator; the remaining frontmatter prose is illustrative and is not derived. It therefore ships as a string literal inside `dist/` rather than as a file under `assets/`. Two consequences when auditing the obligation above:

- The leakage guard reaches the body only through `dist/`, so it is covered on the post-build guard run. The lint-only run skips `dist/` by design and says so (`WARN: ... skipped ... that are not on disk yet`), so a green lint-only run is not evidence that the seed was scanned.
- `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts` runs `qfai init` into a temp directory and scans the emitted tree with the same forbidden-class set, regardless of build state. It belongs to the `integration` vitest project (`packages/qfai/vitest.workspace.ts`), so it covers the seeded bodies only when that project — or the full suite — runs; a green `test:assets` or `e2e` slice alone does not scan the seed.

## Story-tree layout

Init seeds a story-based `.qfai/spec/` tree. A project with an old spec pack
receives the migration skill and an instruction to run it.

### The spec tree

Init writes these paths create-only from the `qfai-sdd` templates:

| Path under `.qfai/spec/`                                                                  |
| ----------------------------------------------------------------------------------------- |
| `decisions.md`, `open-questions.md` — header rows only                                    |
| `01_policy/objective.md`, `initiative.md`, `principle.md`, `glossary.md`, `constraint.md` |
| `02_business-flow/business-flows.md`                                                      |
| `03_contract/contracts.md`, `tech.md`, `structure.md`                                     |
| `03_contract/api/`, `db/`, `ui/`, `cli/`, `design/`                                       |

- **No instance.** Init writes no `business-flow-NNNN/` and no
  `user-story-NNNN-NNNN/`, so a fresh tree carries no test obligation and
  `qfai validate --fail-on error` on it exits 0 (DSC-001).
- **One home for project context.** The five policy and contract files replace
  the four adopter-owned catalog seeds; init does not write those catalog files.
- **Create-only on every run, `--force` included.** The tree is project
  content, like the `.qfai/steering/` seed above.
- **Nothing under `.qfai/specs/` or `.qfai/contracts/`** for a project that
  init creates in the new layout.

### Configuration

- `qfai.config.yaml` and the built-in defaults use `paths.specsDir: .qfai/spec`
  and `paths.contractsDir: .qfai/spec/03_contract`.
- `paths.contractsDir` stays a key. Every reader of the contract directory
  already goes through it.

Routing and review-profile defaults are built into the package, and
`qfai.config.yaml` holds only a project's changes to them:

| Key               | Shape                                            | Keyed by           |
| ----------------- | ------------------------------------------------ | ------------------ |
| `routing:`        | A list of routing entries, in the default's form | The entry's skill  |
| `reviewProfiles:` | A map of review profiles, in the default's form  | The profile's name |

- An override replaces the whole default entry with the same key. The fields
  of the two are never merged.
- An override whose key matches no default is added.
- Every reader of routing or review profiles, `qfai validate` included, reads
  the defaults with the overrides applied.
- The optional review modes (`devils-advocate`, `pattern-doubler`) are built in
  only. No key overrides them.
- Routing and review-profile defaults are read from the installed
  package, so a local install (`npm i -D qfai`, or the equivalent for the
  project's package manager) is a precondition. Running through `npx qfai@latest`
  alone does not provide them. An agent that cannot find the installed package
  stops and names the install command rather than routing without the
  defaults (user answer U3 in the batch record; the precondition is also
  stated in `rule/agent-selection.md`).

### A project still on the old layout

The old layout is present when the configured `paths.specsDir` holds a
`spec-*/` or `_policies/` directory, or `.qfai/contracts/` exists. Then init:

1. writes nothing under `.qfai/spec/`;
2. writes everything else, including the migration skill and its host links;
3. prints one line naming the detected path and `/qfai-migration-spec-to-story`;
4. exits as it would otherwise.

Seeding the new tree beside the old one would leave both layouts in the
project, and migration step 1's rename of `.qfai/specs` would collide with it.
Refusing the run would withhold the skill the project needs to migrate.
Even with `--force`, init keeps the old adopter-owned catalog documents
`product.md`, `manifest.md`, `tech.md` and `structure.md` for migration, including
when an old assistant asset receipt still names them.

### The migration skill

`/qfai-migration-spec-to-story` is installed and linked like
every shipped skill. Its scripts reuse init's integration-directory and
managed-block writers rather than copies of them. Their surface is
`qfai-migration-spec-to-story.md`.

### The assistant tree

The assistant outputs listed under `#### Default (no flag)` are:

- `.qfai/assistant/rule/**`: `constitution.md`, `communication.md`,
  `thinking.md`, `workflow.md`, `drift-protocol.md`, `agent-selection.md`,
  `shared-skill-delegation-baseline.md`, `shared-skill-operating-baseline.md`,
  `review-convergence.md`, `audited-evidence-hash.md`, the generic part of
  `quality.md`, `test-layers.md` (with the lane crosswalk of
  `test-layers-ci-lanes.md` merged in), `change-classification.md`,
  `research-first-protocol.md`, `worklog-entry.schema.md`,
  `ui-definition-protocol.md` and `ui-procurement.md`.
- `.qfai/assistant/skill/**`, each skill with its own `references/`.
  `requirements-decomposition.md` moves into `qfai-sdd/references/`.
- `.qfai/assistant/agent/**` and `.qfai/assistant/prompt/**`.
- `.qfai/steering/_template/entry.md`.
- Host integration links pointing at `skill/` and `agent/`.

Init writes no `constitution/`, `manifest/`, `catalog/`, `process/`,
`review-gate.rules.yml`, `spec_required_files.json`, `cli-ux-guidelines.md` and
`test-layers-ci-lanes.md`. The routing and review-profile defaults are built
into the package, so no `manifest/*.yml` is written and `--force` does not
merge a routing file.

`skills.local/` is renamed `skill.local/`. It stays the project's own surface,
which init never writes.

A project's overlay of a shipped rule stays beside the rule it extends. With
the rules in `rule/`, that is `rule/<name>.local.md`, in place of
`constitution/<name>.local.md` and `catalog/<name>.local.md`. Init never writes
an overlay, and the provenance check does not report one, as today.

### The managed `.gitignore` block

The block keeps decision records tracked under their singular directory
`.qfai/evidence/decision/`.

An existing `.gitignore` is replaced through a staged file in `.qfai/report/`.
The stage uses `.gitignore-<pid>-<UUID>.tmp` and an adjacent `.owner` marker
that records its size and content hash. On retry, init removes an abandoned
stage only when the marker and staged content agree. It preserves other files
for a person to inspect. A dry run lists recoverable stages and the planned
`.gitignore` update without writing either path. Recovery also runs when the
`.gitignore` content already matches the managed block.

### `--upgrade-assistant-tree`

- A file the relocation table names is copied to its destination under the
  assistant tree above.
- The adopter-owned `product.md`, `manifest.md`, `tech.md` and `structure.md`
  are not copied. Migration step 3 merges them into the spec tree.
- An unrecognised file stays at its legacy path. It is not copied and not
  listed.
- The run writes nothing under `constitution/`, `manifest/`, `catalog/` or
  `process/`, and writes no migration memo.

The copy stays additive: no legacy path is deleted and no destination is
overwritten.

### Path SSOT pattern

The literal pattern under
`## Path SSOT enforcement` names the canonical assistant directories.

### Distributed-surface obligations for the new IDs

Every file init writes — the story-tree seeds, the migration skill and the
steering template — passes the three guards with these shapes added:
`DEC-NNNN`, `OQ-NNNN`, `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`,
`EX-NNNN-NNNN-NN` and `BR-NNNN`. An ID numbered in the sample band, `0001` to
`0009`, may appear, as `spec-0001` to `spec-0009` may today.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Examples                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| BR-0035 | With the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/` holds exactly `rule/`, `skill/`, `agent/` and `prompt/`, plus the project's own `skill.local/` where it exists. `constitution/`, `manifest/`, `catalog/` and `process/` are absent. No period accepts both the old and the new directory names (`.qfai/contracts/cli/qfai-validate.md#assistant-tree`, `.qfai/contracts/cli/qfai-init.md#the-assistant-tree`)                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0012-01, EX-0001-0012-02                  |
| BR-0036 | With the `rule/ skill/ agent/ prompt/` assistant tree, a file read by several skills or by the CLI goes to `.qfai/assistant/rule/`, and a file read by one skill goes to that skill's `references/` (`.qfai/contracts/cli/qfai-init.md#the-assistant-tree`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0012-03, EX-0001-0012-04                  |
| BR-0041 | root/ と .qfai/ のテンプレートは create-only（既存は skip）で配置する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0020-01, EX-0001-0021-01                  |
| BR-0042 | When `--force` overwrites the skills, everything under `assistant/skills.local/` is left untouched. With the `rule/ skill/ agent/ prompt/` assistant tree the protected directory is `assistant/skill.local/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0022-01                                   |
| BR-0043 | `--dry-run` 時はファイル書き込み・symlink 作成・削除を一切行わない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0023-01                                   |
| BR-0044 | symlink ターゲットは相対パスで指定し、リポジトリの絶対パスに依存しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0024-01                                   |
| BR-0045 | skills ディレクトリの symlink は `type: 'dir'` で作成する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0020-02                                   |
| BR-0046 | agents ファイルの symlink は `type: 'file'` で作成する。README.md は symlink 化しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0025-01                                   |
| BR-0047 | Git リポジトリ内の場合のみ `git config core.symlinks true` を実行する。Git リポジトリ外では skip する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0020-03, EX-0001-0028-02                  |
| BR-0048 | Windows で EPERM エラー時は Developer Mode 有効化の案内 URL を含むエラーメッセージを表示して処理を中断する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0028-01                                   |
| BR-0049 | instructions ファイルは `--force` なしでは create-only。`--force` 時は shipped テンプレートで再生成する（既存が symlink の場合はリンク先ではなくエントリ自体を置換する。祖先 symlink などでプロジェクト外へ解決する既存エントリは `--force` でも上書きしない）。0バイトの空ファイルも「存在する」として扱う                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0030-01, EX-0001-0030-02, EX-0001-0031-01 |
| BR-0050 | 1つ以上の instructions ファイルが新規作成された場合にのみアクティベーション案内を出力する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0032-01                                   |
| BR-0051 | `qfai init --force` prunes legacy `10_workflow.md`, QFAI-generated command and prompt wrappers, and non-symlink generated `qfai-*` skill wrapper directories. It does not delete unrelated adopter-owned content.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0026-01, EX-0001-0027-01                  |
| BR-0052 | 既存の正しい symlink は skip し、壊れた symlink のみ再作成する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0021-02                                   |
| BR-0053 | The `.gitignore` managed block is the marker line, then the ignore lines, then the governance negations, in that order, so that each negation comes after the ignore it undoes. The ignore lines include `.qfai/report/*`, `.qfai/evidence/*`, `.qfai/discussion/*` and `.qfai/review/*`. The block carries none of the lines in `QFAI_GITIGNORE_LEGACY_LINES`: the four README negations, `.qfai/discussion/discussion-*/` and the `review-*/` negations. SSOT for the lines is `QFAI_GITIGNORE_BLOCK` in `packages/qfai/src/core/gitignore.ts`, and this rule does not restate them                                                                                                                                                                                                                                                                                    | EX-0001-0033-01                                   |
| BR-0054 | 再実行時、marker 行以降の連続する既知行（現行ブロック行 ∪ `QFAI_GITIGNORE_LEGACY_LINES`）を順不同で除去してから新ブロックを追記する。未知行で停止する（ユーザー記述保護）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0033-02                                   |
| BR-0055 | The assistant-tree layers init seeds are exactly the four `{constitution, manifest, catalog, process}`; init writes no other layer name. With the `rule/ skill/ agent/ prompt/` assistant tree, the layers init seeds under `.qfai/assistant/` are `rule/`, `skill/`, `agent/` and `prompt/`, and it writes none of `constitution/`, `manifest/` and `process/`. Under `catalog/` it writes only the four adopter-owned seeds `product.md`, `manifest.md`, `tech.md` and `structure.md`, and none of them where it lays out the story tree (BR-0003-0053). A project's overlay of a master that moved to `rule/` sits beside it as `rule/<name>.local.md`, and init neither writes nor overwrites it (CLI-INIT § Story-tree layout, "The assistant tree")                                                                                                                | EX-0001-0034-01, EX-0001-0034-03                  |
| BR-0056 | Seeding the project-root `.qfai/steering/` is idempotent and create-only: `.gitkeep` and `_templates/entry.md` are written only where absent, and not even `--force` rewrites an existing one. No `README.md` is seeded; the surface's contract is `.qfai/assistant/catalog/worklog-entry.schema.md`. With the `rule/ skill/ agent/ prompt/` assistant tree the template is `_template/entry.md` and the contract is `.qfai/assistant/rule/worklog-entry.schema.md`                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0034-02                                   |
| BR-0057 | `qfai init --upgrade-assistant-tree` is idempotent on a project already using `rule/`, `skill/`, `agent/` and `prompt/`: it leaves those files unchanged, exits 0 and reports preserved user edits rather than failing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0035-03                                   |
| BR-0058 | `packages/qfai/src/cli/commands/init.ts` 内の assistant-tree パスは `assistantPaths.ts` の export を import して使う。string literal を直接記述しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0036-01                                   |
| BR-0059 | After the announced v1.10.0 sunset, an ordinary init keeps legacy `.qfai/assistant/steering/` files unchanged and reports `D-DEPRECATED-PATH` as an error on stderr. The finding names the sunset and `qfai init --upgrade-assistant-tree` without claiming read compatibility.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0037-01, EX-0001-0037-02                  |
| BR-0084 | `declined` state の名前は **copy が走る前に** copy set から除外する。create-only に依存するだけでは不足する — declined ファイルはディスク上に存在しないため、create-only は「新規作成」としてそれを書いてしまう。したがって「create-only である」ことを assert するテストは、init が adopter が意図的に削除したファイルを復活させていても green になる。除外は独立した observable でなければならない                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0002-0007-05                                   |
| BR-0085 | `pruneMatchingEntries` は現在 module-private だが export に変更する。再実装は禁止（BR-0003-0042 の「自前 removal 呼び出しゼロ」は helper が module-private のままでは充足不可能であり、唯一の代替が再実装になる）。workflows ディレクトリに渡す predicate は `RETIRED_WORKFLOW_NAMES` の name-set membership であり、prefix 述語ではない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0002-0007-06                                   |
| BR-0088 | Where init lays out the story tree, it writes from the `qfai-sdd` templates `.qfai/spec/decisions.md` and `.qfai/spec/open-questions.md` with header rows only, `01_policy/glossary.md`, `01_policy/constraint.md`, `02_business-flow/business-flows.md`, `03_contract/contracts.md`, and the directories `03_contract/api/`, `db/`, `ui/`, `cli/` and `design/`. It writes no `business-flow-NNNN/` and no `user-story-NNNN-NNNN/`, so a fresh tree carries no test obligation, and nothing under `.qfai/specs/` or `.qfai/contracts/`. Each seeded Markdown file conforms to the schema its mdschema manifest entry names (CLI-INIT § Story-tree layout, "The spec tree")                                                                                                                                                                                              | EX-0001-0038-01, EX-0001-0038-02, EX-0001-0038-03 |
| BR-0089 | The story-tree seeds are create-only on every run, `--force` included: an existing file is never rewritten and an absent one is written. The tree is project content, like the `.qfai/steering/` seed (CLI-INIT § Story-tree layout, "The spec tree")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0038-04                                   |
| BR-0090 | For a new project init writes `paths.specsDir: .qfai/spec` and `paths.contractsDir: .qfai/spec/03_contract` into `qfai.config.yaml`, and the built-in configuration defaults are the same two paths, so a configuration that omits a key resolves to them. `paths.contractsDir` stays a key: every reader of the contract directory goes through it (CLI-INIT § Story-tree layout, "Configuration")                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0038-05                                   |
| BR-0091 | Init detects the spec-pack layout when the configured `paths.specsDir` holds a `spec-*/` or `_policies/` directory, or when `.qfai/contracts/` exists. The last condition makes init's test wider than validate's on purpose, because migration step 1 moves `.qfai/contracts`. On that layout init writes nothing under `.qfai/spec/`, writes everything else including the migration skill and its host links, prints one line naming the detected path and `/qfai-migration-spec-to-story`, and exits as it would otherwise (CLI-INIT § Story-tree layout, "A project still on the old layout")                                                                                                                                                                                                                                                                       | EX-0001-0038-06, EX-0001-0038-07                  |
| BR-0092 | Where init lays out the story tree, it writes `01_policy/objective.md`, `01_policy/initiative.md`, `01_policy/principle.md`, `03_contract/tech.md` and `03_contract/structure.md` under `.qfai/spec/`, in place of `catalog/product.md`, `catalog/manifest.md`, `catalog/tech.md` and `catalog/structure.md`, which it stops writing. No fact is seeded in two places (CLI-INIT § Story-tree layout, "The spec tree")                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0038-08                                   |
| BR-0093 | Init installs `/qfai-migration-spec-to-story` with its `scripts/` and links it into `.claude/skills/`, `.agents/skills/`, `.codex/skills/` and `.github/skills/` the way it installs and links every shipped skill, on a fresh project and on a project still on the spec-pack layout alike (CLI-INIT § Story-tree layout, "The migration skill")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0004-0001-01                                   |
| BR-0094 | The migration steps that repoint the host integration links and update the managed `.gitignore` block call init's integration-directory writer and init's managed-block writer. Neither step carries its own link-creation, link-removal or `.gitignore` write call, so the migration cannot write a link or a block that init would not (CLI-MIGR § No `qfai` subcommand)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0004-0001-02                                   |
| BR-0095 | The pre-build lint, the post-build guard and the smoke test reject the shapes `DEC-NNNN`, `OQ-NNNN`, `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN` and `BR-NNNN` in the shipped surface. An ID passes only when every numeric segment lies in the sample band: `0001` to `0009` for a four-digit segment, `01` to `09` for the two-digit tail. The four-digit `DEC-NNNN` and `OQ-NNNN` patterns do not match the leading part of the `DEC-NNNN-NNNN` and `OQ-NNNN-NNNN` shapes, which stay forbidden as they are. The three guards hold one pattern set, which changes only together with `.agents/rules/distributed-surface.local.md` in a change that edits no template (NFR-C0005), and the patterns land before any shipped template carries one of these shapes (CLI-INIT § Story-tree layout, "Distributed-surface obligations for the new IDs") | EX-0002-0009-01, EX-0002-0009-02                  |
| BR-0096 | Init generates `.codex/agents/<name>.toml` for each canonical agent card from the card's frontmatter `name` and `description` and its body. It reads the agent's `kind` from `assistant/manifest/agent-catalog.yml#agents[].kind`, or, with the `rule/ skill/ agent/ prompt/` assistant tree, from the card's own frontmatter `kind`. An agent of `kind: reviewer` gets `sandbox_mode = "read-only"`. An existing profile is kept on a plain run and regenerated under `--force`. An agent whose `kind` cannot be determined gets no profile, and the run says so                                                                                                                                                                                                                                                                                                        | EX-0001-0025-02                                   |
| BR-0097 | With the `rule/ skill/ agent/ prompt/` assistant tree, the managed block negates `.qfai/evidence/decision/` and `.qfai/evidence/decision/**` in place of the plural `.qfai/evidence/decisions/` pair, so decision records stay tracked under their singular directory (discussion-20260923063306456#NFR-0010). The plural pair joins `QFAI_GITIGNORE_LEGACY_LINES`, so a re-run over a block an earlier release wrote strips it and leaves one marker line (CLI-INIT § Story-tree layout, "The managed `.gitignore` block")                                                                                                                                                                                                                                                                                                                                              | EX-0001-0033-03, EX-0001-0033-04                  |
| BR-0098 | With the `rule/ skill/ agent/ prompt/` assistant tree, `--upgrade-assistant-tree` copies each file the relocation table names to its destination in that tree. It does not copy the adopter-owned `product.md`, `manifest.md`, `tech.md` and `structure.md`, which migration step 3 merges into the spec tree. A file the table does not recognise stays at its legacy path, uncopied and unlisted. The run writes nothing under `constitution/`, `manifest/`, `catalog/` or `process/` and writes no migration memo. The copy stays additive: no legacy path is deleted and no destination is overwritten (CLI-INIT § Story-tree layout, "`--upgrade-assistant-tree`")                                                                                                                                                                                                  | EX-0001-0035-01, EX-0001-0035-02                  |
| BR-0523 | Init creates `.github/copilot-instructions.md` from the shipped repository instructions when absent. Without `--force`, it preserves existing adopter content rather than replacing the file wholesale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0029-01, EX-0001-0029-02                  |
