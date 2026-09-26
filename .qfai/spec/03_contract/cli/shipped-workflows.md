# Contract: shipped GitHub Actions workflow set

- Contract scope: the workflow files QFAI distributes into an adopter's
  `.github/workflows/`, the ownership boundary over that directory, and the
  declared structural shape a gate diffs against
- Migration origin: `spec-0003` (`qfai init` — the command that writes the set)
- Used-by:
  - `spec-0006` (`qfai doctor` — reads the provenance record; emits the
    stale-drift advisory, see `.qfai/spec/03_contract/cli/qfai-doctor.md`)
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
refresh contract depend on a section of a sibling command's contract.

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

1. The file set — exactly the shipped names, each matching the reserved pattern.
   `SHIPPED_WORKFLOW_NAMES` holds them and §1 holds the pattern.
2. Per file: the required header block. `NFR-0011` states its rows: the
   repository variables the file reads with their defaults, the layer it
   covers, what makes it inert, and its fail-open behaviour.
3. Per job: a reachable permissions block, timeout-minutes, and a runner
   selector in the repository-variable form with a public GitHub-hosted
   default.

   The form admits a chain of variables before that default, because the set
   carries two runner classes. A job that installs nothing and runs no test —
   change detection, and the aggregates — reads the light variable first and
   falls back to the heavy one; every other job reads the heavy one. An adopter
   who sets neither variable, or only the heavy one, still gets a label that
   exists, which is why the default at the end of the chain is public and
   GitHub-hosted whichever class the job is in. An unknown label does not fail a
   run; it queues it forever.

   Which class a given job is in is not pinned here. It is the job's `runs-on`
   string, which `ALLOWED_JOB_SHAPE` holds per job, so a job moved between
   classes fails that pin and the failure names the job.

4. Per matrix: fail-fast: false, the axis and its values. The cancel rule alone
   leaves a substituted leg — `check: [shape, shape]` runs one checker twice
   and reports two green legs — indistinguishable from the declared set.
5. Per lane that invokes QFAI: the subcommand, the `--profile` value, the
   `--fail-on` threshold and the condition that selects it. Two invocations of
   one subcommand are told apart by the matrix leg and the event their step
   names, so a step that loses its condition runs an invocation the shape did
   not declare.
6. Per lane: the condition that governs whether it runs. For an ordinary lane
   that is what makes it inert — the condition that keeps it declared but
   skipped when the adopter has not opted in. For an aggregate lane, which must
   run whatever the jobs it aggregates concluded, it is the always-run condition
   and the exact `needs` list.

   One clause is admitted beside either of those and is neither: the close gate,
   `github.event.action != 'closed'`. A closed pull request starts a run only to
   cancel the one its last push left going, so every lane that costs a runner
   declines it — including an aggregate, whose `always()` would otherwise outlive
   the cancellation and report a verdict on a pull request nobody is merging. It
   gates on the event rather than on the adopter's opt-in, so a lane carrying it
   and nothing else is still an ordinary lane whose opt-out is deletion.

   A lane may also be **scoped to the change**: skipped when a job of the same
   file has read the name-only diff and found nothing the lane reads. That is not
   an opt-in — the lane runs in every repository whose change can reach it, and
   deletion stays the opt-out — so it is a third answer rather than a variant of
   the first. Two things bound it. The scope has to fail open: a missing base, a
   shallow clone, a failed diff or a path the scope does not recognise runs the
   lane. And the lane's aggregate reads the scope as well as the lane's result,
   treating a skip as green only where the scope said, explicitly, that nothing
   changed — so a scope job that failed or reported nothing cannot turn a lane
   that did not run into a pass.

   A job that reads the diff for its lanes — the document scope, the test
   detection — may answer "nothing to run" for one more case: a push to the
   default branch in a repository whose `QFAI_CI_PUSH_POLICY` variable is
   exactly `protected`. That value is the adopter's statement that every merge
   passed these checks on a pull request first. Any other value, or none, reads
   the diff as before. The answer travels through the same output, so the
   aggregate's rule above is unchanged, and `qfai validate` still runs on that
   push as the post-merge check.

7. The third-party `uses:` set, as an **allow-list** against the closed
   sanctioned set (one entry today, the package-manager setup action). Never as
   a count of zero: a count fails on the entry the policy legitimately keeps.
8. Zero secret declarations, secret-context references and secret-inheritance
   uses across the set.
