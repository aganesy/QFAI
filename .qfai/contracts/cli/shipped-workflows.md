# Contract: shipped GitHub Actions workflow set

- Contract scope: the workflow files QFAI distributes into an adopter's
  `.github/workflows/`, the ownership boundary over that directory, and the
  declared structural shape a gate diffs against
- Owning spec: `spec-0003` (`qfai init` — the command that writes the set)
- Used-by:
  - `spec-0006` (`qfai doctor` — reads the provenance record; emits the
    stale-drift advisory, see `.qfai/contracts/cli/qfai-doctor.md`)
  - `spec-0017` (repository toolchain — the workflow-hygiene lint lane that
    scans this tree)
  - `spec-0004` (`pnpm ci:lint` lane registry — where the gates are wired)
  - `spec-0015` (Reviewer-Gate — ingestion of the finding codes below)
- SSOT modules:
  - `packages/qfai/assets/init/root/.github/workflows/**` (the shipped set itself)
  - `packages/qfai/src/cli/lib/fs.ts` (`copyTemplateTree` / `copyTemplatePaths` —
    the only copy primitives)
  - `packages/qfai/src/cli/commands/init.ts` (`pruneMatchingEntries` — the only
    removal primitive)
  - the shipped-name lists and the provenance reader/writer (module path is
    `spec-0003`'s implementation choice; this contract fixes their semantics,
    not their file)

Why this is its own contract and not a section of `qfai-init.md`: three
surfaces read it. `qfai init` writes the set, `qfai doctor` reports on it, and
the refresh verb deferred on `OQ-0021` will write **and** prune it. The five
file states and the reserved-prefix rule are one enum shared by all three, so
folding it into the init contract would make the doctor contract and the future
refresh contract depend on a section of a sibling command's contract. This
follows the `worklog-entry.schema.md` precedent, where a schema that `init`
seeds and `validate` reads was split out of `qfai-init.md` for the same reason.

## 1. Reserved filename prefix

Every file QFAI ships into an adopter's workflows directory matches:

```text
^qfai-[a-z0-9-]+\.yml$
```

QFAI claims **no other file** in that directory.

**The prefix is a reservation notice, not a selector.** It exists so that a
collision is foreseeable to an adopter reading the documentation — it is never
the input to a write or a removal. Concretely:

- The **write set** is an in-binary list of the names the running package
  actually ships (`SHIPPED_WORKFLOW_NAMES`), derived from the asset tree at
  build time or asserted equal to it by the gate in §5.
- The **prune set** is an in-binary list of names a **previous** version
  shipped and this one no longer does (`RETIRED_WORKFLOW_NAMES`). A name leaves
  `SHIPPED_WORKFLOW_NAMES` and enters `RETIRED_WORKFLOW_NAMES` in the same
  change; a name in neither list is not QFAI's.
- Neither set is ever computed by globbing `qfai-*` on the adopter's disk.

This is a departure from the three existing prefix-scoped pruners in
`init.ts#pruneStaleQfaiWrappers`, which use `entry.name.startsWith("qfai-")`
over `.claude/commands/`, `.github/prompts/` and the skill integration
directories. Those cover generated wrapper directories whose entire contents
QFAI owns. The workflows directory is **not** such a directory: it is an
adopter-authored directory QFAI writes a small named set of files into. Passing a
`startsWith("qfai-")` predicate to `pruneMatchingEntries` for this directory is
therefore forbidden by this contract, and the predicate must be
name-set membership over `RETIRED_WORKFLOW_NAMES`.

## 2. Provenance record

Path: `.qfai/install-provenance.json` (adopter tree, **tracked**).

Not in `QFAI_GITIGNORE_BLOCK` and not to be added to it. The record must
survive a fresh clone: `declined` (§3) is only decidable while the record
exists, and a git-ignored record would let a later `init` on a colleague's
checkout recreate a file the adopter deliberately removed.

`.qfai/state.json` is explicitly the wrong home — its module header declares it
"ephemeral, per-runtime session state (NOT committed configuration)" and it is
listed in `QFAI_GITIGNORE_RECOMMENDED_ENTRIES`.

Shape:

```json
{
  "workflows": {
    "qfai-validate.yml": {
      "sha256": "<hex digest of the bytes QFAI wrote>",
      "installedByVersion": "<packages/qfai/package.json#version at write time>",
      "installedAt": "<ISO 8601 timestamp>"
    }
  }
}
```

