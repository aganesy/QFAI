# CLI Contract: `qfai init`

- Contract scope: public CLI surface for project initialization and assistant-tree upgrade
- Owning spec: `spec-0003`
- Used-by: `spec-0003`, `spec-0004` (path SSOT consumer), `spec-0011`, `spec-0014`
- SSOT modules:
  - `packages/qfai/src/cli/commands/init.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/core/assistantAssets.ts` (asset mirror copier)
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

Seeds a fresh consuming-project `.qfai/` tree from the embedded asset mirror.

Required outputs (created if absent; merged or refreshed if present per the existing init policy):

- `.qfai/assistant/constitution/**` — global invariants and protocols (drift-protocol, constitution, quality, distributed-surface, workflow, agent-selection, change-classification, requirements-decomposition, communication, thinking, shared-skill-{delegation,operating}-baseline)
- `.qfai/assistant/manifest/**` — machine-loaded routing/policy YAML configs (`agent-catalog.yml`, `agent-routing.yml`, `review-profiles.yml`)
- `.qfai/assistant/catalog/**` — reference materials, rule lists, and registry artifacts that humans read (`test-layers.md`, `review-gate.rules.yml`, `spec_required_files.json`, `manifest.md` template, `product.md`, `structure.md`, `tech.md`, `cli-ux-guidelines.md`, `ui-definition-protocol.md`)
- `.qfai/assistant/process/**` — workflow, methodology, `migrations/`
- `.qfai/assistant/agents/**`, `.qfai/assistant/skills/**` — unchanged from prior layouts
- `.qfai/steering/` (project-root work-log surface, NOT under `assistant/`) seeded with:
  - `README.md` (generic content, no internal IDs / version markers)
  - `.gitkeep`
  - `_templates/entry.md` (work-log entry template with frontmatter)

Reinit behavior (existing `.qfai/` present):

- The `.qfai/steering/` seed is create-only: an existing `README.md` / `_templates/entry.md` is never rewritten, not even under `--force` (that surface holds project content). When either file differs from the body the running release would seed, init prints a notice naming the file, the first differing line and both line counts, and tells the operator how to obtain a fresh copy (`qfai init --dir <scratch-dir>`, then diff). The comparison is line-ending-insensitive, so a CRLF checkout of an unedited seed is not reported as drift. When the existing path cannot be compared at all (not a regular file, or unreadable, or past the comparison size ceiling), init prints a notice saying so instead of failing the run. An unchanged file produces no notice, so a silent `skipped` entry means "already current".
- User-authored work-log entries (`.qfai/steering/*.md` that match the entry frontmatter schema with `id` matching filename stem) MUST NOT be overwritten.
- Collisions where the user-edited file lives at an old (pre-recut) path surface a `W-USER-EDIT-PRESERVED` finding via the validate gate (REQ-0013).

Exit codes:

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2    | CLI-arg error (unknown flag, malformed value)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 64   | I/O error (cannot read/write target tree)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 65   | Conflict — old-layout files present and `--upgrade-assistant-tree` not supplied while running on a layout the validator would reject. **Reserved — not emitted.** A fresh `qfai init` seeds the 4-layer tree alongside the legacy one, reports `D-DEPRECATED-PATH` (warning inside the window, error from the sunset — see below), and expects the user to opt in to `--upgrade-assistant-tree`. Exit 65 stays unimplemented deliberately: `--upgrade-assistant-tree` copies and never deletes, so exit 65 would name a remediation command that cannot clear it. Legacy presence is failed by `qfai validate`, which the deprecation contract charges with enforcement. |

#### `--force` (asset regeneration) — `agent-routing.yml` phase merge

`--force` regenerates `assistant/skills/**` and `assistant/agents/**` and never overwrites `assistant/manifest/**`, which is user configuration edited through `qfai-configure`. The one manifest gap that exclusion cannot leave open is a routing phase the regenerated skills name: `--force` therefore runs an **add-only** merge of the shipped `manifest/agent-routing.yml` into the project's copy.

Behavior:

- A `routing[]` skill entry the project lacks is appended whole; a phase the project lacks is inserted at the position the shipped table gives it, relative to the phases the project does have. Comments travel with the inserted node.
- An inserted phase MUST land ahead of the earliest shipped phase that follows it and that the project already declares, so a gate such as ATDD `red` stays ahead of `implementation` even in a project that reordered the phases around it. The order of the phases the project already has MUST NOT change.
- A phase the project already declares MUST NOT be edited or removed. Its agent lists are the project's taxonomy.
- When a declared phase omits an agent the shipped phase lists in `mandatory_agents` / `blocking_agents`, the omission is **respected and reported** (`W-ROUTING-AGENT-DIVERGED`), never restored — restoring it would overwrite a decision made through the supported path.
- A shipped node whose agent references the project's `manifest/agent-catalog.yml` does not declare MUST be **skipped and reported** (`W-ROUTING-AGENT-UNKNOWN`), never added. `--force` does not regenerate the catalog, so adding such a node would leave a project that removed the agent through `qfai-configure` failing `qfai validate` (`QFAI-AGENT-008`) on a table that validated a moment earlier. A catalog that cannot be read as one disables the check rather than withholding every addition.
- A shipped `routing[]` entry naming a `review_profile:` the project's `manifest/review-profiles.yml` does not declare MUST be **skipped and reported** (`W-ROUTING-PROFILE-UNKNOWN`), never added. `review-profiles.yml` is excluded from `--force` exactly as the catalog is, so appending an entry shipped alongside a new profile would leave the skill routing to a profile nothing declares when its reviewers are selected. A profiles file that cannot be read as one disables the check.
- Additions are reported as `I-ROUTING-PHASE-MERGED`. `--dry-run` reports without writing, and the file is left byte-identical when nothing was added.
- An unparsable project manifest, a routing entry with no `phases:` sequence, an unreadable packaged template, a project manifest that is a **symlink** or sits under a **linked parent directory resolving outside the project**, and a project manifest that is not a regular file of bounded size (a FIFO, a device, a directory, or an oversized file), a manifest that cannot be opened or read at all (`EACCES`, `EIO`, `ESTALE`), and a manifest whose bytes are not valid UTF-8 are each reported as `W-ROUTING-MANIFEST-UNREADABLE` and skipped; `init` does not fail on them (`qfai validate` owns `QFAI-AGENT-002`). No read failure may abort the run: the merge is an optional step and aborting would discard the skills and agents `--force` had already regenerated. The UTF-8 rule is a data-loss rule rather than a parsing one — a lossy decode substitutes U+FFFD for bytes it cannot read, the YAML still parses, and writing the merged text back would destroy them irreversibly. The link cases are a write-safety rule: the merge MUST NOT follow a link out of the project tree — an `lstat` (like `O_NOFOLLOW`) covers the last path component only, so every ancestor up to the destination root is resolved as well. The file-kind check is the same rule for what `init` will read: a FIFO at that path would otherwise block the run until a writer appeared.
- The write MUST be atomic against the pathname — a temp file in the same directory, renamed over the target, carrying the original file mode **and its `uid` / `gid`**. The directory holding the manifest MUST be re-verified — same directory, still inside the project — immediately before the temp file is created and again immediately before the rename, because both resolve the parent by **name** and a `manifest/` swapped for a link out of the tree after the write-safety check would otherwise carry the replacement outside the project. Truncating the user's manifest in place would leave an empty or half-written `agent-routing.yml` behind an `ENOSPC` / `EIO` / interrupted run, which is unrecoverable damage from an add-only update to a file the user owns.
- The **file** MUST be re-verified immediately before the rename — its inode and its bytes both — and the merge skipped (`W-ROUTING-MANIFEST-UNREADABLE`) when either changed. The directory pin does not cover it: an editor or a `qfai-configure` run that saves over `agent-routing.yml` after it was read leaves the directory exactly as it was, and the rename would then replace that newer content with a merge built from the older. The bytes are compared as well as the inode because the ordinary save that truncates and rewrites keeps the inode.
- Ownership that cannot be restored MUST stop the replacement (`W-ROUTING-MANIFEST-UNREADABLE`), not be silently changed. The replacement is a new inode created by whoever runs `init`, so under `sudo qfai init --force` — or in any shared tree where the manifest belongs to somebody else — renaming it into place would hand the user's own file to another owner and leave them unable to edit it through `qfai-configure`.
- The four warning classes carry **distinct** codes — `W-ROUTING-MANIFEST-UNREADABLE` (parse / shape / file kind / write-safety), `W-ROUTING-AGENT-DIVERGED` (deliberate agent removal), `W-ROUTING-AGENT-UNKNOWN` (catalog cannot satisfy the shipped node), `W-ROUTING-PROFILE-UNKNOWN` (review profile is not declared) — so a consumer classifying by code is not steered into the wrong repair.