9. No shipped file references another shipped file (`DTC-25` — the absent
   target would turn the referencing workflow into a parse error with no repair
   path under create-only install).
10. Per aggregate: the external check name adopter branch protection names.
    That is the job's `name:` and not its id, so renaming it satisfies every
    other dimension and makes the required check unreachable.

Dimension 5 has a subject in exactly one shipped file: `qfai-validate.yml`,
whose lane carries both invocations of the validate subcommand — the wide scan,
and the drift gate the wide scan does not evaluate. Each invocation runs in its
own matrix leg, selected by profile, and the drift leg exists on pull requests
only. What this dimension pins is the list of invocations the lane carries, in the
order the file declares them, so an invocation added, removed or reordered is
drift whichever one it is. It says nothing about the order they run in, and two
invocations in separate legs run concurrently. Which leg runs an invocation, and
which event selects that leg, are pinned by
`ALLOWED_JOB_SHAPE` and `ALLOWED_STEP_SHAPE` in
`packages/qfai/tests/helpers/shippedLaneCommands.ts` rather than here.
Those values are asserted today as ad-hoc strings in
`packages/qfai/tests/assets/assets.test.ts` (`DTC-26`); the gate **subsumes and
replaces** those assertions rather than running alongside them, and the moved
assertions keep their test-case annotation.

The other two shipped files invoke no QFAI subcommand — the test orchestrator's
lane runs a script the adopter declared, through the adopter's own package
manager, and the document lane runs the two checkers the package ships as `node`
programs. For them the declared shape states an EMPTY invocation
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
the reviewer SSOTs — a lockstep change not yet made. Until it lands, the gate
surfacing them without a justification demand is a **known temporary
divergence, not a principle**. The owning spec records the deferral and names
every SSOT that must move together; see `spec-0015`.

## 7. Detection surface

