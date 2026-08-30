# Review request — round 18, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## What this round is for

Round 17's repairs, which are large and unreviewed, and one thing the stage did unprompted.

**The stage broke this round's own rule in round 17**, editing two subject files while a reviewer was
measuring. It disclosed that mid-round and reverted. If you see the subject move, say so — it is a defect
in how the stage runs rounds, and it has now happened twice.

## Two rules about who may write

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/**` — the whole shipped tree this round, not only its workflows — and is
  the only role that may write there. Report a plant you see rather than measuring through it, and re-take
  tree readings from `git show HEAD:<path>`.
- **The stage does not edit the subject while this round runs.**

**Documented traps.** The validate command AND `vitest run` both rewrite `.qfai/report/validate.log`, which
is tracked; restore with `git show HEAD:<path> > <path>`, never `git checkout`. And
`tests/e2e/spec0017RunnerParallelismE2E.test.ts` passes only under `pnpm -C packages/qfai exec vitest`.

### 1. The quote models, rewritten in both walks

`codeMask` now enters `$( … )` and backticks with a fresh state and models `$'…'`; `commandsOf` models
`$'…'` too; the comment rule reads the raw previous character and the mask's verdict on it; the newline
that ends a comment is code again. A here-document unquotes a `\`-escaped delimiter, an unpairable
delimiter is a refusal rather than a licence, and a here-STRING is no longer read as a here-document.

- **Find a tenth spelling.** Nine have been found across three rounds, every one by execution. `$"…"`,
  a backslash-newline inside `$'…'`, `${var//…/…}` containing a quote, an unbalanced `(` inside a comment,
  `$(( … ))`.
- The two walks are still two walks. Where else can they disagree?
- The here-document repair has been rewritten three times in three rounds. Nested delimiters on one line,
  a delimiter that is also a shell word, `<<-` with a tab-indented closer inside a substitution.

### 2. The new surface: what `qfai init` writes

`ALLOWED_INIT_PATHS` (six paths outside the agent-instruction trees) and `INIT_MUST_NOT_SHIP` (a kind rule
over the whole output: nothing a package manager or a shell executes). This is one commit old and it exists
because round 17's gate ran arbitrary code through the digest-approved install step.

- **Find an executable kind the rule does not name**, or a path outside the pin that carries one.
- The four instruction trees are excluded from the path pin by prefix. Is that exclusion abusable?
- `qfai init` is not the only thing an adopter runs. What else does the shipped tree cause to execute?

### 3. The boundary: bytes, shapes, and their orphans

`ALLOWED_WORKFLOW_FILES` pins each workflow by content digest, because a parsed document is not an
identity — eight YAML spellings of an empty value collapse onto one `null`. The three shape pins remain as
the readable layer and now report orphans in both directions.

- Is the byte digest itself defeatable — a checkout transform, an encoding, a BOM?
- Does anything the shapes report now contradict what the bytes report?

### 4. Four guards, repaired for the third time

The corpus count, the Delta Rejected Guard tie, class C's roster and the depth-score pin. Round 17 found
all four failing in one shape: **the check read a wider region than the claim it makes.** Each is now
scoped to its region.

- Break each again, in both directions: a wrong record that passes, and a legitimate edit that fails.
- Use the method that found two doubled escapes in round 16 and confirmed a third fixed in round 17:
  extract each regex from the file's own bytes and evaluate it. A pattern that reads correctly can escape
  nothing.
- `GOVERNANCE` excludes this guard's own source, and round 17 replaced the reason with a measured one. Is
  the measurement right, and is the exclusion still the smallest one that works?

### 5. The record, after three findings against its own corrections

Round 17 found that `revision_form` was settled by a contract nobody had read, that `--profile full` has
no single number because three of its rules watch the review pack, and that option 2's rejection has lost
every stated ground it had.

- The full profile is now recorded as a rule plus a sealed value (**48**). Verify both.
- Option 2's rejection is recorded as unsupported and handed to the CR's owner. Is that the right
  disposition, or does this stage owe more?
- Every count: e2e 1446, integration+unit 1219, callsites 882, the scoped gate at
  `info=2 warning=0 error=1` on eight TCs.
- Two rounds running, a retracted claim was found standing where no needle reached. Re-grep yourself.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260822150000000/R0N_<role>.md`, in small appends.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop.
