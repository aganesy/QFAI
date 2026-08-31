# R03 — qa-gatekeeper (round 2, spec-0017 / `/qfai-atdd`)

- Role: `qa-gatekeeper`, independent, non-edit
- Round: 2
- Revision under review: `56daee8d` (`git rev-parse --short HEAD` at start **and** at end — HEAD did not move)
- `git status --porcelain` at start: **empty**. At end: **empty**.
- Domain: validate / coverage / runtime-proof / oracle-strength gates
- Scratch: `tmp/r03/**` only. Every oracle mutation reverted with a byte comparison; see § Mutation hygiene.

## Verdict: **REVISE**

Three blocking findings. Five of the seven things I was asked to attack survive my own falsification;
two do not.

| # | Finding | Class |
| - | ------- | ----- |
| `B1` | `wide.unbacked.length > 100` pins nothing, and reddens on its own repair | blocking |
| `B2` | The branch-3 entries have no `DR-*`, so P1d has no audit subject — and the "no longer deadlocked" claim is false | blocking |
| `B3` | "Rebuilt the scan around the verb" is false: the predicate is a five-member runner allow-list | blocking |
| `A1`-`A6` | advisories | non-blocking |

What **passed**: the Coverage Depth Matrix pinning test (`M1`-`M7` reproduced, plus my own arithmetic
re-derivation), the `US-0017-0003` behavioural assertion (`E6`-`E8` reproduced, plus two rounds the
stage did not measure), the 127 number (reproduced exactly by an independent implementation), the
scoped gate at `error=2` (reproduced at HEAD; the artifact is **byte-identical**), the ledger
cross-tabulation correction, the `US-0017-0007` withdrawal, and the re-seal (recomputed, both seals).

---

## 1. Assume every new claim is vacuous — what I broke and what I could not

### 1a. `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — SURVIVES

All seven claimed rounds redden and the prose control does not. Each planted alone, reverted with a
byte comparison, `git status` re-checked after each:

```text
M1   declared Status total drifts back to the wrong one        exit=1  1 failed | 3 passed   REDDENS
M2   a table row's Status is edited without its total          exit=1  1 failed | 3 passed   REDDENS
M3   the depth-cell count is overstated (38 -> 39)             exit=1  1 failed | 3 passed   REDDENS
M4   a reason class is resized, breaking the partition         exit=1  1 failed | 3 passed   REDDENS
M5   a justification heading for a FAIL row is deleted         exit=1  1 failed | 3 passed   REDDENS
M6a  the withdrawn story's STATUS scored partly covered        exit=1  4 failed (4)          REDDENS
M6b  the withdrawn story's Normal path scored partly covered   exit=1  2 failed | 2 passed   REDDENS
M7   the withdrawn claim re-added to the ledger                exit=1  1 failed | 3 passed   REDDENS
Mctl (control) a sentence added to the matrix prose            exit=0  4 passed (4)          reddens nothing
```

I also re-derived the arithmetic by hand rather than trusting either the file or its test.
`.qfai/evidence/coverage-depth-spec-0017.md:45-55`, counted per row:

| row | ❌ depth cells | class |
| --- | ---: | --- |
| `US-0017-0001` | 3 | Boundary=C, State+Comb=B |
| `US-0017-0002` | 1 | State=B |
| `US-0017-0003` | 2 | State+Comb=B |
| `US-0017-0004` | 6 | A |
| `US-0017-0005` | 6 | A |
| `US-0017-0006` | 6 | A |
| `US-0017-0007` | 7 | A (incl. `Oracle strength`) |
| `US-0017-0008` | 5 | A |
| `US-0017-0009` | 2 | State+Comb=B |

Sum **38**, matching `:107`. `Status` ❌ rows = `0004,0005,0006,0007,0008` = **5**. Status tally
`✅ 3 / ⚠️ 1 / ❌ 5`, matching the declared total at `:57`. Class enumerations at `:110-139`:
A = 6+6+6+7+5 = **30**, B = 4 State + 3 Combinatorial = **7**, C = **1**, total **38** — and the
enumerated members account for exactly the cells the table holds, with no cell in two classes.
Notably `US-0017-0002`'s `Combinatorial` is `⚠️` and is correctly excluded from class B.

**Verdict: the matrix is internally consistent, its total is derived, and the test that derives it
discriminates.** Round 1's `✅ 2 / ⚠️ 2 / ❌ 5` measurement was against the old table; the new one is
correct.

### 1b. The `US-0017-0003` behavioural assertion — SURVIVES, and is stronger than reported

`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:230-321`. Mutations in
`packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml:117-149`:

```text
E6   resolver stops probing adopter version files       exit=1  1 failed | 8 passed  REDDENS
E7   resolver stops publishing what it found            exit=1  1 failed | 8 passed  REDDENS
E8   setup-node takes a literal instead of the output   exit=1  2 failed | 7 passed  REDDENS
E9   the fallback falls open SILENTLY (::warning:: cut) exit=1  1 failed | 8 passed  REDDENS  <- not measured by the stage
E10  the fallback is indistinguishable from a pin       exit=1  1 failed | 8 passed  REDDENS  <- not measured by the stage
Ectl (control) a comment line inside the run body       exit=0  9 passed (9)         reddens nothing
```