`qfai doctor` owns the adopter-facing report. See
`.qfai/spec/03_contract/cli/qfai-doctor.md` §`workflows.integrity`. The state
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

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Examples                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| BR-0060 | 配布 workflow の全 job は job-reachable な `permissions:` ブロック（必要最小 scope、orchestrator の verdict job は empty permission map）と `timeout-minutes` を宣言する。artifact upload を持つ場合は cancellation で skip し、欠損ファイルを許容し、retention を 7 日以下にする。NFR-C0007 の 1 プロパティ（bounded かつ least-privileged）を配布側で表現したもので、CLI-WFSET §5 dimension 3 が gate 側の operand になる                                                                                                                                                                                                                                                                                               | EX-0002-0001-01                  |
| BR-0061 | 配布 workflow の全 checkout step は `persist-credentials: false` を設定する。full history が必要な場合は当該 job 単位で要求し、workflow の default にはしない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0002-0001-02                  |
| BR-0062 | 既存の lockfile 検出 `cache:` 式と lockfile-aware install 分岐（pnpm / yarn Berry / yarn Classic / npm + no-lockfile）は保持し、新規配布ファイルへ同形で拡張する。単一 package manager 形式への置換を禁じる                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0002-0006-01                  |
| BR-0063 | 配布 workflow の全 action 参照は 40-hex commit SHA に pin する。floating tag（major / minor / branch）参照を残さない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0002-0002-01                  |
| BR-0064 | Every pinned action has a readable version in its step `name:` without a leading `v`. No version-bearing pin trailer is placed in shipped comments; shipped text satisfies the unchanged version-leakage guard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0002-0002-04                  |
| BR-0065 | 配布 set の third-party `uses:` は closed sanctioned set に限定する。set の根拠は「adopter の package manager を runner に載せる first-party action が存在しない」ことのみで、現時点の entry は package-manager setup action 1 件。判定は allow-list として行い、count-of-zero では行わない（zero 判定は正当に残す 1 件で即 red になる）。他の全参照は first-party                                                                                                                                                                                                                                                                                                                                                        | EX-0002-0002-02                  |
| BR-0066 | 配布 pin の解決のために leakage guard の pattern を narrow せず、pragma を新設せず、allow-list entry も追加しない。配布側の綴りが guard に合わせる（逆向きは禁止）。guard の pattern 集合を変更する場合は 3 code site + 規約文書を 1 PR で動かし、同じ diff にテンプレート編集を含めない（NFR-C0005）                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0002-0002-03                  |
| BR-0067 | 配布 workflows ディレクトリの全 entry 名は `^qfai-[a-z0-9-]+\.yml$` に一致する。ただしこの prefix は **reservation notice であり selector ではない** — 衝突が文書から予見可能であるために存在し、write / removal の入力には決してならない（CLI-WFSET §1）。配布 `.github/` の直下 child は `workflows` のみ（`scripts/verify-pack.mjs` の `allowedRootGithubEntries`）であり、したがって composite-action テンプレートは配布しない                                                                                                                                                                                                                                                                                        | EX-0002-0003-01                  |
| BR-0068 | どの配布ファイルも他の配布ファイルを参照しない。配布 set は 2 つ以上のファイルから成り、layer 分離は orchestrator ファイル**内の job / matrix leg** として表現する。理由: 参照先不在は参照側を parse error にし、create-only install に修復経路がないため、参照禁止が部分 install を「単に不完全」に留める条件になる                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0002-0003-02                  |
| BR-0069 | 各配布 test lane は宣言され、対応する layer 名 adopter スクリプトの存在を条件とする false 条件で inert にする。layer の credential 属性を鍵にしない（宣言済みスクリプトを鍵にすることが set を構造的に credential-free にし、layer 分類の決定を待たない条件）                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0002-0003-03                  |
| BR-0070 | Exactly three shipped jobs declare a dependency install: the document-check job, the test lane and the validation job. Every other job installs nothing: change detection, the document scope and each file's aggregate. Counted as job instances after matrix expansion, with the test lane at its bound of five layer legs, the installs run nine times on a pull request and eight times on a push. Across the whole set there is no secret declaration, no secret-context reference and no `secrets: inherit`                                                                                                                                                                                                         | EX-0002-0003-04                  |
| BR-0071 | 配布 change detection は base commit に対する name-only diff + JSON filtering で実装し、third-party action を使わない（pin と trailer 問題を adopter に転嫁しないため）。Full history is requested only by the jobs that take a name-only diff — the orchestrator's detection job and the document scope job — and by the validation job on a pull request, where the drift profile compares the branch against its base                                                                                                                                                                                                                                                                                                  | EX-0002-0004-01                  |
| BR-0072 | diff 失敗・base ref 到達不能・shallow clone・認識セット外のパス変更は fail open とし、warning annotation を出して full lane superset を走らせる（degraded run が「確立していない結果を green と主張」しないため — NFR-C0013 の substitution test）                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0002-0004-02                  |
| BR-0073 | detection job は同一ファイル内の verdict job と co-located させる（dependency edge は workflow ファイルを越えられない）。verdict は empty permission map と always-run condition を持ち、空 matrix で exit 0 する。対にしない fan-out は rejected shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0002-0004-03                  |
| BR-0074 | 配布 set の全 runner selector は repository variable を読み、その default は public GitHub-hosted label とする。organization-private label literal は set のどこにも現れない。誤値は fail fast せず無期限 queue になるため、リスクは knob ではなく default が負う                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0002-0005-01                  |
| BR-0075 | 各配布ファイルは header block に、読む repository variable 名・その default・誤値時の無期限 queue 失敗モード・`packageManager` manifest field の前提条件・担当 layer・inert 化の条件・fail-open 挙動を記載する（CLI-WFSET §5 dimension 2）。かつ header は package が `engines` で宣言していない Node support floor を主張しない                                                                                                                                                                                                                                                                                                                                                                                          | EX-0002-0005-02, EX-0002-0001-03 |
| BR-0076 | adopter の Node version ファイルが存在すればそれを優先し、不在なら documented literal を使って warning annotation 付きで継続する（fail open）。無条件のファイル由来指定は version ファイルを持たない adopter 全員で Node setup を fail closed させるため禁止                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0002-0006-02                  |
| BR-0077 | package manager の version が解決できない場合は fail closed とし、`packageManager` manifest field を修正箇所として名指しする actionable annotation を出して停止する。何もインストールされない状態での継続は computed していない結果の報告になるため許さない                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0002-0006-03                  |
| BR-0078 | write set は in-binary の `SHIPPED_WORKFLOW_NAMES`、prune set は in-binary の `RETIRED_WORKFLOW_NAMES`（過去 version が配布し現行が配布しない名前）に由来する。名前は同一変更で前者を離れて後者に入り、どちらにも無い名前は QFAI のものではない。adopter のディスク上で `qfai-*` を glob して set を計算することは禁止。名指しの hazard: `init.ts#pruneStaleQfaiWrappers` は 3 箇所の call site で `entry.name.startsWith("qfai-")` を使っているが、この predicate を workflows ディレクトリの `pruneMatchingEntries` に渡すことは CLI-WFSET §1 が明示的に禁止する。workflows ディレクトリは QFAI が中身を全所有する生成 wrapper ディレクトリではなく、adopter が著したディレクトリに少数の named file を書き込む先である | EX-0002-0007-01                  |
| BR-0079 | provenance は `.qfai/install-provenance.json`（adopter ツリー、**tracked**）。The managed block ignores it on no line and re-includes it with `!.qfai/install-provenance.json`: an ignored record lets a colleague's init restore files the adopter deleted. `.qfai/state.json` は ephemeral / git-ignored なので不適。記録するのは QFAI が書いた bytes の sha256（現在のファイルの digest ではない）と `installedByVersion` と `installedAt`。`schemaVersion` field は置かない。reader はファイル不在・`workflows` キー不在・不正 JSON を **empty** として扱い、throw しない（empty = 全て adopter-owned = fail-safe 方向）。overwrite / prune の前に必ず参照する                                                        | EX-0002-0007-02                  |
| BR-0080 | file state は provenance entry の有無とディスク上の状態の 2 観測から `absent` / `adopter-owned` / `installed` / `modified` / `declined` の 5 状態に決まる（CLI-WFSET §3）。`absent` と `declined` は別状態で別に報告する。`declined` は後続 install で再作成せず、stale drift として報告せず、prune もしない。prune は 5 状態すべてで never。`modified` は 2 原因（新テンプレート出荷 / adopter 手編集）を持ち、record の sha256 がそれを区別する                                                                                                                                                                                                                                                                         | EX-0002-0007-03                  |
| BR-0081 | この配布ディレクトリに対する write / removal は `copyTemplateTree` / `copyTemplatePaths`（`src/cli/lib/fs.ts`）と `pruneMatchingEntries`（`src/cli/commands/init.ts`）のみを経由する。当該コード経路は自前の `copyFile` / `writeFile` / `rm` / `unlink` 呼び出しを持たない。create-only の `force: false` literal は本 contract の load-bearing 要素であり `options.force` に持ち上げない。これは preference ではなく observable な acceptance criterion であり、create-only からの逸脱が reversal ではなく narrowing である条件                                                                                                                                                                                          | EX-0002-0007-04                  |
| BR-0082 | structural contract gate は、テストスイート内の 1 つの宣言された期待形状に対して各配布ファイルを diff する。**値の SSOT は test suite 側の 1 箇所**であり、spec も contract も値を再記載しない。The dimension set the gate must pin is the ten items of CLI-WFSET §5, and it is closed; AC-0003-0035 names them。既存 asset test の ad-hoc string assertion は subsume して置き換え、その test-case annotation は保持または再登録する                                                                                                                                                                                                                                                                                     | EX-0002-0008-01                  |
| BR-0083 | structural contract gate は `pnpm ci:lint` から invoke する。`pnpm ci:gate`（release workflow のみが invoke する）には置かない（DTC-18、NFR-C0014）。failure code は `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` で bare `R-` lint namespace に属する。catalog 所属は **severity class** で決まり emitter identity では決まらない（script 由来の error-class code は現に member）ため本 code も catalog に属すべきだが、登録は lockstep 変更として deferred（`spec-0015` `OQ-0015-0001`）。現時点の不在は一時的乖離であり恒久的性質ではない                                                                                                                                                                                          | EX-0002-0008-02                  |
| BR-0086 | The independent checks inside one shipped file are declared as matrix legs of a single job carrying `fail-fast: false`, and each leg selects exactly one checker command or validation profile. The set of legs covers every command the file ran before: none is dropped and none appears twice. A leg that only some events select names the event that selects it                                                                                                                                                                                                                                                                                                                                                      | EX-0002-0003-05                  |
| BR-0087 | The job carrying a shipped file's existing external check name declares an always-run condition and the exact `needs` list of the job it aggregates, holds no permissions, and succeeds only when the rolled-up result of that dependency is `success`. A failed, cancelled or skipped dependency fails it, and so does an unset result. The one exception is a lane scoped to the change: its aggregate also reads the scope job's output, and a skipped lane is green only where that output is exactly `false`                                                                                                                                                                                                         | EX-0002-0003-06                  |
| BR-0428 | The shipped third-party `uses:` rule MUST assert membership in a closed sanctioned set. Expressing it as a count of zero MUST be rejected, because it would fail the lane on the one action the shipped pin policy legitimately keeps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0002-0018-10                  |