- Top-level keys are namespaced by artifact kind so a later kind is additive.
  `workflows` is the only kind this contract defines.
- No `schemaVersion` field, per `.agents/rules/distributed-surface.md`
  (canonical version source is `package.json#version`; `installedByVersion`
  records that value and nothing else).
- Readers tolerate a missing file, a missing `workflows` key, and malformed
  JSON by treating the record as **empty** — never by throwing. An empty record
  means every file on disk is adopter-owned (§3), which is the fail-safe
  direction: QFAI leaves it alone.
- `sha256` is the digest of the bytes QFAI wrote, not of the current file. It is
  what makes the two causes of a byte difference distinguishable (§3 note), and
  it is written once at install time. Because the shipped tree is copied
  create-only (`DTC-4`), an existing adopter can never be reached to backfill a
  field later, so the record is forward-sufficient at first write by design.

## 3. File states (closed enum)

Decided by two independent observations: whether the name has a provenance
entry, and what is on disk.

| Provenance entry | On disk                    | State           | `qfai init`              | `qfai doctor`                    | Prune |
| ---------------- | -------------------------- | --------------- | ------------------------ | -------------------------------- | ----- |
| absent           | absent                     | `absent`        | writes it, records it    | silent                           | never |
| absent           | present                    | `adopter-owned` | leaves it alone (skip)   | silent                           | never |
| present          | present, bytes == packaged | `installed`     | leaves it alone (skip)   | ok                               | never |
| present          | present, bytes != packaged | `modified`      | leaves it alone (skip)   | advisory finding (see §7)        | never |
| present          | absent                     | `declined`      | **does not recreate it** | silent — never reported as stale | never |

Rules the table encodes, stated so they cannot be lost in a refactor:

- `absent` and `declined` are different states and are reported differently. A
  file that was never installed is never-installed; it is not "deleted".
- `adopter-owned` is the state a name collision produces. An adopter who
  authored `qfai-tests.yml` before QFAI happened to ship that name keeps it
  untouched forever, because the write path is create-only and the prune
  predicate is name-set membership, not the prefix.
- `declined` is a legitimate adopter choice. A declined file is not recreated by
  a later install, not reported as stale drift, and not pruned.
- **`modified` has two causes and the record separates them.** Both present
  identically without the record:

  | installed digest   | packaged digest    | Cause                         | What a refresh would do |
  | ------------------ | ------------------ | ----------------------------- | ----------------------- |
  | `== record.sha256` | `!= record.sha256` | QFAI shipped a newer template | repair it               |
  | `!= record.sha256` | (either)           | the adopter hand-edited it    | destroy their work      |

  The detection half (`REQ-0022`) reports `modified` either way; deciding what a
  refresh does with each is the conflict policy deferred on `OQ-0021`, and this
  contract exists so that decision has an input.

- **Known limitation, recorded rather than papered over.** An adopter who
  installed a shipped workflow before the provenance record existed has no
  entry, so the file reads as `adopter-owned` and the drift channel is silent
  for it. There is no safe automatic backfill: byte-equality with the current
  package only proves provenance in the case that has no drift to report, and
  claiming provenance on any other basis risks telling an adopter to overwrite
  a file they wrote. The documented one-time adoption path uses only the states
  above: delete the file (which leaves no entry, so the state is `absent`, not
  `declined`) and re-run `qfai init`, which writes it and records it.

## 4. Write-path obligations (`qfai init`)

- The shipped root tree stays create-only. Today this is
  `copyTemplateTree(rootAssets, destRoot, { force: false, conflictPolicy: "skip", … })`
  in `init.ts`; the `force: false` literal is load-bearing for this contract and
  is not to be lifted to `options.force`.
- After a successful write of a name in `SHIPPED_WORKFLOW_NAMES`, init records
  the entry from §2. A skipped file produces no entry.
- A name in `declined` state is excluded from the copy set before the copy runs.
  Relying on create-only alone is not sufficient here: the file is absent, so
  create-only would write it.
- **No parallel filesystem implementation.** Any write or removal on this
  directory — including the refresh verb when it ships — reaches the filesystem
  only through `copyTemplateTree` / `copyTemplatePaths`
  (`src/cli/lib/fs.ts`) and `pruneMatchingEntries` (`src/cli/commands/init.ts`).
  The code path contains no `copyFile`, `writeFile`, `rm` or `unlink` call of
  its own. `pruneMatchingEntries` is currently module-private; it is to be
  exported, not re-implemented. This is observable: seed a name collision, a
  declined file and a `modified` file, and assert all three outcomes are
  produced through those primitives.
