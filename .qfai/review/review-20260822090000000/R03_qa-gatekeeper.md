# R03 — qa-gatekeeper, round 16, spec-0017 (ATDD stage gates)

**Revision at start:** `0132370d`.
**Emphasis:** section 2 (the digest boundary), sections 5 and 6 (the three repaired guards, and the record).
**Method:** plants into `packages/qfai/assets/init/root/.github/workflows/**` (the partition this role owns),
measured against every test that reads the shipped workflow tree, then restored from a copy taken first
(`tmp/r16/orig/`). No `git checkout` was used on any path.

## Verdict

**REVISE.**

**A gate that passed, stated as the definition requires:** the scoped ATDD gate. Re-run at `0132370d`:

```text
node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
counts: info=2 warning=0 error=1
[error] QFAI-ATDD-112 ... SPEC-0017:TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070
[info]  QFAI-ATDD-117 (11 Unit/Component TCs, out of scope)
[info]  QFAI-PROFILE-001 (partial profile)
run-log: .qfai/report/run-20260822073804220
```

Exactly as § "P7 quality gates" records it: `info=2 warning=0 error=1`, `QFAI-ATDD-112` alone, on eight
TCs. `.qfai/report/validate.log` was restored afterwards with `git show HEAD:<path> > <path>`; its
sha256 is back to `c2d3eb8b…`, and `git status --porcelain` is empty.

Two blocking findings and two majors follow. The blocking pair are planted channels that shipped.

### B1

**The verdict job's dependency edge and its `QFAI_NEEDS_JSON` value are both unpinned, and either one
alone turns the aggregate green over nothing. Planted; shipped through 5463 tests.**

Section 2 asks for a channel neither list covers. `ALLOWED_STEP_BODIES` pins a `run:` body to
`file#job [step name]`; `ALLOWED_ACTION_STEPS` pins an action to `file#job`. Neither reads a job's
`needs:`, and neither reads the VALUE of an `env:` key whose NAME is enumerated. The verdict is
constituted by exactly those two things:

```yaml
verdict:
  needs: [detection, unit, component, integration, api, e2e]
  ...
      - name: Aggregate lane results (green on skip)
        env:
          QFAI_NEEDS_JSON: ${{ toJSON(needs) }}
```

Two one-line edits, planted into `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`:

- **(a)** `needs: [detection]` — the aggregate no longer depends on, waits for, or receives any lane
  result. `toJSON(needs)` still serializes, so nothing downstream notices.
- **(d)** `QFAI_NEEDS_JSON: ${{ toJSON(needs.detection) }}` — the body's entire input is replaced by a
  record whose `result` is `success` by construction, so
  `grep -Eq '"result": *"(failure|cancelled)"'` can never match.

Each is independently sufficient: a failed lane no longer reddens the check the adopter's branch
protection is on. That is the "green check over nothing" `BR-0017-0032` is written against, arriving
through the one job whose only purpose is to be that check.

**Measurement.** Both, plus `B2`'s two, planted simultaneously and the full suite run:

```text
npx vitest run          (packages/qfai, all seven projects)
Test Files  462 passed | 8 skipped (470)
     Tests  5412 passed | 51 skipped (5463)
exit 0
```

`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` green, including the body-digest bijection, the
action-step pin, the program set and `refusals()`. So is
`tests/integration/shippedWorkflowDetection.test.ts`, which is the guard closest to this: it asserts
`verdict.needs` **contains** `"detection"` (line 522) and executes the verdict body against its own
injected `QFAI_NEEDS_JSON` stub (lines 490-500) — so it never reads the lane edges the shipped file
declares, and never reads the value the shipped file supplies. A stub is the right instrument for the
body's logic and the wrong one for the body's input; nothing reads the input.

**What would close it.** Pin `needs` per job the way bodies are pinned — a sorted list of
`file#job -> [needs]` pairs — and pin each enumerated `env:` NAME to its shipped VALUE. The value pin
is the smaller and more urgent half: `ALLOWED_STEP_ENV`'s docstring argues "the refusal is by NAME
because the name is the channel", which is true of `NODE_OPTIONS` and false of `QFAI_NEEDS_JSON`,
whose name is inert and whose value is the whole input.

**Restored.** `qfai-tests.yml` sha256 is back to `581608a7…`, matching the copy taken before any plant
(`tmp/r16/orig/`) and matching `HEAD`.