#### `--upgrade-assistant-tree` (one-shot migration helper)

Relocates files from the two pre-recut surfaces the recut actually moved — `.qfai/assistant/instructions/*` and `.qfai/assistant/steering/*` — to the post-recut layout (`constitution/`, `manifest/`, `catalog/`, `process/`) per the canonical relocation table.

`.qfai/assistant/manifest/*` is **not** walked, even though it is a pre-recut surface: its path is identical before and after the recut, so walking it would re-label freshly seeded canonical files as legacy content and emit spurious `W-USER-EDIT-PRESERVED` notes (`runUpgradeAssistantTree`'s `legacySurfaces`, `packages/qfai/src/cli/commands/init.ts`). The consequence is that a user-authored document sitting in a pre-recut `manifest/` is left exactly where it is — it is not re-classified into `catalog/` — and `qfai-configure` stays the supported entrypoint for that layer. Migrating stale _content_ inside those files is a separate concern and is not handled here.

Behavior:

- For each file in the relocation table, move the existing user-edited content to the new path.
- If a destination already exists with user edits, preserve the user-edited content and surface `W-USER-EDIT-PRESERVED` (REQ-0013).
- After the move, run the `qfai init` default flow, which seeds a missing README / template and reports drift on an existing one (create-only, as above).
- Old paths are not deleted within the deprecation window (NFR-0002); they remain readable but emit `D-DEPRECATED-PATH` warnings during validate.

Required preconditions:

- `packages/qfai/package.json#version` is greater than the version that introduced the recut (referenced in `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md`).
- Working tree state is NOT inspected, and there is no `--allow-dirty` escape hatch. Nothing in this invocation is gated on VCS state, and a clean tree is a recommendation, not a precondition.
- The recommendation is real, though, and it applies to the invocation rather than to the migration step alone. Only the **migration helper** is additive: it copies legacy content to the new path, never deletes a legacy path, and never overwrites an existing destination (an existing destination is preserved and reported as `W-USER-EDIT-PRESERVED`). The flag then falls through into the ordinary `qfai init` flow, which is not additive — it rewrites the managed block of the root `.gitignore` in place (`ensureRootGitignoreEntries`) and re-syncs the integration wrappers. `--force` is not rejected alongside `--upgrade-assistant-tree`, and adding it also regenerates `assistant/skills/**` and `assistant/agents/**` and deletes legacy wrappers and `10_workflow.md`. So "roll back by deleting what was copied" covers the migration step only; for the run as a whole, a clean tree is what lets `git diff` separate init's edits from work already in progress.
- If a working-tree probe or an `--allow-dirty` flag is ever added, these two bullets are the lines that must change with it.

Exit codes (additional):

| Code | Meaning                                                                                   |
| ---- | ----------------------------------------------------------------------------------------- |
| 0    | All files relocated; user edits preserved with `W-USER-EDIT-PRESERVED` warnings as needed |
| 64   | I/O error during relocation; pre-relocation state preserved                               |

There is no "cannot resolve relocation" exit code. Within the two surfaces the helper walks, `classifyLegacySteeringEntry` routes any path the canonical relocation table does not name to the `catalog/` layer, preserving the subpath it had under the legacy surface. That is the intended behaviour, not a gap: those surfaces hold user-authored documents next to the seeded ones, so refusing to place an unrecognised file would abort the migration on exactly the projects that most need it. Such files land under `catalog/` and the run still exits 0.

The run does name those paths: the summary reports `written: N` and then enumerates them under `written paths:` (`report` in `packages/qfai/src/cli/commands/init.ts`). That enumeration carries no Git status, though, so it is not a rollback set on its own — and it is wider than the migration step, because the init flow the flag falls through into writes into the same list (the managed `.gitignore` block, and with `--force` the regenerated `assistant/skills/**` and `assistant/agents/**`). Of the migration helper's own writes, every one is a new file: it never overwrites and never deletes. So on a tree that was clean before the invocation the rollback listing still has to be reconstructed from Git — with `git status --short --untracked-files=all .qfai/assistant/`. The `--untracked-files=all` mode is load-bearing, not cosmetic: the default `normal` mode collapses a wholly-new directory into a single `?? .qfai/assistant/catalog/` entry that names no file at all, and acting on that entry means deleting the directory rather than the copies.

That listing is the **invocation's**, not the migration step's, and only its `??` rows are additions. The ordinary `qfai init` flow the flag falls through into seeds its own files into the same four layers, and nothing in the output distinguishes a relocated document from a freshly seeded one — so a directory-wide `rm` takes both. With `--force` the same flow also **regenerates** `assistant/skills/**` and `assistant/agents/**`, so the listing carries `M` and `D` rows for files that were already tracked; deleting those would take assets the invocation never added.

Roll back in two moves, by status:

- `??` rows — files this invocation created. Delete the individual paths, never the enclosing directory.
- `M` / `D` rows — files that existed before. Restore them with Git (`git restore -- <path>`); they are not the addition set.

Then read `git diff` separately for the in-place edits the flow makes outside `.qfai/assistant/` (the managed `.gitignore` block, the integration wrappers). The `W-USER-EDIT-PRESERVED` notes printed by the run name the destinations that were left alone.

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
  reaches only `assistant/skills/**`, `assistant/agents/**`, the generated
  integration wrappers, and the add-only `agent-routing.yml` phase merge
  described above — never the shipped root tree, so no workflow file in
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
  provenance entry.

Reporting drift on an already-installed shipped workflow is **not** this
command's job — it belongs to `qfai doctor`
(`.qfai/contracts/cli/qfai-doctor.md` §`workflows.integrity`). `qfai init`
stays silent about a `modified` file; it skips it like any other existing file.

## Path SSOT enforcement

Both `init` and `validate` MUST read assistant-tree paths from `packages/qfai/src/core/paths/assistantPaths.ts` only. Hard-coded path string literals matching `assistant/(steering|manifest|instructions|catalog|constitution|process)/` outside the SSOT module are rejected by the lint lane (NFR-0001).

## Deprecation window

Old-layout file paths (under `.qfai/assistant/instructions/` and `.qfai/assistant/steering/`) remain readable for **exactly one minor release** after the recut ships (NFR-0002). `.qfai/assistant/manifest/` is not in that list: the recut keeps its path, so it is canonical rather than deprecated and no sunset applies to it. The migration memo at `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` names both the introducing version and the sunset version.

The sunset is `SUNSETS.legacyAssistantSteering` in `packages/qfai/src/core/sunset.ts`, and every surface that reports the layout computes its severity from it: `qfai validate` escalates `D-DEPRECATED-PATH` to error, `qfai init` reports the same finding on stderr at the same severity, and `W-SKILL-DOC-BROKEN-REF` escalates alongside them. The readers keep accepting the old paths — per `qfai-validate.md`, the old-layout reader is removed in the minor _after_ the sunset, not at it — so `--upgrade-assistant-tree` still works and `init` still exits 0.

## Distributed-surface obligations

The seeded `.qfai/steering/README.md` and `_templates/entry.md` MUST pass `packages/qfai/scripts/check-no-internal-version-leakage.sh` (no `spec-NNNN` for N ≥ 10, no `vN.M[.P]`, no `CAP-0010+`, no `DEC-NNNN-NNNN`, no `DR-NNNN`, no `OQ-NNNN-NNNN`, no `QFAI-PROT2-NNN`, no `schemaVersion`). The work-log surface itself (`.qfai/steering/`) is NOT shipped in `packages/qfai/package.json#files`; only the seeded README + template under `assets/init/.qfai/steering/` ship.