- Idempotence: a second `init` into the same tree writes nothing and changes no
  provenance entry (`NFR-0008`).

## 5. Declared structural shape (the gate operand)

The **values** are SSOT in the test suite, as a single declared shape the gate
diffs each shipped file against. This contract does not restate them, because
`REQ-0021` requires exactly one mechanism to own the invariant and a second
copy here would reproduce the drift class `DTC-5` records. What this contract
fixes is the **closed set of dimensions** the declared shape must pin, so a
shape that silently omits one is a contract violation rather than a judgement
call:

1. The file set — exactly `SHIPPED_WORKFLOW_NAMES`, each matching §1's pattern.
2. Per file: the header block required by `NFR-0011` — the repository variables
   it reads with their defaults, the layer it covers, what makes it inert, and
   its fail-open behaviour.
3. Per job: a `permissions:` block reachable from the job, `timeout-minutes:`,
   and a runner selector in the repository-variable form with a public
   GitHub-hosted default.
4. Per matrix: `fail-fast: false`.
5. Per lane that invokes QFAI: the subcommand, the `--profile` value, and the
   `--fail-on` threshold.
6. Per lane: what makes it inert — the condition that keeps it declared but
   skipped when the adopter has not opted in.
7. The third-party `uses:` set, asserted as an **allow-list** against the closed
   sanctioned set (one entry today, the package-manager setup action). Never as
   a count of zero: a count fails on the entry the policy legitimately keeps.
8. Zero secret declarations, secret-context references and secret-inheritance
   uses anywhere in the set.
9. No shipped file references another shipped file (`DTC-25` — the absent
   target would turn the referencing workflow into a parse error with no repair
   path under create-only install).

Dimension 5 has a subject in exactly one shipped file: `qfai-validate.yml`,
where it resolves to subcommand `validate`, profile `full`, threshold `error`.
Those three values are asserted today as ad-hoc strings in
`packages/qfai/tests/assets/assets.test.ts` (`DTC-26`); the gate **subsumes and
replaces** those assertions rather than running alongside them, and the moved
assertions keep their test-case annotation.

The other two shipped files invoke no QFAI subcommand — the test orchestrator's
lanes are placeholders, and the document lane runs the two checkers the package
ships as `node` programs. For them the declared shape states an EMPTY invocation
list rather than a value, because "this file has no lane result to pin" is an
answer to dimension 5 and an omission is not. A file that gained a QFAI
invocation without gaining an entry would fail the gate, which is the property
the empty list buys.

Gate placement is part of the contract: the gate runs from `pnpm ci:lint`,
which pull requests execute. It must not be placed in `pnpm ci:gate`, which
only the release workflow invokes (`DTC-18`, `NFR-0014`).

Failure code: `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`.

## 6. Hygiene rules that apply to the shipped tree

The workflow-hygiene lint lane (`spec-0017`) scans both QFAI's own
`.github/workflows/**` and this shipped tree, applies its shared rule set to
both, and applies these additionally to the shipped tree only:

- Third-party `uses:` restricted to the closed sanctioned set, as an
  allow-list (mirrors dimension 7 above; the hygiene lane checks the reference
  form, the §5 gate checks the declared set).
- No forbidden version marker anywhere in the file. **The operative property is
  the absence of a leading `v`, not the location of the text.** The leakage
  guard `packages/qfai/scripts/check-no-internal-version-leakage.sh` matches
  `INTERNAL_VERSION_RE='\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b'` with `grep -rnE` over
  the **whole file**, so a step name reading `Setup pnpm v10.15.0` fails exactly
  as a trailer comment `# v10.15.0` does. Moving the version out of a comment
  and into a step `name:` is therefore _not_ sufficient on its own.

  The adopted resolution is: carry the human-readable version in the step
  `name:` **with the leading `v` dropped** (`Setup pnpm 10.15.0`), and keep the
  `uses:` reference a bare 40-hex SHA with no version-bearing trailer. Dropping
  the `v` is what clears the guard; putting it in the step name is what keeps it
  legible to a human reader. Both halves are required, and only the first is
  load-bearing for the build.

  The guard is comment-blind and honours no pragma (`DTC-2`), so no allow-list
  or suppression is available. The hygiene-lane rule enforcing this must inspect
  shipped-YAML comment lines deliberately, because `lint-shipping.ts` skips YAML
  comment lines before its shipped-runtime rules apply (`DTC-27`) — that skip is
  why the comment case needs its own rule even though the guard already catches
  it post-build.