### B2

**The trigger set and every job's `permissions` value are unpinned. `pull_request_target`,
`workflow_call` and `contents: write` + `id-token: write` all shipped in the same run.**

`ALLOWED_WORKFLOW_KEYS` admits `on`; `ALLOWED_JOB_KEYS` admits `permissions`. `readUses` enumerates
the KEYS at all three levels and never descends into either value. The two other guards that touch
this area stop just short:

- `tests/integration/shippedWorkflows.test.ts` requires a *reachable permissions map* and that the
  verdict's is *empty* — never what any other job's map contains;
- the E2E's `US-0017-0006` asserts `Object.keys(on)` **contains** `pull_request` — never what else it
  contains.

Planted into `qfai-tests.yml`:

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
  pull_request_target:      # planted
  workflow_call:            # planted

  detection:
    permissions:
      contents: write       # planted (was: contents: read)
      id-token: write       # planted
```

This does not add a `run:` line or a `uses:` step, so the boundary is structurally blind to it — the
same shape as round 15's `uses:`-only step, one level up. What it changes is the authority every
already-enumerated body executes with, and the event that grants it: `pull_request_target` runs the
file in the base repository's context with its secrets and a read-write token on a fork-originated
event, `workflow_call` makes the whole orchestrator invocable from any other workflow with that
caller's permissions, and the two `write` scopes are the token those bodies then hold. The shipped
file's own comments — "Reads the repository only", "Least privilege for a test lane: read the
repository, write nothing back" — are now false in the artifact an adopter receives, and no assertion
reads them either.

Measured in the same `5412 passed / 51 skipped, exit 0` run as `B1`. Restored with `B1`.

**What would close it.** The same move the keys already took, one level down: enumerate the shipped
`on:` event set and each job's permission map as values, not as key presence. Both are ours to state
exactly — two events and four maps — which is the argument `ALLOWED_WORKFLOW_KEYS` makes for itself.

### M1

**`error=50` and `QFAI-REVIEW-007 45` are the pre-fix counts, presented as current, at five sites —
and the paragraph beneath the table says the fix landed.**

Section 6 asks whether the count is still right. Re-measured at `0132370d`:

```text
node packages/qfai/dist/cli/index.mjs validate --profile full --fail-on error
counts: info=4 warning=403 error=49        (record: error=50)
run-log: .qfai/report/run-20260822073815258

  44  QFAI-REVIEW-007      (record: 45)
   2  QFAI-REVIEW-004      (record: 2)   OK
   1  QFAI-REVIEW-005      (record: 1)   OK
   1  QFAI-ATDD-112        (record: 1)   OK
   1  QFAI-ATDD-111        (record: 1)   OK
```

The record refutes itself in place. § "The full profile" says:

> exactly one of its forty-five belongs to this stage: round 14's `summary.json` carried
> `revision_form: "commit"` … **It is corrected and the pack re-sealed.** The other forty-four are
> packs other stages wrote

44 is exactly "the other forty-four". So the fix landed, and the number beside it was never re-run —
in the block whose first sentence is "Re-run after the last artifact changed, twice, because this block
was wrong about its own currency both times." This is the same defect round 15 found here (`error=4`
carried from round 4), one round later and one digit smaller.

Five sites carry it, `.qfai/evidence/atdd-spec-0017.md`:

| line   | text                                                              |
| ------ | ----------------------------------------------------------------- |
| 2056   | `node ... validate --profile full    error=50`                      |
| 2365   | ``validate --profile full` reports **`error=50`** at this stage's HEAD`` |
| 2374   | `QFAI-REVIEW-007   45`                                              |
| 2384-86| "exactly one of its **forty-five**" / "the other **forty-four**"    |
| 2573-74| "One of the **forty-five** … the only one of the **forty-five** this stage wrote" |

Line 2384-86 is the one that needs rewording rather than renumbering: with the fix landed, **none** of
the 44 belongs to this stage, so "exactly one of its forty-four belongs to this stage" would be false
too. The honest statement is that 44 remain, all written by other stages, and the one this stage wrote
is cleared.

Nothing derives any of it. `retractedClaims.test.ts`'s `COUNTED_CLAIMS` holds one entry (the pack
count, which does verify: `Sixteen packs, one per round` against 16 directories). The full-profile
figure is the record's largest un-derived number and the only one whose value moves when this stage
does its own work — which is the argument for a `COUNTED_CLAIMS` entry over it, not for re-typing 49.