`E6` was planted as the *precise* vacuity scenario: `for candidate in .nvmrc .node-version` →
`.nvmrc-disabled .node-version-disabled`, leaving the literal `.nvmrc` in the step's warning message
where the first repair's text scan matched it. It now reddens.

Oracle Strength Check applied to each: the mutation is inside the shipped step the row owns; it is
not a syntax error, a load failure or a deleted export; and the failing output names this row's own
selector and predicate —

```text
FAIL |e2e| … > E2E: an adopter receives no hard-coded Node version to drift from (US-0017-0003)
            > resolves the version by running the shipped step, not by naming a file in prose
AssertionError: the adopter's own version file must win — this is the whole of 'file-derived':
  expected '20' to be '23.4.1'          (E6)
  expected undefined to be '23.4.1'     (E7)
```

`E9` and `E10` are mine, not the stage's: they show the remaining two assertions (`:308-316`) also
carry power, so all five assertions in the `it` discriminate. **Admissible.**

### 1c. `B1` (BLOCKING) — the repo-wide "pin" pins nothing, and fires on its own repair

`packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:149-155`:

```ts
const wide = checkLedger(ledger, sources);
expect(wide.checked).toBeGreaterThanOrEqual(200);
expect(wide.unbacked.length).toBeGreaterThan(100);
```

The claims resting on it:

- `.qfai/evidence/atdd-spec-0017.md:464-465` — "the guard that measures it now ships, and **this
  repository's number is pinned by a test so it cannot drift silently in either direction**";
- `.qfai/decisions/CR-20260820-0011-…md:88-90` — Option 2 is "strictly weaker: the 127 stay
  unreported by CI, **visible only in this CR and in the pinned assertion** in
  `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`".

Both are false. I derived the admissible range over the exported pure `checkLedger`
(`tmp/r03/range.mjs`, `node tmp/r03/range.mjs`):

```text
claims  backed  unbacked  checked>=200  unbacked>100  TEST
   208      81       127          true          true   PASSES   <- today
   208     107       101          true          true   PASSES
   208     108       100          true         false   FAILS    <- 27 stories fixed
   208       0       208          true          true   PASSES   <- ledger backs NOTHING
   208     207         1          true         false   FAILS    <- a nearly-clean repo
   500      81       419          true          true   PASSES
 10000       0      9999          true          true   PASSES
   199       0       199         false          true   FAILS
```

Then in-repo, as real mutations against the real test:

```text
W1  60 MORE unbacked claims appended to the ledger (127 -> 187)   exit=0  10 passed (10)      reddens NOTHING
W2  27 of the 127 genuinely BACKFILLED (127 -> 100)               exit=1  1 failed | 9 passed REDDENS
```