- No non-public runner label literal.
- No secret reference.

Failure code: `R-WORKFLOW-HYGIENE-DRIFT`, carrying the offending file, job and
rule name. The lane names its full rule set in its output so a green result
reads as a list of checks rather than a blanket assurance (`OQ-0017`'s
mitigation — the deferral of an external workflow linter is only honest while
the coverage boundary is visible).

Both codes are error-class lint codes. They follow the existing bare-`R-` lint
namespace, not the `QFAI-XXX-NNN` grammar, so the three-digit waiver alias rule
in `DTC-17` does not apply to them.

**Catalog membership is decided by severity class, not by emitter identity.**
`JUSTIFICATION_CATALOG` (`src/core/validators/justificationCatalog.ts`) is the
closed mandatory-justification set; its header scopes the exclusion to
_warning-class advisory-only auxiliary_ codes. Emitter identity is irrelevant,
and a deterministic script's output is not disqualified: `R-PACK-LOCATION-DRIFT`
is severity `error`, is emitted **only** by
`packages/qfai/scripts/check-pack-locations.mjs`, and **is** a catalog member;
`R-SKILL-MANIFEST-DRIFT` is a second script/probe-driven error-class member.
`R-AUTOPILOT-POLICY-WIDENED` sits outside the catalog because it is
advisory-only — not because a script emits it, as its own sibling
`R-AUTOPILOT-POLICY-MISSING` shares that emitter and _is_ a member.

By that discriminator these two error-class codes **belong in** the catalog,
following the `R-PACK-LOCATION-DRIFT` precedent. Registering them is deliberately
**deferred, not waived**: the catalog header states that adding a code extends a
closed requirement contract and must move in lockstep with the owning spec and
the reviewer SSOTs, which is outside this change's atomic slice. Until that
lockstep change lands, the gate surfacing them without a justification demand is
a **known temporary divergence, not a principle**. The owning spec records the
deferral and names every SSOT that must move together; see `spec-0015`.

## 7. Detection surface

`qfai doctor` owns the adopter-facing report. See
`.qfai/contracts/cli/qfai-doctor.md` §`workflows.integrity`. The state
vocabulary there is exactly §3's enum; doctor introduces no state of its own.

## 8. Non-goals

- **No refresh or overwrite verb in this release.** The repair half is deferred
  on `OQ-0021`. This contract is its stated precondition (`DTC-6`: "any refresh
  channel must declare that contract first"), not its delivery.
- **No composite-action templates.** `scripts/verify-pack.mjs` allow-lists only
  `workflows` as an immediate child of the shipped `.github/` and throws on any
  other child, so an `actions/` directory is a hard pack failure. Rejected with
  rationale; reintroduction requires an explicit RE-OPEN.
- **No version stamping into a shipped file.** The package version is the only
  permitted version marker anywhere on the distributed surface.
- **No prefix-glob write or prune, ever.** Restated as a non-goal because it is
  the shortcut a future implementer will reach for: `RETIRED_WORKFLOW_NAMES`
  looks like bookkeeping a glob would make unnecessary, and it is exactly what
  makes an adopter-authored `qfai-`-named file safe.
- **No CI keys in `qfai.config.yaml`.** Per-adopter tuning goes through GitHub
  repository variables (`DTC-11`).

## 9. Distributed-surface obligations

- `packages/qfai/assets/init/root/.github/workflows/**` **is** distributed. No
  `spec-NNNN` (N ≥ 10), `CAP-0010+`, `DEC-NNNN-NNNN`, `DR-NNNN`,
  `OQ-NNNN-NNNN`, `v<major>.<minor>[.<patch>]` marker or `schemaVersion` may
  appear in any shipped workflow, in YAML or in a comment. All four defence
  layers in `.agents/rules/distributed-surface.md` cover the tree: the
  pre-build shipping lint, the shell guard, the `qfai init` leakage smoke test,
  and the rule document.
- `.qfai/install-provenance.json` is generated in the adopter's tree and is not
  distributed. It carries only the adopter's own filenames plus the canonical
  npm version.
- This contract file is authoring-zone: `.qfai/contracts/**` is excluded from
  `packages/qfai/package.json#files`, so internal IDs used above are legal here
  and must not be copied into any shipped file.
