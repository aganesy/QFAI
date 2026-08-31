# R01 — implementation-reviewer — round 14, spec-0017 (ATDD stage gates)

**Verdict: REVISE**

**Revision:** `4d737f3a` at start, `4d737f3a` at finish. HEAD did not move.

**The subject DID move while I worked, in the working tree.** Details in *Provenance* below. Every
measurement in this report was re-taken after it was restored, against a tree whose
`qfai-tests.yml` is md5-identical to `git show 4d737f3a:...`.

**Emphasis:** sections 1, 2 and 3 of the request — `ALLOWED_STEP_BODIES` / `bodyDigest`, the repaired
`refusals()`, and the `env:` / `defaults.run.shell` reading. Sections 4 and 5 are touched only where a
claim was cheap to falsify from code.

**Method:** every finding below was executed, not argued. Probes are under
`C:\Users\YusukeSenaga\Documents\GitHub\QFAI\tmp\r14-implrev\`. Nothing in the repository was
modified; nothing was written to `packages/qfai/assets/init/root/.github/workflows/`.

## Gates that passed

Stated first, because `PASS` requires one and these are real.

1. **`ALLOWED_STEP_BODIES` is exact over the restored tree.** 12 `run:` bodies, 12 distinct digests,
   both directions empty — no body without a digest, no digest without a body.
2. **`MECHANISMS` is 25, and the pre-repair helper lets all 25 through.** Verified by running
   `git show 07297875~3:packages/qfai/tests/helpers/shippedLaneCommands.ts` over the corpus:
   `25 of 25` escape the old helper, `0` escape the current one. `PLANTED` (62), `ROOT_CAUSES` (18)
   and `WRAPS` (10 x 62) also all still refuse.
3. **`HARMLESS_PROGRAMS` is 9 and every member is invoked by the shipped tree.** I could not refute
   one on the stated ground (their *arguments* cannot reach a build). The refutation I did find is at
   the redirect layer, not the argument layer — see `B1`.
4. **`defaults.run.shell` reads through one function at all three levels**, and I found no fourth
   *shell* level: `container` / `services` / `uses:` / `with:` close the image and action spellings at
   every holder. The fourth channel I did find is not a shell (`B5`).
5. **The round-13 eslint block is not vacuous.** `eslint --print-config` resolves
   `no-floating-promises` / `await-thenable` / `require-await` / `no-misused-promises` to severity `2`
   for `tests/helpers/shippedLaneCommands.ts`, and to `0` for a control file outside the list
   (`tests/e2e/initE2E.test.ts`). `eslint` over the three subject files is clean with a resolving
   `project`, and root `check-types` is `tsc -b && tsc -p packages/qfai/tsconfig.tests.json`.
6. **Both suites are green** at the restored revision: `tests/unit/shippedLaneCommands.test.ts`
   12/12, `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` 10/10.

The verdict is `REVISE` because four separate bodies run code in a shipped lane with
`refusals() == []`, and two of them keep an `ALLOWED_STEP_BODIES` digest while doing it.

### B1 — a shipped lane runs arbitrary code with `refusals() == []`: the write model cannot see a redirect that is not its own token

**Severity:** Blocking. **Traces to:** `defect:implementation` — `refusals()` in
`packages/qfai/tests/helpers/shippedLaneCommands.ts:827-838`, against the mechanism its own corpus
pins at `packages/qfai/tests/unit/shippedLaneCommands.test.ts:249-253`.

**Issue.** The write rule decides a token is a redirect with
`/^\d*>{1,2}&?$|^\d*>{1,2}&?[^>]/` — the token must *begin* with the operator. bash does not require
that. `echo x>f` and `echo x &>f` are redirects; neither produces a token that begins with `>`.

Executed. The body below is the corpus entry at test line 251 with **one space removed**:

```
echo '{"name":"x","version":"1.0.0","scripts":{"postinstall":"node wm.cjs"}}'>package.json
echo 'require("fs").writeFileSync("ARBITRARY_CODE_RAN","yes")'>wm.cjs
npm install --no-audit --no-fund
```

- `refusals(body)` -> `[]`
- `invocationsOf(body)` -> `echo …`, `echo …`, `npm install` — programs `{echo, npm}`, both already in
  the E2E's pinned program set, so that assertion stays green too
- run under `bash`: exit 0, and `ARBITRARY_CODE_RAN` exists. The install's lifecycle script ran.

The spaced spelling of the same three lines is refused (`<writes> package.json :: …`). The whole
mechanism is defeated by deleting a space.

Full spelling matrix measured (`tmp/r14-implrev/probe10.mjs`):

| spelling | `refusals()` |
| --- | --- |
| `echo J > package.json` | refused |
| `echo J >package.json` (glued) | **`[]`** |
| `echo J>package.json` | **`[]`** |
| `echo J>>package.json` | **`[]`** |
| `echo J &>package.json` | **`[]`** |
| `echo J &>>package.json` | **`[]`** |
| `echo J 1>package.json` | refused |

`&>` escapes by a second route: `commandsOf` splits on a bare `&` (line 192), so `echo J &>f` becomes
`echo J` plus `>f`, and `>f` resolves to `NOTHING` because `headIndexOf` skips a token starting with
`>` and then runs out. A write becomes two commands, one allowed and one invisible.

**Why.** The redirect operator is a *lexer* fact and it is being recovered downstream from token
shape. `codeMask` already knows which character positions are code; `commandsOf` already special-cases
`<(`, `$(` and the backtick. The one construct that decides whether a body can create the file a
permitted install executes is the one left to a regex over whitespace-delimited words.

**Suggestion.** Recognise the redirect where the quote state is already tracked. In `commandsOf`,
when `>` / `>>` / `&>` / `&>>` appears at a code position, emit it as its own `REDIRECT` token (the
same trick `STDIN_FROM_PIPE` already uses for the pipe), and stop treating `&` as a separator when the
next character is `>`. `refusals()` then reads a token that means "write", not a word that starts with
one, and the four escaping spellings collapse into the one rule that already exists.

### B2 — the same hole reaches `ALLOWED_STEP_ENV` at runtime: `$GITHUB_ENV` sets `NODE_OPTIONS` for every later step

**Severity:** Blocking. **Traces to:** `defect:implementation` — `ALLOWED_STEP_ENV`
(`shippedLaneCommands.ts:752-762`) and `ALLOWED_REDIRECT_TARGETS` (line 765).

**Issue.** `ALLOWED_STEP_ENV`'s docstring names the exact damage it exists to stop:
"`NODE_OPTIONS=--require=./loader.cjs` makes every later `node` load that file". The guard closes that
at the YAML level, at three levels of the document. It is reachable from inside a `run:` body, because
`$GITHUB_ENV` is the runner's documented way to set an environment variable for **every subsequent
step in the job** — and under `B1`'s glued spelling the write is invisible.

Executed end to end (`tmp/r14-implrev/ghenv/`):

```
echo NODE_OPTIONS=--require=./evil.cjs>>$GITHUB_ENV
echo 'require("fs").writeFileSync("LATER_STEP_HIJACKED","yes")'>evil.cjs
```

- `refusals(body)` -> `[]`; `invocationsOf(body)` -> programs `{echo}` only
- after the body runs, `$GITHUB_ENV` contains `NODE_OPTIONS=--require=./evil.cjs`
- exporting that file the way the runner does and then invoking `node -e '…'` — a *permitted*
  invocation — creates `LATER_STEP_HIJACKED`

`>>$GITHUB_PATH` is the same shape one program-resolution earlier: it prepends a directory to `PATH`
for later steps, so the enumerated `npx qfai` / `npm ci` / `node -e` all resolve to attacker binaries
while every name on the allowlist stays intact. Also `[]`.

**Why this is not just a restatement of `B1`.** Even after `B1` is fixed, the *spaced* form is refused
only as a generic `<writes> $GITHUB_ENV`, and `$GITHUB_OUTPUT` is already on
`ALLOWED_REDIRECT_TARGETS` because it is the standard way to pass a value between steps.
`$GITHUB_ENV` is the sibling of `$GITHUB_OUTPUT` in every piece of GitHub's own documentation, and the
next person who needs to pass a value between *steps* rather than between *jobs* will reach for it and
find a one-line allowlist entry waiting. That entry would reopen `ALLOWED_STEP_ENV` completely, and
nothing in the file records why it must not be added.

**Suggestion.** Name the two files as refusals in their own right, not as unlisted redirect targets:
a write to `$GITHUB_ENV` or `$GITHUB_PATH` refuses with a message that says *which* guard it defeats
(`ALLOWED_STEP_ENV`), and a comment on `ALLOWED_REDIRECT_TARGETS` states that `$GITHUB_OUTPUT` is
allowed because it is job-scoped data while its two siblings are process state for later steps.

### B3 — a one-line `case` arm defeats `TAKES_NO_PACKAGE`, and installs an arbitrary package

**Severity:** Blocking. **Traces to:** `defect:implementation` — `headIndexOf`
(`shippedLaneCommands.ts:384-400`) versus `invocationOf` (line 402), consumed by `bareArgumentsOf`
(line 768) and `refusals()` line 879.

**Issue.** `invocationOf` learned the `case … in` skip in round 12 (lines 432-437) so a one-line arm
would not swallow the command after it. `headIndexOf` did not: it still answers `undefined` for a head
of `case` or `select` (line 397). `bareArgumentsOf` calls `headIndexOf`, gets `undefined`, and returns
`[]` — so `TAKES_NO_PACKAGE` counts zero bare arguments for a command that has two.

This is precisely the defect `bareArgumentsOf`'s own docstring says it was written to remove: "Two
coordinate systems in one small pair of functions". The repair moved one of the two functions.

Executed (`tmp/r14-implrev/casearm/`):

```
case x in *) npm install ./evil --no-audit --no-fund ;; esac
```

- `refusals(line)` -> `[]`; the bare `npm install ./evil --no-audit --no-fund` -> `["npm install + ./evil"]`
- run under `bash` against a local package declaring `"preinstall": "node mark.cjs"`: exit 0,
  `added 1 package`, and `CASE_ARM_PKG_RAN` written by the package's own lifecycle script

The same `[]` for `case $x in *) npm install left-pad ;; esac`, `pnpm install evil-pkg`,
`npm ci evil-pkg`, `yarn install evil-pkg`, `corepack enable yarn@4.0.0` — the complete
`TAKES_NO_PACKAGE` set, which the unit test at line 340-364 asserts is refused in its bare form.
`tests/unit/shippedLaneCommands.test.ts` has a `case` entry in `ROOT_CAUSES` (`case $x in *) npx tsup
;; esac`) and it passes only because `npx tsup` fails an earlier check; no corpus entry combines a
`case` arm with an *allowed* invocation, which is why five rounds have not seen this.

The shipped tree's own `case` is the multi-line form, where `case "$changed_path" in` lands in its own
segment and resolves to `NOTHING`. Nothing shipped is affected — this is a hole in the instrument, not
a live escape in the tree.

**Suggestion.** One walk, the way `resolvedCommands` became one walk. Either give `headIndexOf` the
`case` / `select` / `()` / arm handling and have `invocationOf` call it for the head, or have
`refusals()` pass `invocationOf` the *residual* tokens it resolved so `bareArgumentsOf` never re-walks
raw text. A test that wraps `WRAPS`-style over `TAKES_NO_PACKAGE` (an install naming a package inside
each of the ten wrappers, plus a one-line `case`) would have caught this and would catch the next one.

### B4 — the second `bodyDigest` collision: one trailing space turns an `echo` into an install, and both sides are clean

**Severity:** Blocking. **Traces to:** `defect:implementation` — `bodyDigest`
(`shippedLaneCommands.ts:643-665`) and the assertion at
`packages/qfai/tests/unit/shippedLaneCommands.test.ts:323-325`.

**Issue.** The request asked for a second pair that behaves differently and hashes the same. Here it
is, and unlike the first one **both sides pass `refusals()`**, so the E2E's live `refusals()` scan
does not catch it either.

`bodyDigest` strips `[ \t]+$` from every line. A trailing space is not a behaviour *except after a
line continuation*, where it is the difference between one command and two — the same argument the
docstring already makes for the newline inside `$( … )`, one character over.

Executed (`tmp/r14-implrev/coll2/`, bodies written from `String.fromCharCode(92)` so nothing is an
escaping artefact):

| body | last char of line 1 | behaviour |
| --- | --- | --- |
| `echo would run: \` + NL + `npm install --no-audit --no-fund` | `\` | prints `would run: npm install --no-audit --no-fund`, installs nothing |
| `echo would run: \ ` + NL + `npm install --no-audit --no-fund` | `\` then a space | prints `would run:`, then **runs the install** |

- `bodyDigest` of both: `4a8902ede088677b…` — **equal**
- `refusals()` of both: `[]`
- `invocationsOf`: reviewed -> `["echo would"]`; mutated -> `["echo would", "npm install"]`
- under `bash`, the second one created `INSTALL_RAN` from the host package's `preinstall`; the first
  did not

So a reviewed body can be turned into a body that installs, and the gate that is "standing between an
unreviewed body and an adopter" reports the same digest. `assets/init/root/.github/workflows/**`
contains no line continuation today, so this is not a live escape — it becomes one the first time a
reviewed body wraps a long command, which is the commonest multi-line idiom in CI.

**Argue it is theatre — the honest answer.** No, not for a body *edit*: I could not defeat the digest
by any edit that changes a character at a code position. But the docstring's claim is stronger than
what holds. "Two bodies that behave differently must not share a digest" is false (above), and "a body
that is not one of them has not been reviewed" is true only of the body *text* (`B5`).

**Suggestion.** Normalize nothing. The `\r\n` replace is already unreachable (`m2`), and the trailing
strip is justified in the docstring by re-indentation — which YAML handles, as the docstring itself
says two sentences later. Deleting both leaves `createHash("sha256").update(body)`, which is the
identity claim the gate says it is making. If a tolerance is genuinely wanted, *refuse* a body that
carries a trailing whitespace run rather than erasing it: a refusal is visible, an erasure is not.
The unit test's `"trailing whitespace is not a behaviour"` case should invert to this pair.

### B5 — the channel the digest does not cover: `working-directory:`, and a reviewed body that can be replicated without limit

**Severity:** Blocking. **Traces to:** `defect:implementation` — the identity gate at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:597-619` and `readUses` at line 626.

**Attribution, stated up front.** I did not find this by construction. At 03:0x I measured 13 `run:`
bodies against 12 digests in the working tree and traced the extra one to a live plant in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` — a directory this round assigns to
`qa-gatekeeper`. That plant surfaced the channel. What follows is my own verification from the source
and by execution, on my own copy in `tmp/`, after the plant was restored. Do not count this and the
gatekeeper's catch as two independent instruments.

**Issue, half one — the key nothing reads.** `readUses` inspects exactly seven keys: `uses`, `with`,
`container`, `services`, `shell`, `defaults`, `env`. `bodyDigest` hashes `run:`. A step's
`working-directory:` — and `defaults.run.working-directory` at job and workflow level — is read by
neither, and by nothing else in the repository (`grep -rn "working-directory" packages/qfai/tests
packages/qfai/src` returns only two unrelated hits in `buildCommand.ts`).

`working-directory` decides *which tree* an enumerated command executes. Executed
(`tmp/r14-implrev/wd/`): the byte-identical shipped `Install dependencies (lockfile-aware)` body,
extracted from `git show 4d737f3a:…/qfai-validate.yml`, run with cwd `./ci-primer`:

- `bodyDigest` -> `7c473537569404e6…`, which **is** in `ALLOWED_STEP_BODIES` (line 704)
- `refusals(body)` -> `[]`
- exit 0, and `WD_CHANNEL_RAN` written by `ci-primer/package.json`'s `preinstall`

The reviewed body was reviewed against the repository root. Nothing recorded that, and nothing checks
it.

**Issue, half two — the gate is not a bijection over steps.** `bodies` is a
`Map<digest, location>` (line 597, `bodies.set(...)` at line 605). Multiplicity is discarded. A body
already on the allowlist may therefore be replicated into any number of new steps, in any job, and
**both** halves of the assertion stay green: the forward filter finds every digest allowed, and the
reverse filter finds every digest still present. Adding a step is not a reviewed act.

The two halves compose: a new step, carrying an already-reviewed body, in a job that never ran an
install, pointed at a directory the reviewed body never saw. That is a body an adopter executes that
nobody reviewed, and the round's highest-value target reports nothing.

**Suggestion.**
1. Add `working-directory` to `readUses`'s refusal set at all three holders — refused by not being
   enumerated, exactly as `container` and `services` are, since no shipped step uses one.
2. Make the identity claim a claim about *steps*, not about a set of digests: build a sorted list of
   `<file>#<job> [name] -> digest` and compare it to a recorded list. That closes replication, gives
   the "no dead entry" half a location to name instead of a bare hex string, and answers the request's
   own question — the deletion pressure comes from the digest being anonymous, not from the assertion
   being two-directional.

### m1 — `>&2` produces two spurious refusals, one of which names nothing

**Severity:** minor. **Traces to:** `defect:implementation` — `refusals()` write loop,
`shippedLaneCommands.ts:828-837`.

`refusals("echo hi >&2")` returns `["<writes>  :: echo hi >", "2"]`. The token `>&2` matches
`^\d*>{1,2}&?[^>]`; `token.replace(/^\d*>{1,2}&?/, "")` yields `2`, which is not an allowed target, so
a duplication of stderr is reported as a write to a file called `2` — and, because `commandsOf` split
at the `&`, `2` is also reported a second time as an invocation.

Redirecting to stderr is ordinary CI idiom and the shipped tree will reach for it the first time a
lane wants a diagnostic off stdout. The fail-closed design is explicitly paid for with "a spurious
refusal in review — which someone reads"; a refusal whose target is the empty string is one a reader
cannot act on, and `<writes>  ::` is the message they get.

**Suggestion.** Treat `>&` as a descriptor duplication rather than a redirect: allow `>&1` / `>&2`
(nothing is created) and keep `>&` followed by a word as a write. Falls out of the lexer change in
`B1`.

### m2 — `bodyDigest`'s `\r\n` normalization is unreachable from its only caller

**Severity:** minor. **Traces to:** `defect:implementation` — `shippedLaneCommands.ts:659`.

Measured: `parse()` from the `yaml` package normalizes line breaks inside a block scalar, so a
document written with CRLF yields `"echo one\necho two\n"` with no CR. The only production caller of
`bodyDigest` is the E2E gate, which always hands it a parsed scalar. The replace can never fire, and
no test exercises it — so it is a normalization step nobody can break and nobody can observe, sitting
in a function whose whole subject is which differences are erased.

**Suggestion.** Delete it with the trailing-whitespace strip in `B4`. If it is kept as a defence
against a future caller that reads raw YAML text, say so in the comment and give it a test.

### m3 — the eslint list is the `tsconfig.tests.json` set minus one, while the comment says it is that set

**Severity:** minor. **Traces to:** `defect:documentation` — `eslint.config.js:73` versus lines 76-89
and `packages/qfai/tsconfig.tests.json`.

The comment reads "The list here is the set `tsconfig.tests.json` includes, where the count is zero."
The tsconfig includes 13 entries; the eslint `files:` list carries 12. The missing one is
`vitest.knobs.ts`, which is still matched by the blanket `disableTypeChecked` block at line 60 — so it
is type-checked by `tsc` and *not* covered by the four promise rules the block exists to re-enable.

Deliberate or not, the sentence is the thing a future widening will be measured against, and it is
false by one entry. Either add `packages/qfai/vitest.knobs.ts` to the eslint list or say in the
comment why it is excluded.

### A1 — reading `uses:` / `with:` / `container` / `services` at the workflow level is dead, and it makes the level look more scanned than it is

**Severity:** advisory. **Traces to:** `.qfai/specs/spec-0017` scope — this is a readability point
about the round-13 repair, not a defect I can demonstrate.

The request asks directly. Answer: reading them there is **harmless** — a workflow document has no
top-level `uses:`, `with:`, `container` or `services`, so those four branches can never fire at that
call site, and they only ever *add* refusals, so no finding becomes unreachable.

The cost is not correctness, it is the reading. Of the seven keys `readUses` inspects, four are dead
at the workflow call site and one (`shell`) is dead there too — GitHub defines no top-level `shell:`
either. Exactly two live checks run: `defaults.run.shell` and `env`. The call site is written to look
like a full scan of the workflow level, and the next person deciding whether the workflow level needs
its own rule will read `readUses(…, parsed)` and conclude it is covered.

Sharing the function was the right call and the alternative (a second copy of the rules) is worse.
What is missing is one line at the call site naming the two keys that can actually fire there. Not
blocking, and not something upstream asked for.

### A2 — is entry 17 of the recurring-class list a restatement?

**Severity:** advisory. **Traces to:** `.qfai/evidence/atdd-spec-0017.md` — outside my domain to
adjudicate; recorded because the request asked and because this round supplies data.

Entry 17 says the scan itself is an instance of the class — reading text standing in for running it.
From where I sit that is **not** a restatement of entry 12: this round produced four bodies that a
*reading* passes and an *execution* refutes (`B1`-`B4`), and in every case the gap was between what
the text was taken to mean and what bash did with it. That is a distinct enough mechanism to be worth
its own entry. `completion-reviewer` owns the merge decision; this is one data point for keeping it.

## Provenance, and what moved

- `git rev-parse --short HEAD`: `4d737f3a` at start, `4d737f3a` at finish. HEAD did not move.
- **The subject moved in the working tree, and I measured across it.** At the time of my first
  shipped-tree measurement, `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` carried
  an uncommitted step in the `unit` job: a duplicate of `Install dependencies (lockfile-aware)` with
  `working-directory: ./ci-primer`. That directory belongs to `qa-gatekeeper` this round, so this is
  a partition working as designed and I did not touch it. It was restored during my session
  (`md5sum` now equals `git show 4d737f3a:…`), and **every number in this report was re-taken after
  the restore**: 12 bodies / 12 digests, both suites green. The one measurement taken during the
  window (13 bodies / 12 digests) is reported only in `B5`, where it is identified as the plant.
- `.qfai/report/validate.log` is modified in the working tree. The diff is `run_id` and
  `started_at` only; `errors: 1 / warnings: 0` matches the profile section 4 claims. Another
  reviewer's gate run, not mine, and not a finding.
- I planted nothing in the repository. Every probe, copy and fixture is under
  `C:\Users\YusukeSenaga\Documents\GitHub\QFAI\tmp\r14-implrev\`; `git status --porcelain` at finish
  shows only the `validate.log` line above. Nothing was written to
  `packages/qfai/assets/init/root/.github/workflows/`.

## Residual risks

1. `B1` and `B3` are both *lexer versus post-hoc regex* defects, and `B4` is the same shape at the
   digest. The repairs listed above close five spellings; the structural risk is that the sixth is
   found by the next sweep, because three of this round's four escapes came from a rule reading token
   text that the walk had already decided the meaning of.
2. `B5` half two means the current gate cannot distinguish "twelve reviewed bodies" from "twelve
   reviewed bodies, each used any number of times, anywhere". Until it is a claim about steps, the
   count in every prose section that says "twelve" is a count of digests, not of what runs.
3. Gaps item 9's scope statement (an allowed install runs the adopter's code) is honest as far as it
   goes, but `B2` and `B5` show two ways the *shipped text* chooses which adopter code that install
   reaches. That is inside `US-0017-0004`'s claim, not outside it.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — file and line for each, executed
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding has `Traces to: none`
- [x] Required gates and residual risks are recorded