`W2` planted the 27 annotations as a real comment block in
`packages/qfai/tests/e2e/spec0012PrototypingModeE2E.test.ts` — i.e. it performed exactly the
remediation `CR-20260820-0011` Option 1 prescribes ("a test exists and its annotation was never added
→ add the annotation", `:69-71`). The test that is supposed to protect the number **fails on the 27th
story fixed**, and is blind to the ledger getting 47% worse.

So the assertion is a **test that punishes its own fix** — the exact shape this stage rejected, twice,
in writing:

- `.qfai/evidence/coverage-depth-spec-0017.md:197-198` — "Asserting the absence was rejected
  deliberately: a test pinning 'no hygiene lane is invoked' fails the day someone correctly adds one."
- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:31-33` — "a test pinning 'no hygiene
  lane is invoked' would fail the day someone correctly adds one, which is a test that punishes its
  own fix."

**Required fix (either is acceptable):** pin it — `expect(wide.unbacked.length).toBe(127)` with the CR
named in a comment, so movement in *either* direction is a deliberate edit and the backfill updates
the number as it goes; or drop the two repo-wide assertions and delete the "pinned so it cannot drift
silently in either direction" sentence from `.qfai/evidence/atdd-spec-0017.md:464-465` and the
"pinned assertion" clause from `CR-20260820-0011:88-90`. Do not leave a loose bound described as a pin.

**The scoped half needs no change.** I confirmed it discriminates in both directions:

```text
G1  one spec-0017 test annotation removed (ledger line kept)   exit=1  1 failed | 9 passed  REDDENS
G2  one spec-0017 ledger line removed (annotation kept)        exit=1  1 failed | 9 passed  REDDENS
```

`:138-143` (`unbacked === []`, `checked === 8`) is a tight pin. The defect is confined to `:149-155`.

### 1d. `B3` (BLOCKING) — the widened build predicate is not "anchored on the verb"

The 10 claimed forms reproduce exactly, and the comment control reddens nothing:

```text
F01 pnpm build                                REDDENS      F06 yarn run build                        REDDENS
F02 pnpm -C packages/qfai build               REDDENS      F07 pnpm exec tsup                        REDDENS
F03 yarn build                                REDDENS      F08 npx tsup                              REDDENS
F04 pnpm run build                            REDDENS      F09 pnpm -w --filter … run build          REDDENS
F05 npm run build                             REDDENS      F10 tsc -p tsconfig.build.json            REDDENS
F-ctl (control) a comment naming build/pnpm build/tsup inside the run block               reddens nothing
```

So `E4b` as reported is accurate. What is **not** accurate is the description of what was rebuilt.
I extended the form set by eight and four redden nothing:

```text
F11 make build             reddens NOTHING      F15 vite build          REDDENS
F12 bun run build          REDDENS              F16 rollup -c           REDDENS
F13 node esbuild.config…   REDDENS              F17 turbo run build     reddens NOTHING
F14 ./scripts/build.sh     reddens NOTHING      F18 nx build qfai       reddens NOTHING
```

Direct evaluation of the two predicates at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:346-347` — 13 of 15 command strings
containing the literal verb `build` are invisible:

```text
CAUGHT    pnpm run build / npm run build
INVISIBLE turbo run build, nx build qfai, make build, ./scripts/build.sh, just build,
          cargo build, gradle build, mvn package, dotnet build, go build ./..., swc src -d dist,
          parcel build, bazel build //:qfai
```

The predicate is anchored on a **closed five-member package-manager list** (`pnpm|npm|yarn|npx|bun`)
plus a closed six-member bundler list — a longer allow-list, not a verb anchor. Three artifacts say
otherwise, all written while applying round 1's "the predicate is far narrower than the property it
claims" finding:

- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:343` — "Two patterns now, **each
  anchored on the verb** rather than on the flags before it"
- `.qfai/evidence/atdd-spec-0017.md:140` — "Rebuilt **around the verb** and re-observed"
- `.qfai/evidence/coverage-depth-spec-0017.md:164-166` — "Round 2 rebuilt the scan **around the verb**"

This does not prop up a coverage claim: the row is `❌` and its `Oracle strength` is already `⚠️`
(`.qfai/evidence/coverage-depth-spec-0017.md:50,152-158`), correctly. What over-claims is the
assertion's own message ("no shipped lane may run its own build") relative to the predicate — a
`turbo run build` lane would violate it and pass. Because the shipped surface goes to arbitrary
adopter repositories, `make`, `cargo`, `gradle` and `dotnet` are not exotic.

**Required fix:** restate the predicate honestly ("an enumerated set of package managers and bundlers;
task runners and shell wrappers are out of scope, recorded as a limit") **or** widen it. A prose-only
correction is sufficient. Do not leave "anchored on the verb" standing — that is the same class of
misdescription round 1 was about, and "10 of 10" on a self-chosen form set does not establish the
property.

---

## 2. The 127 number — reproduces independently; the guard does **not** over-report

Guard output at HEAD:

```text
node scripts/check-atdd-annotation-ledger.mjs --spec 0017
  -> check-atdd-annotation-ledger: 8 claim(s) backed by a test annotation (spec-0017)   EXIT=0
node scripts/check-atdd-annotation-ledger.mjs
  -> EXIT=1; 127 unbacked lines emitted (grep -c 'QFAI:SPEC-' = 127)
```

I re-measured with my own implementation (`tmp/r03/independent_count.py`), written from the ledger's
own text with a **deliberately more permissive** token regex
(`QFAI[:\-]SPEC[:\-]?(\d{4})[:\-](US-\d{4}-\d{4})`) and scanning **every tracked file** via
`git ls-files` rather than two directories:

```text
ledger claims (unique):                          208
unbacked, guard's two e2e dirs, code files only: 127
unbacked, EVERY test dir, code files only:       126
appears nowhere else in the repo at all:         126
```

**208 / 127 / 126 all reproduce exactly.** The per-spec breakdown reproduces too — `0012` 28,
`0013` 10, `0010` 10, `0004` 10, `0001` 9, `0002` 8, `0005` 8, `0016` 7, `0008` 6, `0015` 6, `0003` 5,
`0006` 5, `0009` 5, `0014` 4, `0007` 3, `0011` 3, `0017` **0** — identical to
`.qfai/decisions/CR-20260820-0011-…md:35-37`.

I probed the three over-report paths the request named:

1. **An annotation form the guard does not recognise.** Bare `US-NNNN-NNNN` tokens do appear in e2e
   test files — 69 distinct ones — but **zero** correspond to an unbacked claim
   (`tmp/r03/bare_form_check.py`). Short-form `QFAI:SPEC-NNNN:US-NNNN` occurrences exist only in
   `README.md:123`, `packages/qfai/README.md:127`, `.qfai/assistant/catalog/test-layers.md:266` and
   `packages/qfai/tests/core/atddCodeTraceability.test.ts` — documentation examples and validator
   fixtures, none in either e2e tree.
2. **A test directory the guard does not read.** The single claim backed outside the guard's two
   directories is `QFAI:SPEC-0001:US-0001-0001`, and its only other home is
   `packages/qfai/tests/core/atddCodeTraceability.test.ts:45` — a **validator test fixture string**,
   not a real annotation. So **127 is the correct number and 126 is the generous one.** The evidence's
   parenthetical "(126 across every test directory)" credits a fixture literal to real coverage; it
   errs against the CR's own case, not for it.
3. **A spec whose tests live elsewhere.** Root `tests/integration/` carries only `TC-*` claims, no
   `US-*`, so nothing is hidden there.

**`CR-20260820-0011` is not overstated and its recommendation stands.** The only defects touching it
are `B1` (the test it cites is not a pin) and `A3` (a directory mislabel inside it).

---

## 3. Validate Hard Gate — reproduced at HEAD, artifact byte-identical

Run in a `git archive HEAD` shadow root (`tmp/r03/shadow`), so the **tracked**
`.qfai/report/validate.log` was never written. The 83 tracked symlinks were flattened by
`git archive | tar -x` (41 arrived as empty directories, 42 as plain files) and re-materialised with
`os.symlink` from `git cat-file blob` targets — **83 created, 0 failed**.

That step is load-bearing, exactly as round 1 found. Before it:

```text
node <repo>/packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  -> counts: info=2 warning=0 error=3      (the third error is QFAI-LINK-001, a shadow-root artifact)
```

After it:

```text
  -> counts: info=2 warning=0 error=2      EXIT=1
     [error] QFAI-ATDD-111 … SPEC-0017:US-0017-0007
     [error] QFAI-ATDD-112 … tests/integration/** -> SPEC-0017:TC-0017-0016, -0030, -0032, -0033,
                                                     -0034, -0035, -0069, -0070
     [info]  QFAI-ATDD-117 (11 Unit/Component TCs, excluded)
     [info]  QFAI-PROFILE-001 (partial profile)
```

- **`error=2`: confirmed.**
- **`QFAI-ATDD-111` names `US-0017-0007` and nothing else: confirmed.**
- **`QFAI-ATDD-112` names exactly 8 TCs: confirmed** (`0016, 0030, 0032, 0033, 0034, 0035, 0069, 0070`).
- The shadow run's `validate.spec-0017.json` is **byte-identical** to the committed one (5133 bytes,
  `byte-identical: True`), `counts {info:2, warning:0, error:2}`, `profile: atdd`, issues
  `QFAI-ATDD-111 error`, `QFAI-ATDD-112 error`, `QFAI-ATDD-117 info`, `QFAI-PROFILE-001 info`.

**Citations are the admissible ones.** `qfai.config.yaml` declares
`output.validateJsonPath: .qfai/report/validate.json` and `paths.outDir: .qfai/report`, so
`.qfai/report/validate.spec-0017.json` is the scoped sibling and
`.qfai/report/run-20260820194530635/` is the per-run directory under the configured `outDir` — both
exist, both hold `errors: 2 / warnings: 0`. `.qfai/evidence/atdd-spec-0017.md:217-222` correctly
refuses `.qfai/report/validate.log`; I verified that file **is** tracked (`git ls-files .qfai/report`
lists it) and that its blob is unchanged by my run (`b15599ae…` in both working tree and index). The
reasoning given for excluding it is sound.

---

## 4. `B2` (BLOCKING) — branch 3 for `TDD-0069` / `TDD-0070`: a *pending* `DR-*` is not an entry

**The branch choice is right.** I verified both obligations against the spec pack:
`.qfai/specs/spec-0017/05_Examples.md:84` — `EX-0017-0053` requires "three consecutive green
aggregate-verdict runs are recorded with their run identifiers quoted in the description"; `:85` —
`EX-0017-0054` measures "a rerun-to-green rate above one in twenty" over "default-branch
aggregate-verdict runs **after a tuning change has merged**". Neither has any satisfiable state on a
branch whose workflow changes are unmerged, so branch 1 would seed a permanently red test and branch 2
has nothing to mutate. Branch 3 is forced. That reasoning is correct and reusable.

**Row selection is right too.** I cross-tabulated the ledger myself: 82 rows, 71 `Integration` /
11 `Unit`, 74 `refactor` / 6 `blocked` / 2 `todo`, with `Integration` = 63 `refactor` / 6 `blocked` /
2 `todo`, and the two `todo` rows are exactly `TDD-0069` and `TDD-0070`, both with `Blocked-By = -`.
This matches the corrected `.qfai/evidence/atdd-spec-0017.md:124-126,236,263-267` in every figure —
round 1's finding 1 is properly repaired. And `Integration` is in scope for the reference:
`.qfai/assistant/skills/qfai-atdd/references/red-provenance.md:4-6` states the split as
"`Layer = E2E`, `Layer = API` **and `Layer = Integration`** rows are tracked there, but their tests are
authored here."

**What fails is the evidence shape.** `.qfai/evidence/atdd-spec-0017.md:260-261` records both rows as
`3 — exception, pending DR-*`, and `:285-289` states the `DR-*` cannot be authored. Against the
contract:

- `.qfai/assistant/skills/qfai-atdd/SKILL.md:392-394` (**P1d**) — "Branch 3 rows are judged here, then
  handed over. **Route `qa-gatekeeper` on the `DR-*`** … and hand the row over **with that PASS
  recorded**."
- `references/red-provenance.md:254` — the `exception` audit subject is row identity and the obligation
  reference "plus **the `DR-ID` and the DR artifact**, so a row without them **has nothing reproducible
  for `qa-gatekeeper` to hash**."
- `references/red-provenance.md:236` — "with a `DR-*` naming what made both branches unavailable";
  `:411` — handed over "P1d, **once the `DR-*` is written**", the run "ends with **the Decision Record
  recorded**".

There is no `DR-*`, so the artifact P1d routes me on does not exist and I cannot issue a PASS on it.
My own contract is explicit: a missing `DR-*`, or one that names no unavailability, is still REVISE —
this is a third form of evidence, not an exemption from having any. The unavailability is named; the
`DR-*` is not written. **REVISE.**

**And the claimed effect is false.** `.qfai/evidence/atdd-spec-0017.md:291-293` says step 3b "now has
an entry to read rather than an absent one, so the two rows are no longer deadlocked: the entry says
'branch 3, DR pending, do not enter Phase Green', which **parks the row instead of stopping the
phase**." `.qfai/assistant/skills/qfai-implement/SKILL.md:116` says otherwise, twice in one sentence:
`exception` writes `todo -> exception` "with the recorded `DR-*` **and only when the entry carries the
`qa-gatekeeper` PASS P1d took on that `DR-*`** … an entry without it goes back with a handoff note",
and "an entry that is absent, names no branch, or **is malformed in any other way leaves the row at
`todo` and stops with a handoff note**." A branch named with its mandatory field absent is malformed.
The phase still stops, the row still sits at `todo`, and nothing was unblocked. **This is the round-2
instance of the recurring defect: a repair whose own claim about its effect does not survive reading
the contract it cites.**

**The stated obstacle is the wrong artifact.** `.qfai/assistant/skills/qfai-atdd/SKILL.md:60` does list
`07_Decisions.md` as a P5 **input** — correct, it is in the Inputs section and this stage may not patch
it. But the DR the exception path needs is not a `07_Decisions.md` entry:
`.qfai/assistant/skills/qfai-implement/SKILL.md:121-122` says it is recorded "as
`.qfai/decisions/DR-<id>-<slug>.md` — **never** in `07_Decisions.md` / `09_delta.md`, which are
upstream SSOT this skill may not patch." `.qfai/decisions/` currently holds **0** `DR-*` files and
**11** `CR-*` files this stage wrote this cycle, so authorship there is demonstrated, not blocked.
`CR-20260820-0007`'s blocked set (`TDD-0032, 0033, 0034, 0035, 0052, 0066, 0067, 0074, 0075`) does not
include these two rows either, so it is cited as an analogy, not as cover.

**Required fix:** write `.qfai/decisions/DR-<id>-<slug>.md` carrying the text already in
`.qfai/evidence/atdd-spec-0017.md:276-309` — what could not be observed and why each of branches 1 and
2 was unavailable, per row — record its `DR-ID` in both entries, and re-route this gate on it. The one
half already satisfied: **row identity and obligation reference were recorded before any gate routes.**
The `### TDD-0069` / `### TDD-0070` sections landed in `58c29d9f`, HEAD's parent
(`git show 58c29d9f:… | grep -c TDD-0069` = 5; the same grep against round 1's base `8fb48002` = 0).

---

## 5. The re-seal (request question 5) — legitimate, and verified by arithmetic the record does not cite

I recomputed both seals. The recorded manifest at `.qfai/evidence/atdd-spec-0017.md:526-529` matches
`git hash-object` for all four files exactly, and the recorded seal reproduces under the serialisation
`"<git-hash-object> <path>\n"` per file in `LC_ALL=C` path order:

```text
hash1sp_path_nl  5c8cd42571c8baf5f2240515…   *** MATCH ***  (recorded: 5c8cd425…c74317e3)
hash2sp_path_nl  fa8d6e836cabd14a6cdbc12d      (two spaces — the sha256sum default — does NOT match)
```

Decisively, the **first** seal also reproduces — over the three report files **as they stand today**:

```text
recomputed first seal (3 files): d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9
evidence records               : d8ac0a77…58967c9        prefix ✔  suffix ✔
```

So the three reports are byte-identical to what the first seal covered, and the re-seal provably added
`summary.json` and changed nothing else. `summary.json` is genuinely required
(`.qfai/assistant/skills/qfai-implement/references/review-artifact-layout.md:12`) with `revision_form`
and `revision` mandatory (`:21-29`), and both are present (`revision_form: "content-hash"`,
`revision: "8fb48002"` — a git rev, which `:24-25` explicitly permits). **The re-seal is legitimate.**

**But the stated reasoning would launder an illegitimate one.**
`.qfai/evidence/atdd-spec-0017.md:517-520` argues that "superseding a seal because the pack gained a
required artifact is the legitimate case; the illegitimate one would be re-sealing after the reports
changed." That premise is not self-checking: "the pack gained a required artifact" is fully compatible
with the reports having *also* changed in the same pass, which is precisely the case it says it
excludes. What actually discharges the claim is the recomputation above — and the record does not point
at it, and abbreviates the first seal to `d8ac0a77…58967c9` (enough for me to confirm by prefix and
suffix, but not offered as the check). **See `A1`.**

---

## 6. Coverage Depth Matrix gate — PASS

The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md` (tracked;
`git check-ignore` says not ignored), not only inside the stage-evidence file. Every `❌` cell is named
and assigned to exactly one reason class (`:105-139`), satisfying
`.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md:114-119` ("naming the cell,
why the obligation is not coverable at this layer, and the `DR-*` or `CR-*` that carries the decision
when one exists" — `CR-20260820-0007` is cited at `:167-169`). No `US` with only normal-path coverage is
left unrecorded: the five rows without an error path are `❌` on both `Normal path` and `Error path`
with class A justifications, and `US-0017-0008`'s split is recorded at `:224-227`. Per the checklist's
own division of labour (`:124-127`), the `⚠️` rationale check is `completion-reviewer`'s, not mine.

## 7. RED/GREEN Observation Gate — no subject this round

No ledger row was advanced past `todo` this cycle (`.qfai/evidence/atdd-spec-0017.md:254`, confirmed by
my cross-tabulation: 2 `todo`, both still `todo`, `DR-ID = -`, `Blocked-By = -`). There is therefore no
RED pair, no GREEN pair and no per-item `Oracle proof` on a ledger row for me to judge, and nothing was
offered as one. The gate that applies to these two rows is P1d, which is `B2`.

The oracle rounds above (`E*`, `F*`, `M*`, `G*`, `W*`) are oracle-strength evidence for the **US
coverage tests**, not RED observations for ledger rows, and I have judged them as such.

## 8. Not evaluated (PENDING)

- **Runtime proof and the full-profile completion gate.** Not evaluated at completion strength. The
  stage self-declares `FAIL` (`.qfai/evidence/atdd-spec-0017.md:482-497`) and does not claim
  completion; the round-2 unit is the repairs, and P5/P6 completion artifacts are not in scope for this
  round. `.qfai/report/specs-coverage/spec-0017.md` exists and shows every `AC-0017-*` with ≥2 TCs — no
  zero-TC AC.
- **Prototyping coverage evidence.** No `CON-API-*` is declared and this spec is not UI-bearing on the
  surface I read; nothing owed, nothing audited.

---

## Advisory findings (non-blocking)

- **`A1`** — Replace the re-seal reasoning at `.qfai/evidence/atdd-spec-0017.md:517-520` with the
  recomputation: record the first seal **in full** and state that it reproduces over the three unchanged
  reports. That is what makes the re-seal checkable by a third party; "the pack gained a required
  artifact" does not. Also record the manifest serialisation (single space, `LC_ALL=C` order, trailing
  newline) — I recovered it on the second attempt, but a seal whose format is not written down is a seal
  only its author can verify.
- **`A2`** — The matrix test checks the class partition only by its **sum**. Resizing class A `30 → 29`
  *and* class B `7 → 8` together (sum still 38), leaving both prose enumerations untouched, leaves the
  file self-contradictory and the test green (`MgapB: exit=0, 4 passed`); one half alone reddens
  (`MgapA: exit=1`). The test comment at
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:113` is honest about this ("the class sizes
  must sum to the cell count"), but the matrix's stronger claim at `:107-108` — "no cell is left to be
  inferred" — is not enforced. Either derive class membership from the enumerations, or soften the claim.
- **`A3`** — `.qfai/decisions/CR-20260820-0011-…md:26-30` labels the 81 as "backed by an annotation in
  `tests/e2e/**`". **Zero** of the 81 are there; all 81 are in `packages/qfai/tests/e2e/**`, and
  `tests/e2e/` holds nothing but the ledger markdown (`tmp/r03/backed_where.py`:
  `backed by tests/e2e/** CODE files: 0`). The mislabel obscures the very fact Option 3 turns on
  (`:100-102`) — that `testsDir` is repo-root relative, so no test code is inside the scanner's reach at
  all.
- **`A4`** — `scripts/check-atdd-annotation-ledger.mjs:32` requires the long `US-NNNN-NNNN` form, while
  the scanner it exists to backstop accepts the short form too
  (`packages/qfai/src/core/atddTraceability.ts:27`: `US-(\d{4}(?:-\d{4})?)`) — and the short form is
  what `README.md:123` and `.qfai/assistant/catalog/test-layers.md:266` give as the canonical example.
  No occurrence in either e2e tree today, so the 127 is unaffected; a latent false "unbacked" before the
  guard is wired into `ci:lint` under either CR option.
- **`A5`** — The same regex lacks the scanner's leading `\b`, so `XQFAI:SPEC-0017:US-0017-0001` would
  count as a ledger claim. No occurrence today.
- **`A6`** — `.qfai/report/run-20260820194530635/run.json` records `"command": "/qfai-validate"` with no
  profile and no `--spec` scoping, so the per-run directory **alone** does not evidence that the run was
  the scoped `atdd` one. `validate.spec-0017.json` does (`profile: atdd`, and the filename). Citing
  both, as `.qfai/evidence/atdd-spec-0017.md:213-214` does, is correct; citing the run directory alone
  would not be.

---

## Every command I ran, with its result

Baseline and state:

```text
git rev-parse --short HEAD                          -> 56daee8d   (start AND end; HEAD did not move)
git status --porcelain                              -> empty      (start, after every mutation, end)
git ls-files -s | awk '$1=="120000"' | wc -l         -> 83 tracked symlinks
git config core.autocrlf / core.eol                 -> false / (unset)
git log --oneline --follow -3 -- .qfai/evidence/atdd-spec-0017.md   -> 58c29d9f, 1e806e50
git show 58c29d9f:.qfai/evidence/atdd-spec-0017.md | grep -c TDD-0069   -> 5
git show 8fb48002:.qfai/evidence/atdd-spec-0017.md | grep -c TDD-0069   -> 0
```

Guard and the 127:

```text
node scripts/check-atdd-annotation-ledger.mjs --spec 0017     -> "8 claim(s) backed", EXIT=0
node scripts/check-atdd-annotation-ledger.mjs                 -> EXIT=1, 127 unbacked lines
python tmp/r03/independent_count.py                           -> 208 claims; 127 / 126 / 126
python tmp/r03/bare_form_check.py                             -> 69 bare tokens, 0 in the unbacked set
python tmp/r03/backed_where.py                                -> 0 / 81 / 81 / 127
git ls-files -z | xargs -0 grep -nE 'QFAI:SPEC-[0-9]{4}:US-[0-9]{4}([^0-9-]|-[^0-9]|$)'
                                                              -> docs + fixtures only, no e2e tree
grep -oE 'QFAI:SPEC-[0-9]{4}' tests/e2e/qfai-traceability.md | sort | uniq -c   -> sums to 208
node tmp/r03/range.mjs                                        -> range table in section 1c
```

Suites (baseline):

```text
pnpm -C packages/qfai exec vitest run tests/assets/coverageDepthMatrix.test.ts
                                                              -> 4 passed (4), EXIT=0
pnpm -C packages/qfai exec vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts
                                                              -> 10 passed (10), EXIT=0
pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
                                                              -> 9 passed (9), EXIT=0
```

Oracle rounds (each planted alone, run, reverted, byte-compared):

```text
M1 M2 M3 M4 M5 M6a M6b M7                REDDEN         Mctl (prose control)    green
MgapA REDDENS                            MgapB reddens nothing                  (advisory A2)
W1 reddens nothing                       W2 REDDENS                             (blocking B1)
E6 E7 E8 E9 E10                          REDDEN         Ectl (comment control)  green
F01..F10 REDDEN   F12 F13 F15 F16 REDDEN F11 F14 F17 F18 reddens nothing        (blocking B3)
F-ctl (comment naming build) green
G1 G2 REDDEN
node -e '<the two predicates> over 15 build command strings'   -> 2 caught, 13 invisible
```

Validate, in a shadow root:

```text
git archive HEAD | tar -x -C tmp/r03/shadow                   -> extracted
python (os.symlink from git cat-file blob targets)            -> 83 created, 0 failed
node <repo>/packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
   before symlink repair -> info=2 warning=0 error=3   (extra = QFAI-LINK-001, shadow artifact)
   after  symlink repair -> info=2 warning=0 error=2   EXIT=1
python (byte-compare shadow vs committed validate.spec-0017.json)  -> byte-identical: True (5133 B)
git hash-object .qfai/report/validate.log  ==  git rev-parse HEAD:.qfai/report/validate.log
                                                              -> b15599ae… both (untouched)
```

Ledger, seal, artifacts:

```text
python (cross-tabulate .qfai/specs/spec-0017/tdd/test-list.md)
    -> 82 rows; Integration 71 / Unit 11; refactor 74 / blocked 6 / todo 2;
       Integration: refactor 63, blocked 6, todo 2; todo = TDD-0069, TDD-0070
python (recompute both pack seals, 10 serialisations)
    -> recorded 5c8cd425…c74317e3 reproduces under "<hash> <path>\n"; first seal
       d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9 reproduces over the 3 reports
git check-ignore / git ls-files on the evidence artifacts
    -> atdd-spec-0017.md, coverage-depth-spec-0017.md, CR-20260820-0011, review_request.md,
       tdd/test-list.md: all tracked, none ignored
ls .qfai/decisions | grep -c '^DR-'                           -> 0
```

## Mutation hygiene, including my own two near-misses

Every mutation was applied to a single file, run, then restored from a pristine copy taken **before**
the edit, with `git hash-object` compared against a baseline recorded at the start
(`tmp/r03/baseline_hashes.txt`) and `git status --porcelain` re-checked after each cycle. The driver
refuses to run when a mutation leaves the target's hash unchanged, so no "REDDENS" above was measured
against an unmutated file. Two incidents, disclosed because a reviewer who mutates owes its own
near-misses:

1. My first restore used `git checkout-index -f --` on `.qfai/evidence/coverage-depth-spec-0017.md` and
   produced hash `fc9ac057…`, not the baseline `4205449d…`. I abandoned that route and restored from a
   `git cat-file blob` copy, verified `4205449d…`, tree clean. All later restores used
   file-copy-from-pristine.
2. `MgapB` edited the same file twice in one cycle; the second `save()` overwrote its own pristine copy,
   so the automatic restore left the file at `9a3d5c69…` and `git status` reported it **DIRTY**. I
   restored from the blob copy in the immediately following step (`4205449d…`, tree clean) and patched
   `save()` to refuse to clobber an existing pristine copy before continuing.

Final state, verified: all five mutation targets byte-identical to their baseline blobs,
`git status --porcelain` **empty**, `HEAD` **56daee8d**. (A sixth line in my baseline file carried a
stray trailing CR and produced a spurious "DRIFT" report for
`packages/qfai/tests/e2e/spec0012PrototypingModeE2E.test.ts`; checked directly, its working-tree hash
`7188210112e84cbec2cc1f568a1de1524b6856ec` equals `git rev-parse HEAD:<path>`, and the empty
`git status` is authoritative for all tracked files.)

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — `file:line` throughout
- [x] Required gates and residual risks are recorded — `B1`-`B3` blocking, `A1`-`A6` advisory,
      section 8 lists what was not evaluated and why

---

## Addendum — the `validate.log` hazard fired live during this review

**Disclosed because it changed the working tree under me, and because it is evidence.** HEAD never
moved (`56daee8d` at start and end). But between my section-3 measurement and my final check, the
**tracked** `.qfai/report/validate.log` was rewritten by a process that is not mine:

```text
git hash-object .qfai/report/validate.log   -> 598de229…   (was b15599ae… = HEAD, when I measured)
git diff -- .qfai/report/validate.log
   - run_id: run-20260820194530635   - warnings: 0     - run_log: …/run-20260820194530635
   + run_id: run-20260820210727651   + warnings: 376   + run_log: …/run-20260820210727651
   + QFAI-ATDD-111 (.qfai/specs/spec-0003): … SPEC-0003:US-0003-0021 … SPEC-0017:US-0017-0007
mtime -> 2026-08-20 21:07:28 +0900
```

It is not my run, provably: both of my runs wrote **into the shadow root** —
`tmp/r03/shadow/.qfai/report/run-20260820201238992` and `…/run-20260820201306834`, confirmed present
there and **absent** from the real `.qfai/report/`. The foreign run is `run-20260820210727651`, an
**unscoped, wider-profile** run (`warnings: 376`, repo-wide `QFAI-ATDD-111` across `spec-0003`,
`-0006`, `-0008`, `-0015`, `-0017`), created at 21:07:28 — 54 minutes after my last one. Two sibling
reports (`R01_implementation-reviewer.md`, `R02_completion-reviewer.md`) also appeared in this pack
while I worked, so the concurrent run is almost certainly one of theirs.

**I have not reverted it and will not.** It is another agent's output, not my mutation, and the round's
constraints forbid `git checkout` / `stash` / `reset`. Recorded here so the next reader does not
attribute it to this review. (My own single write, `R03_qa-gatekeeper.md`, is invisible to plain
`git status` because `.gitignore:61` ignores `.qfai/review/*` — review packs are force-added — so the
one unaccounted working-tree change is this foreign `validate.log`.)

**This is direct corroboration of the reasoning I passed in section 3.**
`.qfai/evidence/atdd-spec-0017.md:217-222` excludes `validate.log` from the Hard Gate citations because
"`validate.log` and the run-log pointer are shared by every run, scoped or not, and **nothing
serializes them** — a concurrent stage can leave that pointer naming its run rather than this one."
That is not a hypothetical: it happened on this repository, during this review round, within the hour.
Had the stage cited `validate.log`, its Hard Gate evidence would now read `warnings: 376` over five
specs instead of the scoped `error=2` it measured. The two citations it did choose —
`.qfai/report/validate.spec-0017.json` and `.qfai/report/run-20260820194530635/` — are both still
intact and still say `errors: 2 / warnings: 0`, because a per-run directory and a spec-scoped JSON are
not shared mutable state. **The choice of citations is vindicated, not merely defensible.**

Incidentally, the foreign run's own content agrees with my scoped measurement: its repo-wide
`QFAI-ATDD-111` list includes `SPEC-0017:US-0017-0007` and nothing else from spec-0017, and its
`QFAI-ATDD-112` list includes exactly the same eight spec-0017 TCs.