### M2

**Class C's roster is checkable in one direction only, and the comment above it claims both.**

Section 5 asks exactly this. `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:366-381` says:

> the record must name each one and the table must agree: a member the prose does not name is a cell
> reclassified without a reason, **and a name with no member is a reason for a cell that moved.**

The assertion under it is:

```ts
expect(
  classC.filter((cell) => !namedInProse.has(cell)),
  "a class C cell the record does not name with its own reason",
).toEqual([]);
```

`member -> name`. There is no `name -> member`. `grep -n namedInProse` returns two lines: the
definition at 370 and this filter at 379.

`CLASS_C_ROSTER` has the same asymmetry. `PROPERTIES.C` is `(row, column) => CLASS_C_ROSTER.has(...)`,
evaluated only for cells the table already declares class C — so it is `member -> roster`. A roster
entry with no corresponding member is unreachable by any assertion in the file.

**Why it matters concretely.** Rescore `US-0017-0007 × Error path` to anything other than `❌`/class C
and the table's class-C size drops, which line 273 catches against the record's stated sizes. What it
does not catch is that `CLASS_C_ROSTER` still names the cell and
`.qfai/evidence/coverage-depth-spec-0017.md:192` still carries its bullet — a justification standing
for a cell that no longer has that class. That is the exact state the comment says is checked, and it
is the state round 15 found for the roster's predecessor ("a plainly untested cell filed under it …
the suite stayed green").

Two assertions close it, both one line: `namedInProse` entries that are not class-C members, and
`CLASS_C_ROSTER` entries that are not class-C members. The second is the load-bearing one — the roster
is a literal in the test, so it is the copy most likely to go stale unread.

### m1

**Both lists are sorted, so step ORDER within a job is invisible to the boundary. The two orderings
that matter are pinned by a sibling, and only those two.**

`bodies.sort()` and `actionSteps.sort()` are compared to sorted literals. A permutation of steps inside
one job is therefore a no-op for both lists by construction — which is the same class as the
permutation round 15 found across jobs, one scope smaller, and the boundary's own argument covers it:
"a body is reviewed for the step it runs in, so the step is part of what was reviewed." A body is also
reviewed for the position it runs in; `Install dependencies (lockfile-aware)` before
`Resolve the package manager` is a different act from the same body after it.

Two order plants, measured separately against all 87 workflow-reading test files:

| plant                                                            | boundary | outcome |
| ---------------------------------------------------------------- | -------- | ------- |
| `pnpm/action-setup` moved above `Resolve the package manager`      | green    | caught by `shippedWorkflowPortability.test.ts:518` |
| `actions/setup-node` moved above `Resolve the Node version`        | green    | caught by `shippedWorkflowPortability.test.ts:318` |

Reported as `m1` rather than blocking **because both were caught** — but by a sibling that pins two
named orderings, not by anything general. The boundary itself was green in both runs
(`spec0017LayeredCiScaffoldE2E.test.ts` passed each time), and the third ordering nobody has named yet
has nothing over it. Adding the step INDEX to the location string in both lists costs one token per
entry and makes the property general instead of enumerated case by case.

### m2

**Deleting the verdict table lost the revision each round reviewed, and `### Findings per round` does
not carry it.**

Section 6 asks what is lost. The table deleted at `45dcb547` had four columns; `### Findings per round`
carries three of them (round, reviewer, verdict) and adds two more (findings, id families). The fourth
was `revision`. Checked against the record as it now stands — of the twelve revisions the deleted table
named, four occur **nowhere** in `.qfai/evidence/atdd-spec-0017.md`:

```text
05a97202  round 9    0 occurrences
a66be5c6  round 10   0
4b58eadd  round 11   0
45e6f041  round 12   0
```

The other eight survive only incidentally, cited for other reasons (`9a37421c` as P1d's passing
revision, `cb91e089` in the `retractedClaims` derivation, and so on).

This is recoverable, and that is why it is `m2` and not a major: every pack's `summary.json` carries
`"revision"`, and `### Findings per round`'s own rule already says the rows are "counted from the packs
on disk". Verified for all four: `review-20260821120000000` → `05a97202`, `…140000000` → `a66be5c6`,
`…160000000` → `4b58eadd`, `…180000000` → `45e6f041`. The fix is one sentence in that section saying
the reviewed revision is each pack's `summary.json#revision` — which makes the deletion lossless
instead of merely recoverable by someone who thinks to look.

