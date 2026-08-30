# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-9 repairs — v12 of the build classifier (tool subcommands, interpreter flags, a
  wrapper tail that is found rather than counted, three more sets deleted), the corpus rebuilt around
  each tool's real build invocation, the retracted-claims guard's line-scoped exemptions and strict
  quote parity, the `.each`/`.for` modifier chain, both `.exec` sites made `matchAll`, an exported
  version constant, and the record work (the `## Final status` counts, the mutation tally, the P7
  currency claim, the Delta Rejected Guard's mis-cited instrument, the re-run Hard Gate artifact)
- Round: 10 — **stage gates only.** P1d passed at round 7 and that gate is closed. Nothing here
  re-opens it; do not re-decide it.
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-9 each returned REVISE from the stage gates. Round 9 was the heaviest: 64 findings across
three reviewers, all applied. The stage gate has never passed.

Round 9 also stated the problem this stage has not solved in ten attempts, and I would rather you
attack that sentence than re-derive the numbers:

> the instrument is checked against its own claims rather than against the world. Eleven versions in,
> the corpus's authority still comes from who chose it.

Its own two reviewers demonstrated it end to end: they planted real builds in the shipped lane and **18
of 20** and **34 of 40** went unnoticed, against a predicate that eight prior rounds had reported clean.

## What changed since round 9

1. **v12.** Tools declare their own subcommands (`builds`, `buildPrefixes`, `bareIsBuild`, `stops`) and
   their optional-argument flags; interpreters declare flags and re-enter `-c` as a shell line; a
   wrapper's command begins at the first token that **names** a command, so there is no per-wrapper flag
   list to be incomplete. Aliases share one object — `gmake`/`make`, `py`/`python`, `gradlew`/`gradle`,
   `podman`/`docker`, `powershell`/`pwsh` — and the member list is canonicalised by object identity.
2. **Eight sets are now empty across v10-v12**, each deleted after measuring that no command's verdict
   depended on it. `MANAGER_BOOLEAN`'s nineteen members went to one rule: a manager flag consumes its
   value only when a later bare token exists to be the script.
3. **`tsc -b` is a build**, because the tsconfig emits. It had been pinned as *not* a build for three
   rounds, inside the list of "non-builds a review round added after a false positive".
4. **The corpus is built from each tool's real build invocation.** Round 9 found eleven of thirty tool
   cases were commands the tool does not have (`mvn build` is not a Maven phase; `cmake build`
   configures `./build`).
5. **`SCRIPT_EXTENSIONS`, `NAME_SEPARATORS` and the two predicates are exported and swept**, because the
   sweep's reach is exactly what `GRAMMAR` exports and none of them were in it.
6. **The guards**: exemptions are line-scoped rather than paragraph-wholesale; an odd quote count is
   reported instead of accommodated; the `.each`/`.for` precondition matches whatever `countCases`
   matches; the version pin reads an exported constant; the sweep asserts that each member's OWN case
   notices its own deletion.

## What I most want challenged

1. **Plant builds again, with forms nobody in this repository has written.** This is the third round
   running where that method has been the only thing to find the real defect, and I have no way to run
   it against myself — every corpus I write is a corpus I chose. If it comes back clean, say what you
   tried, because the negative result is the finding.
2. **Three instruments I built this round were wrong and I caught them by falsifying, not by reading.**
   A cross-product harness harvested its axes from the grammar it was testing and reported 0 misses
   while four members were deleted. Its falsifier silently no-op'd when a needle missed. The version pin
   demanded `v13` because a comment *discussed* v13. Two live in `tmp/` and are not under review; the
   pin is. Look for the fourth.
3. **Break the deletion sweep, again.** It now claims that deleting any one exported member reddens the
   corpus AND that the member's own labelled case is what notices. Round 9 found its reach was narrower
   than its claim. Is it still?
4. **The eight deletions.** Each rests on "no command distinguishes this member". That is an argument
   from absence, and the absence is over commands I enumerated. `MANAGER_BOOLEAN` is the one I would
   attack: nineteen members replaced by one rule about what follows the flag.
5. **The numbers I derived rather than typed** — `## Final status` at nine rounds / 26 responses / 25
   REVISE, the findings table's 26 slots, the nine pack seals, the P7 sequence's two columns, the ten
   corpora — and whether any prose count survives that is not derived.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes. (I discarded uncommitted work with a
  `git checkout` on a single file this round; it is restored, and the instruction is not rhetorical.)
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks **as relative-target symlinks**, not junctions — round 7 found
  junctions rewrite the targets to absolute paths and produce a spurious `QFAI-LINK-001`.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`, and give every finding an identifier as a **heading**
  (`### B1 — ...`). Rounds 1-8 held five packs whose recorded counts disagreed with a mechanical count
  because advisories were enumerated inline; round 9's three did not.
