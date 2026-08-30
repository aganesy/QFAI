# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-8 repairs — v10 and v11 of the build classifier, the hardcoded per-member corpus with
  an in-suite deletion sweep, the retracted-claims guard's inert-entry and false-accusation fixes, the
  `.for` precondition, the anchored version and withdrawn-word pins, and the record work (the P7
  sequence reaching its own total, the derived findings table, the re-run Delta Rejected Guard, the
  enumerated defect-class list, the re-sealed round-7 pack and the newly committed round-8 pack)
- Round: 9 — **stage gates only.** P1d passed at round 7 and that gate is closed. Nothing here re-opens
  it; do not re-decide it.
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-8 each returned REVISE from the stage gates; round 8 gave 29 findings from the
`completion-reviewer` and 22 from the `qa-gatekeeper`, its two heaviest yet. Every one of the 51 is
applied or explicitly answered. The stage gate has never passed.

Round 8 also found the defect that matters most about this stage's method, twice: an instrument that
**reported** a property it did not have. The member-pinning test generated its probes from the sets it
pinned, so deleting a member deleted its own assertion — 0 of 17 mutations reddened it. And the story
`US-0017-0004` rests on let ten of eleven planted builds through. Both were found by someone mutating
the instrument rather than reading it, and neither was findable any other way.

So the request this round is narrower than usual: **the instruments claim more than they used to. Check
whether they have it.**

## What changed since round 8

1. **v10 deleted forty-five grammar members.** Writing one deletion-detecting case per member forced
   the question "what command changes verdict if this member goes?" for all 207, and for forty-five the
   answer was none: every tool's `pass` list, `MANAGER_CONSUMING`'s four flag members, `NOT_A_BUNDLER`
   (whose one observable command it decided **wrong**), three flags shadowed by `TARGET_FLAGS`, and
   `--task`.
2. **v11 gave wrappers and managers their own flag grammars**, which is round 8's `B4`. A wrapper
   consumes its own flags and `timeout` takes a duration; `-w` is boolean for pnpm and takes a value for
   npm. Two more sets emptied on the way: the wrapper `booleans` list (23 members, none observable) and
   `MANAGER_VALUES`' `--workspace`.
3. **The corpus is hardcoded, one case per member, plus a sweep that deletes each member in turn and
   requires a case to notice.** The sweep is a test, not a measurement someone must remember to re-run.
4. **`retractedClaims.test.ts`**: an entry matching nothing now fails unless it is declared retired; a
   fenced block and a blockquote count as quotation; a paragraph with an odd number of quote marks is
   read both ways; the counted-claim needle is no longer one punctuation mark wide.
5. **`stageEvidenceCounts.test.ts`**: `.for` joins `.each` in the precondition, and the guard is in its
   own `OWED` list.
6. **The pins are anchored**: the classifier version is read out of the sentence naming the helper, and
   the withdrawn-word pin out of the row's own justification section. Both were satisfiable anywhere in
   the record before.
7. **The record**: the P7 sequence reaches the total it certifies and prints its method; the findings
   table is derived from the packs for all eight rounds with the derivation beside each number; the
   Delta Rejected Guard is re-run against every artifact added since round 2; the recurring defect class
   is enumerated in one place instead of counted three ways; round 7's pack is re-sealed with its old
   seal kept as `superseded:`; and round 8's pack — which was **never in version control** — is
   committed.

## What I most want challenged

1. **Break v11.** Eleventh version, tenth reported clean, and your role chose the corpora that broke
   every one of the first ten. Plant real builds in the shipped lane again. The wrapper and manager
   grammars are new and were written from six measured forms plus my guesses about their siblings —
   attack the guesses.
2. **Break the deletion sweep.** It claims that deleting any one grammar member reddens the corpus. I
   falsified it once (putting `--filter` back into `MANAGER_CONSUMING` with a plausible case makes it
   report that member) but that is my own falsification, which is exactly the kind this stage has been
   wrong about. Is there a member whose deletion it cannot see, or a way for the coverage assertion and
   the sweep to be simultaneously green and wrong?
3. **Break `retractedClaims.test.ts` a fifth time.** The exempt-span work widened what counts as
   quoted: a stray quote mark now buys an alternate pairing, and a paragraph containing a fence is
   marked wholesale. Say whether that is exploitable, and whether any retraction your role established
   in rounds 3-8 is still missing from the list.
4. **Check the numbers I derived rather than typed** — the findings table's 23 slots, the P7 sequence's
   two columns, the eight pack seals including the two written this round, and the eight corpora.
5. **The two calls I made rather than asked about.** Say whether either is wrong: (a) five packs'
   `summary.json` values disagree with a mechanical heading count and I left them as written with the
   rule stated, rather than re-sealing five packs to move a bookkeeping figure; (b) the 445 KB per-run
   validate directory is marked regenerable rather than committed, while `validate.spec-0017.json` is
   force-added.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks **as relative-target symlinks**, not junctions — round 7 found
  junctions rewrite the targets to absolute paths and produce a spurious `QFAI-LINK-001`.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`. Give every finding an identifier as a **heading**
  (`### B1 — ...`, `### A1 — ...`); round 8 found five packs whose recorded finding counts disagreed
  with a mechanical count because advisories were enumerated inline instead.
