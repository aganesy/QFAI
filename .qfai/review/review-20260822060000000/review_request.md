# Review request — round 15, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## What this round is for

**Everything named below is round 14's repair work.** Round 12 found that five of its own defects had been
introduced by the two or three commits before it, so the base rate of "the fix was the defect" in this
area is high and worth assuming rather than discovering. Round 14 returned twelve blocking findings across
three reviewers, every code one demonstrated by execution, and the repairs for all of them are unreviewed.

Two of round 14's findings were made independently by two reviewers, and those two were the ones that
mattered most. Independent duplication is a signal worth spending effort on rather than avoiding.

## Two rules about who may write, both learned the hard way

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/.github/workflows/` and is the only role that may write there. Round 11's
  gatekeeper caught a file in that directory it had not created and traced it to a sibling planting
  concurrently; a colliding plant can attribute a catch to the wrong instrument. Round 14's gatekeeper plant
  was visible to both siblings, who reported it rather than measuring through it — that is the behaviour
  that worked, so keep doing it.
- **The stage does not edit the subject while this round runs.** If you see the subject move, say so.

**One trap, now documented rather than sprung:** running
`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017` rewrites
`.qfai/report/validate.log`, which is tracked. Restore it with `git show HEAD:<path> > <path>`, never with
`git checkout`, and cite `.qfai/report/validate.spec-0017.json` or the per-run directory instead.

### 1. The redirection lexer, which replaced three token-shape rules

`redirectionsOf` walks a command by character with `tokensOf`'s quote state and reports every redirection
with its target. It replaced the write scan's token test, the stdin scan's token test, and — with a change
in `commandsOf` — the `&` split.

The finding it closes is that a redirection does not have to BEGIN a token: `x>f` and `x >f` had opposite
verdicts, which is the sixth time this file has been defeated by one command written two ways.

- Find a seventh. Every construct that creates or reads a file is in scope: `>|`, `<>`, a here-document,
  `exec 3>file`, a redirection attached to a compound command (`{ …; } > f`, `while …; done > f`), a
  numbered descriptor above 9, `${var}>f`.
- The `&` rule is: an `&` splits unless the next character is `>` or the previous non-space character is
  `<` or `>`. Break it. `a &>b`, `a & >b`, `a>&2`, `a >& b`, `a&&b` all mean different things.
- `>&<digit>` is treated as a descriptor duplication and produces no refusal. Is the digit test right?
  What about `>&-`, `>&$fd`, `2>&1-`?
- A refusal must name something a reader can act on. Round 14 found one whose target was the empty string.

### 2. The key enumerations, which replaced four named-channel rules

`ALLOWED_WORKFLOW_KEYS` (4), `ALLOWED_JOB_KEYS` (8), `ALLOWED_STEP_KEYS` (8) — the keys this tree's own
workflows carry. Anything else is refused, which subsumed the `container` / `services` checks and the
`defaults.run.shell` reading that four earlier rounds had added one at a time.

- Is the inversion actually closed? Find a way to change what a shipped lane executes without adding a key
  to any of the three levels.
- Is a key on one of the three lists dangerous in a value nobody checks? `runs-on` takes
  `${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}`; `if`, `needs` and `outputs` take expressions;
  `permissions` grants tokens. Only `uses`, `with`, `shell`, `env` and `run` have their values read.
- `ALLOWED_ACTION_COMMITS` pins each action to a SHA. Round 14 found nothing checked the value and forty
  zeros passed. Is the new check reachable for every `uses:` in the tree, including one on a job?

### 3. `bodyDigest`, after two collisions

Line endings are normalized and nothing else. The `\r\n` rule is unreachable from the gate — the `yaml`
parser strips CR from a block scalar — and is kept for a future caller, commented as unreachable and
exercised by a unit test.

- **Find a third collision.** Two bodies that behave differently and hash the same. Both previous ones were
  found this way and the second was found twice.
- The digests are now a multiset compared to `ALLOWED_STEP_BODIES` sorted. Round 14 planted thirteen bodies
  against twelve digests and the set version stayed green. Is the multiset version breakable — two steps
  swapping bodies, a body moved between jobs, a digest listed twice?
- Is keeping an unreachable branch with a test the right call, or is a branch nobody can reach from
  production a thing to delete?

### 4. `headIndexOf`, unified with `invocationOf`

`case` / `select` skip past `in`, and a pattern arm or a function header is stepped over — so both
functions answer about the same token. The finding was `case x in *) npm install ./evil ;; esac`.

- Do they still disagree anywhere? `select`, a nested `case`, an arm whose pattern contains `in`, a
  function whose body opens a `case`.
- `bareArgumentsOf` counts from that index. Is the count right for a command with a redirection in the
  middle of its arguments, now that redirections are found by character?

### 5. The record, after eleven corrections

Round 14 found the `error=2` correction applied at one site and standing at five, an eight-TC table stale
on four rows against the ledger, and three statements this record makes about the tree that the tree
contradicts. All are corrected; several corrections are new prose nobody has read.

- Re-grep for the retracted claims. `RETRACTED` gained six needles this round — is any of them inert, and
  is any retracted claim still standing somewhere none of them matches?
- The mechanism-corpus size is now derived in three places by `stageEvidenceCounts.test.ts`. Its first
  version counted 22 against 29 because prettier had rewritten some entries to single quotes. Is the
  second version right, and is it falsifiable?
- Coverage Depth Matrix: classes C and D merged into one whose property is "neither A nor B", with a
  roster check. Is the merged property vacuous in the other direction — does it accept a cell that is
  simply untested?
- `## P7 quality gates` is re-measured: e2e 1444, integration+unit 1219, callsites 880. Verify all three.
- The gate: `info=2 warning=0 error=1`, `QFAI-ATDD-112` on eight TCs. Verify, and verify per row that each
  has a recorded reason where the ledger says to look.

### 6. What round 14 accepted rather than fixed

- `refusals()` is an instrument, not the boundary. `ALLOWED_STEP_BODIES` is the boundary and is silenced
  by pasting a digest. Is that still the right division after this round's repairs, or has the scanner
  become load-bearing again?
- An allowed install runs the adopter's own lifecycle scripts. `US-0017-0004`'s claim is scoped to what the
  shipped TEXT invokes. Is the scope statement in Gaps item 9 now complete, after `working-directory`
  showed the lane can select a manifest without writing one?

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260822060000000/R0N_<role>.md`, in small appends rather than one large
heredoc — a spawn limit killed a report mid-write in round 11.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop.
