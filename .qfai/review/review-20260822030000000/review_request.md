# Review request — round 14, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

**Round 13 produced no verdict.** All three of its reviewers died on `ENOTFOUND` before writing a report.
Its request file stands in the pack beside this one and its live targets are restated below; do not read
the absence of `R0N_*.md` files there as a finding, and do not treat round 13 as passed.

## Two rules about who may write, both learned the hard way

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/.github/workflows/` and is the only role that may write there. Round 11's
  gatekeeper caught a file in that directory it had not created and traced it to a sibling planting
  concurrently; a colliding plant can attribute a catch to the wrong instrument.
- **The stage does not edit the subject while this round runs.** Round 12's partition worked and addressed
  the wrong half: I was the third writer. `R01` reported ten files edited beneath it, four of them the
  helper under review, and **two of its findings then failed to reproduce** against the finished tree. A
  finding measured against a half-applied state is indistinguishable from a false one, so if you see the
  subject move, say so — it is a defect in how I ran the round, not in your measurement.

## What changed since round 12, and why the shape of the answer changed

Round 12 closed the last parser hole anyone had planted, and this record then said the shipped-lane scan
fails closed. A twenty-agent adversarial sweep — one mechanism per agent, each required to demonstrate
execution rather than argue it — then returned **fourteen confirmed escapes and none refuted**.

De-duplicated by mechanism they are six classes on three levels: the lexer's quote state was wrong so the
split was wrong; a command's INPUT is a command; a flag is part of an invocation; an environment prefix
decides what a name resolves to; the lane WRITES the code a permitted install runs; and `env:` is an
execution channel with no `run:` body at all.

**The conclusion drawn from that, which is the main thing to attack:** enumerating bash grammar converges
only at a complete bash parser and every gap fails open, while enumerating our own twelve shipped bodies
converges at twelve and fails closed. So the boundary was moved off the parser.

### 1. `ALLOWED_STEP_BODIES` — the new boundary

The sha256 of each of the twelve `run:` bodies `qfai init` ships, under `bodyDigest`. Asserted in both
directions in `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`: a body with no digest was never reviewed, a
digest with no body is an entry nobody deleted.

This is the highest-value target in the round, because it is one commit old and it is the thing standing
between an unreviewed body and an adopter.

- **Find a second collision.** The first was found by attacking it rather than by a review round:
  `payloadDigest` collapses whitespace, which erases the difference between a space and a newline, and a
  newline inside a command substitution is the difference between one command and two. `bodyDigest`
  normalizes line endings and trailing whitespace only. Is there another pair of bodies that behave
  differently and hash the same?
- **Find a channel the digest does not cover.** It hashes `run:` bodies. What else in a workflow executes?
- **Argue it is theatre.** It is silenced by pasting the new digest, and the record says that is the design
  because pasting one is visible in review. Is that honest, or is it the "guard people learn to work
  around" failure this record names elsewhere in its own words?
- Is a bijection between twelve bodies and twelve digests the right assertion, or does the "no dead entry"
  half create pressure to delete a digest instead of investigating a body that vanished?

### 2. `refusals()`, after the six classes

Now a review instrument rather than the boundary. Repaired against the classes rather than the spellings:
one code mask computed by the walk that already exists (the alternation lookahead used to be a second,
weaker parse of the same text); a command's input read as part of the command; `ALLOWED_FLAGS` per
invocation; `ALLOWED_ENV_PREFIXES`; a write onto anything a package manager executes refused; and `node`
allowed **only** as an enumerated `-e` payload, with a bare `node` refused by the missing flag because the
absence of an argument is not the absence of a program.

Break it. Get a real build, or arbitrary code, to run in a shipped lane with `refusals() == []`. The
previous helper is at `git show 07297875~3:packages/qfai/tests/helpers/shippedLaneCommands.ts` if you want
a before and after.

- 25 mechanisms are pinned in `tests/unit/shippedLaneCommands.test.ts`. Verify the count, and verify the
  claim that the pre-repair helper lets **all** of them through.
- `HARMLESS_PROGRAMS` is allowed by NAME, flags included, on the ground that their arguments cannot reach a
  build. There are nine. Refute one.
- The alternation rule for a pipe, the substitution placeholder and the `case`-arm prefix all survive from
  round 12 with a new mask underneath them. Did the mask change any verdict it should not have?

### 3. `ALLOWED_STEP_ENV`, and `defaults.run.shell`

Two env names — `QFAI_BASE_REF`, `QFAI_NEEDS_JSON` — read at step, job and workflow level. `NODE_OPTIONS`
at any of the three was verified executing before this. Both were planted at all three levels and caught.

`defaults.run.shell` is GitHub's documented spelling for applying a shell across steps, and the guard read
only the step's own `shell:` key; planted at job and workflow level, both shipped. That is the same channel
three rounds have closed at three levels, each time **one level from where the last repair looked** — so
every level now reads through one function.

- Is there a fourth level, or a fifth spelling of "run this instead"?
- The workflow level is scanned through `readUses`, which also reads `uses:` and `with:`. A workflow
  document has no top-level `uses:`. Is reading it there harmless, or does it make a future finding
  unreachable?

### 4. The record's corrections

- The paragraph claiming the scoped gate was `error=2` had been **stale since round 1**, while two other
  sections said `error=1`. Re-derived by running the gate: `info=2 warning=0 error=1`, `QFAI-ATDD-112` on
  eight TCs, and the re-run left the tracked artifact byte-identical. Verify both halves.
- Gaps item 2 said `US-0017-0007` was "uncovered by choice" and was stale in the same way.
- The recurring-class list now holds **seventeen** entries. Entry 17 says the scan itself is an instance —
  reading text standing in for running it. Is that a real class or a restatement of entry 12? If it is a
  restatement, say so: this record has merged entries before.
- Gaps item 9 states what no repair closes: an allowed install runs the **adopter's** code, so
  `US-0017-0004`'s claim is about what the shipped text invokes, not about what an adopter's tree executes.
  Is that an honest scope statement, or an excuse for a gap the story owns?
- Every count. Several are newly derived this round; check per number.

### 5. Still live from round 13, which never ran

- `tsconfig.tests.json` covers the files this stage authored and `pnpm check-types` runs it; four promise
  rules are re-enabled over the same set. Is the include list right? Does the eslint block actually apply —
  a `files:` list that matches nothing reports nothing and looks identical to a clean run.
- The Coverage Depth Matrix: `US-0017-0007` rescored, partition A 23 / B 9 / C 1 / D 1 = 34, new class D.
  Is class D a real class or a bucket invented to keep a total tidy? Is the guard vacuous for the row it
  was written for — its first version was.
- What was deleted is where a wrong deletion hides: the dead flag check in `openingVerdict`, an unreachable
  assignment guard in `invocationOf`, three programs dropped from the by-name list, nine build-script
  entries, hugo's values list, `@vercel/ncc`, tox's stop list. Refute one: find a command, a revision or a
  reader for whom the deleted thing was load-bearing.
- The gate is `error=1` on eight TCs, and the record claims each has a recorded reason. Verify per row.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260822030000000/R0N_<role>.md`, in small appends rather than one large
heredoc — a spawn limit killed a report mid-write in round 11. It will be force-added at the sealing step,
because `.gitignore` ignores `.qfai/review/*`.

**Do not modify the subject.** Plant, measure, restore what you planted, and report. If a plant cannot be
restored, say which file and stop.