### m3

**The step NAME is in one pin and not the other, and the failure message does not tell a reviewer
which kind of change they are looking at.**

Section 2 asks whether naming the step is right. It is, and the reason is that the two columns are
separate: a cosmetic rename moves the location string while the digest is byte-identical on both sides
of the diff, so a rename is visibly a rename and a body edit is visibly a body edit. The pin does not
train pasting; it distinguishes the two cases better than a name-free pin would.

Two smaller things around it are wrong:

- **The message does not say so.** "each reviewed body must appear exactly once, at the step it was
  reviewed for" reads identically for a rename and for a swapped body, and the diff it prints is two
  long sorted lists. One clause — "if only the text after `::` is unchanged, this is a rename" — is the
  whole cost of making the distinction legible at the moment someone is deciding whether to paste.
- **`ALLOWED_ACTION_STEPS` does not carry the name at all** (`${uses} @ ${id}`), so an action step can
  be renamed freely while a `run:` step cannot. Nothing turns on it today — the pin's job is the
  action/job pair — but the asymmetry is undocumented, and the docstring says the action step is
  "pinned where a `run:` body is pinned", which it is not.

### A1

**What I measured and found correct.** Recorded because a reviewer's silence about a number is
indistinguishable from not having run it, which is the failure this record's own P7 block catalogues.

| claim (§ P7 quality gates, § The full profile, § Review packs)   | measured at `0132370d`               | verdict |
| ----------------------------------------------------------------- | ------------------------------------- | ------- |
| scoped gate `info=2 warning=0 error=1`, `QFAI-ATDD-112` on 8 TCs   | exactly that                          | OK      |
| `pnpm -C packages/qfai test:e2e` — 1445 passed / 16 skipped        | 1445 passed / 16 skipped, 85 files    | OK      |
| `--project integration --project unit` — 1219 passed / 19 skipped  | 1219 passed / 19 skipped, 173 files   | OK      |
| `e2e callsites at this tree: 881`                                  | 881, re-derived from the workspace globs | OK   |
| `QFAI-REVIEW-004` 2, `QFAI-REVIEW-005` 1, `-ATDD-111` 1, `-112` 1  | 2 / 1 / 1 / 1                         | OK      |
| `**Sixteen** packs, one per round`                                 | 16 dirs `>= review-20260820200000000` | OK      |
| `QFAI-ATDD-111` unscoped = 11 US across four specs, spec-0017 owns none | SPEC-0003 ×8, -0006 ×1, -0008 ×1, -0015 ×1 = 11 / 4 specs | OK |
| `QFAI-ATDD-112` unscoped = 15 TCs across four specs, 8 this spec's | 0003 ×1, 0008 ×4, 0015 ×2, 0017 ×8 = 15 | OK    |

**The two `node -e` payload digests (§ 3, second bullet), re-derived from the shipped tree** by
replaying `tokensOf` + `payloadDigest` over the parsed YAML, including the character counts the
comments state:

```text
qfai-tests.yml#detection    [Probe layer-named test scripts]     chars=630   7f72970abbe4e9a0…
qfai-validate.yml#validate  [Resolve the package manager …]      chars=1039  9cc40c1d1704f836…
```

Both match `ALLOWED_NODE_PAYLOADS` and both stated character counts are exact.

**The Delta Rejected Guard tie (§ 5, fourth bullet) is sound — the third version works.** Falsified on
a shadow copy rather than by planting in the subject, since two siblings are reading that file this
round. The section slice terminates at `\n## Decisions made` (offset 8606, not the end of file), and
the first column yields 13 entries covering all 9 `TRACKED` + 2 `HELPERS`:

```text
baseline                                  listed=13  missing=[]                    GREEN
row deleted                               listed=12  missing=[shippedLaneCommands.ts]  RED
backticks stripped from the first column   listed=12  missing=[shippedLaneCommands.ts]  RED
a `## ` heading inserted above the table   listed=0   missing=[all 11]              RED
```

**The corpus count (§ 5, first bullet) is derived and the four sites are live.** `MECHANISMS` holds 29;
the record states 29 at four distinct offsets (80009, 80320, 80364, 80509) and `wrong` is empty. It can
no longer pass over a wrong number in a matched site, and the `SITES = 4` floor means a rewording that
escapes the patterns reddens rather than silently dropping a site. The residual cost is the intended
one: adding a fifth correct sentence about the corpus also reddens.

**The retracted-claims guard's own inertness question (§ 5, third bullet) is guarded.** `has no entry
that matches nothing, in either direction` requires every `RETRACTED` needle to be either live or
declared `RETIRED`, and the reverse, and it passed in the full run. So "is any of them inert" is
answered by the instrument. The second half — "is any refuted claim standing where none of them
matches" — is answered **yes**, and it is `M1`: `error=50` / `forty-five` stands at five sites, refuted
by re-running the command, with no needle and no `COUNTED_CLAIMS` entry over it.

**The two dated in-place corrections (§ 6, third bullet) are honest, and neither changed a decision.**
`CR-20260820-0012` lines 155 and 165 and `DR-0017-0010` line 61 each quote the superseded wording,
name the round after which it was corrected, and give the measurement that refutes it. I re-derived
both supporting figures independently (the `QFAI-ATDD-111`/`-112` rows above) and both are right. The
CR still recommends the same split and the DR still records the same branch-3 outcome; the corrections
touch supporting measurements, not the decisions. `P1d` is not re-opened.

### A2

**A side effect of the suite the record's own trap note does not cover.**

§ "Commands executed" warns that running `validate --profile atdd … --spec 0017` rewrites the tracked
`.qfai/report/validate.log`. It is wider than that: **`npx vitest run` rewrites it too.** After the
full-suite run — with no validate command of my own yet issued — `git status --porcelain` reported

```text
 M .qfai/report/validate.log
```

against an otherwise clean tree. So any reviewer or CI step that runs the suite dirties a tracked file,
and a reviewer who reads `git status` to check their own plant was restored will see a file they never
touched. Worth one sentence beside the existing note, since the existing note names only the CLI and a
reader will conclude the suite is safe.

I restored it with `git show HEAD:.qfai/report/validate.log > .qfai/report/validate.log`; sha256 is
back to `c2d3eb8b24378d7dda61725c8640f7895aa855a7ed93d7c8ce7e31277a1aafc9`.

## Method and restoration

**Plants, all inside the partition this role owns.** Copies were taken first, to `tmp/r16/orig/`, and
every restore was `cp` from that copy — never `git checkout`.

| # | file                | plant                                                      | restored |
| - | ------------------- | ---------------------------------------------------------- | -------- |
| 1 | `qfai-validate.yml` | `pnpm/action-setup` above `Resolve the package manager`      | yes |
| 2 | `qfai-validate.yml` | `actions/setup-node` above `Resolve the Node version`        | yes |
| 3 | `qfai-tests.yml`    | `verdict.needs: [detection]`                                 | yes |
| 4 | `qfai-tests.yml`    | `on:` + `pull_request_target:` + `workflow_call:`            | yes |
| 5 | `qfai-tests.yml`    | `detection.permissions: contents: write` + `id-token: write` | yes |
| 6 | `qfai-tests.yml`    | `QFAI_NEEDS_JSON: ${{ toJSON(needs.detection) }}`            | yes |

Plants 3-6 were run together (they are independent channels; had the run reddened I would have
bisected — it did not). Final state:

```text
git rev-parse --short HEAD          0132370d          (unmoved; recorded at start and at finish)
git status --porcelain              (empty)
qfai-tests.yml     sha256           581608a7e1dbbb7249768d414018b495175d978ff3f0175398154a937b53f9ee
qfai-validate.yml  sha256           08e79f77a91b59c60b15d3e517341dcf18561b09397f804564f3a58c9bd1c7f6
```

Both hashes equal the pre-plant copies and `HEAD`. Nothing is left planted. Scratch is under
`tmp/r16/` and nothing was committed. The subject did not move while this round ran.

## Sign-off

- [x] Review verdict is explicit — **REVISE**, with the passing gate stated (scoped ATDD gate,
      `info=2 warning=0 error=1`).
- [x] Findings cite concrete artifacts or evidence — every one carries a file, a line range or a
      recorded command output.
- [x] Required gates and residual risks are recorded — the scoped gate passes; the full profile is
      `error=49` and blocks `build`; the shipped-workflow boundary admits four unpinned channels, two
      of which neutralise the aggregate check an adopter's branch protection would rely on.

