# Review request — round 20, spec-0017, stage gates only

**Revision under review: the commit that opens this pack.** Read the subject with `git show <rev>:<path>`
and say which revision you read. Record `git rev-parse --short HEAD` at start and finish.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## Two writers are on this branch, and the record's counts are measured HERE

Another session is pushing to `feature/chg-007-layered-ci-scaffold` continuously. It has changed the
shipped workflow templates, `init.ts`, the provenance module, several scripts and — during round 19 —
added 29 e2e callsites and closed `QFAI-ATDD-111`.

- **Pin CODE to the revision that opened this pack.** Say which one you used.
- **Measure the record's pack and response counts at the working tree**, not at an earlier revision.
  Opening a pack is what moves them, so a pinned measurement makes three guards fail for a reason that
  is not a defect. Round 19's first `completion-reviewer` found that and it is the rule now.
- **If you find something that belongs to the other session rather than to this stage, report it anyway**
  and say whose it is. It ships to the same adopters.

## What this round is for

Round 19's repairs. Every one of them is one commit old and nobody has reviewed any of them.

### 1. The bash oracle, newly committed and the biggest change here

Round 19's gate said the differential test's weakness is that it asserts two instruments in one file
AGREE, so a fault common to both is invisible, and the `inert` half anchors the mask to shapes the stage
asserted rather than to bash. Every defect ever found in this file was found by a reviewer's fake bundler
on `PATH`, in scratch that gets deleted.

That harness is now a test in `spec0017LayeredCiScaffoldE2E.test.ts` — `agrees with bash about which
decorations actually run a build`. The corpora moved into the helper so the oracle and the differential
test read the same objects.

- **Is it sound, and can it lie?** It skips when `bash` does not resolve. What does it do on a runner
  where `bash` exists but the fake `npx` is shadowed, or where `PATH` separators differ, or where the
  marker file cannot be written? A skip that reads as a pass is the failure mode.
- Running it found two rows misfiled. **Are the other 32 right?** Check them against bash yourself.
- It runs 34 subprocesses in a required leg. Is that acceptable, and does it leak the temp dir on
  failure?

### 2. The lexer, twelfth spelling

`codeMask` now JUMPS a here-document's data instead of walking it masked, and reads `here.quoted` to
decide whether the data's substitutions are code. Process substitution is entered only outside quotes,
in both walks.

- **A twelfth spelling.** Eleven were found in rounds 15 to 19.
- The `pendingData` list is searched with `find` on every character. Is the region bookkeeping right
  when two here-documents open on one line, or when one opens inside another's data?

### 3. The init surface, fifth attempt

`carriesShebang` decodes past a byte-order mark and looks for `#!` as the first non-blank text.
`ALLOWED_INIT_ROOT_ASSETS` pins the template root — four files — at the SOURCE, because the output pin
excludes the instruction trees. `ALLOWED_PROVENANCE_SHAPE` pins the file that gates deleting an adopter's
workflow. An escaping symlink is refused rather than skipped.

- **A fifth route.** The first four were an extension list, a hook directory, a BOM, and a tree the path
  pin excluded.
- The executable-bit question is recorded as inert on Windows and live on `ubuntu-latest`. **Verify that
  claim on this platform rather than accepting it** — round 19 found the previous evidence for it was
  `ls` echoing the shebang.

### 4. The four record guards, sixth attempt

Round 19 found all four broken again and every finding was a NEEDLE defect over a correct region — the
inverse of round 18. The repairs widen the needles as far as the language allows and enumerate the
exceptions instead: four exempt phrases in the corpus-count guard, a per-cell pin in the class C roster,
the bolded pair rather than the list marker in the depth pin, and exactly one artifact table in the Delta
tie.

- **Break each in both directions.** An exemption list is a new surface: is any entry wider than the
  sentence it exempts, and does any of them swallow a true site?
- `isQuotation` and `WORDS` are now one copy in `tests/helpers/recordProse.ts`, imported by three
  guards. **Is there a fourth copy anywhere?**
- Every region terminator matches any heading level now. Does any of them stop somewhere it should not —
  a `#` inside a fenced block, for instance?

### 5. The record

- **The five lessons were rewritten** after round 19 judged two false as written and one misdirecting.
  Judge the new text the same way: is each supported by what happened?
- Every count moved this round. Re-derive them.
- `--profile full` is now recorded as a rule plus deltas, with the absolute stated as a property of this
  working copy and the untracked-pack count beside it. Is that honest, and is the 47 / 49 / 48 sequence
  right?
- Gap 10 records sixteen `⚠️` matrix cells with no justification, deliberately deferred. **Is deferring
  it defensible, or is it the thing lesson 5 warns about wearing lesson 5's clothes?**
- Re-grep for retracted claims yourself. Round 19 found three round-18 findings never applied; the grep
  found them, not the guard.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule.

Write to `.qfai/review/review-20260823000000000/R0N_<role>.md`, in small appends.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop. Do not `git checkout` a file to undo a
plant — another session may have uncommitted work in it.
