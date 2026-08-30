# R01 — implementation-reviewer — round 16, spec-0017 (ATDD stage gates)

**Verdict: REVISE**

**Revision at start:** `0132370d`. **Revision at finish:** `0132370d` — the subject did not move.

**Sibling plants observed, measured through rather than reported as findings.** At start
`packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` was dirty; at finish
`qfai-tests.yml` was dirty instead. Both are `qa-gatekeeper`'s partition. I wrote nothing to that
directory and every tree-reading measurement below is taken from
`git show 0132370d:packages/qfai/assets/init/root/.github/workflows/<file>` copied into
`tmp/r16/tree/`. I planted nothing into any tracked file; all probes are new files under `tmp/r16/`.

**Scope.** Sections 1–4 of the brief, as assigned. Section 5 and 6 were read only where they bear on
the four (the payload counts in the record are covered by `m1`).

## Gates that passed

Stated explicitly because the verdict rule requires it.

1. **The location-bound body pin verifies against the shipped tree.** All twelve
   `ALLOWED_STEP_BODIES` pairs match, digest and `file#job [step name]`, with no orphan entry and no
   unreviewed body (`tmp/r16/digests.mjs`). All four `ALLOWED_ACTION_STEPS` pairs match.
2. **Both `node -e` payload digests verify.** `7f72970a…` at `qfai-tests.yml#detection [Probe
   layer-named test scripts]`, 630 characters; `9cc40c1d…` at `qfai-validate.yml#validate [Resolve
   the package manager (pnpm route fails closed)]`, 1039 characters. Both are in
   `ALLOWED_NODE_PAYLOADS` and nothing else in either file reaches `node -e`.
3. **Section 3's "bytes are the identity" costs no false alarm on the edits the brief names.** A
   uniform re-indent of a block scalar and an extra trailing blank line both leave the digest
   unchanged, because the YAML parser normalizes them before `bodyDigest` sees the string; `|` to
   `|-` moves it, which is correct because the string genuinely changes (`tmp/r16/yamlnorm.mjs`).
   The docstring's claim that block indentation needs no handling is true as written.
4. **The unified token readers do not disagree on the shapes the brief names.** A nested `case`, an
   arm whose pattern is `in`, a function body that opens a `case`, a `select` inside a `case` arm, a
   `*.md|*.txt|LICENSE|docs/*)` alternation, `IFS= read` and `NODE_ENV=… npm ci` all resolve
   identically through `invocationOf` and `headIndexOf`/`bareArgumentsOf`; the arm cases refuse the
   command after the pattern and the `select` word list correctly refuses nothing
   (`tmp/r16/run6.mjs`). I found no fifth reader.
5. **No CRLF exposure.** `.gitattributes` pins `* text=auto eol=lf` and the checked-out workflows are
   LF, so removing the `\r\n` fold does not break the digests on a Windows checkout.

## Method

Every result below is **executed**, twice: once through the helper (Node 24 imports the `.ts`
directly, so the module under test is the file on disk, not a copy) and once through real `bash`
with a fake `npx` / `pnpm` / `tsup` on `PATH` that prints `BUILD-RAN`. A finding is only recorded
when `refusals()` returns `[]` (or omits the write) **and** bash prints `BUILD-RAN` or creates the
file. Probes: `tmp/r16/run1.mjs`, `run2.mjs`, `run3.mjs`, `run4.mjs`, `run5.mjs`, `run6.mjs`,
`exec1.sh`, `exec2.sh`, `exec3.sh`, `digests.mjs`, `gate.mjs`, `gate-mutate.mjs`, `yamlnorm.mjs`.

The gate simulation (`gate.mjs`) is a faithful replay of the E2E assertions — `refusals()` per body,
the body multiset keyed by `file#job [name]`, the action-step multiset, and the three-level
`readUses` key/`uses`/`with`/`shell`/`env` walk. It reproduces `[]` on the unmutated HEAD tree, and
a control mutation (`actions/checkout` gaining a `ref:` input) makes it report, so it can fail.

---

### B1

**`commandsOf` decides `|`, `&` and `#` by reading raw characters instead of `codeMask`, and a
single backslash runs a real build with `refusals()` returning `[]`. Seven spellings, all executed.**

**Issue.** `codeMask` exists, and its docstring (lines 261–268) states the rule this file is built
on: the alternation lookahead used to be "a second, weaker parse of the same text", so the mask is
"computed ONCE" by the same state machine. `isAlternation` honours that. Three other decisions in
the same loop do not — each re-derives shell state from raw text:

- `clobber` (line 215) — `/[>]/.test(current.replace(/[ \t]+$/, "").slice(-1))`
- `redirectAmp` (line 241) — `/[<>]/.test(current.replace(/\s+$/, "").slice(-1))`
- the comment-start rule (line 181) — `/[\s;&|(]/.test(body[i - 1] ?? " ")`

All three read a character that `codeMask` already marks as **not code**. A backslash-escaped `>`
leaves a literal `>` as the last raw character of `current`, so `clobber` and `redirectAmp` both
conclude the following `|` or `&` belongs to a redirection and refuse to split. A backslash-escaped
space leaves a literal space before a `#`, so the comment rule swallows the rest of the line.

**Measured — helper says clean, bash runs the build:**

| # | body | `commandsOf` | `refusals()` | bash |
| - | ---- | ------------ | ------------ | ---- |
| c1 | `echo a\>\|npx tsup` | 1 command | `[]` | `BUILD-RAN: npx tsup` |
| c3 | `echo a\> \| npx tsup` | 1 command | `[]` | `BUILD-RAN: npx tsup` |
| c6 | `echo 'a>'\>\|npx tsup` | 1 command | `[]` | `BUILD-RAN: npx tsup` |
| d1 | `echo a\>&npx tsup` | 1 command | `[]` | (backgrounds, then runs) |
| d2 | `echo a\> & npx tsup` | 1 command | `[]` | (backgrounds, then runs) |
| d3 | `echo a\<& npx tsup` | 1 command | `[]` | (backgrounds, then runs) |
| g1 | `echo a\ #b && npx tsup` | `["echo a\\"]` | `[]` | prints `a #b`, `BUILD-RAN: npx tsup` |

Controls in the same run behave correctly: `echo a\|npx tsup`, `echo "a>"\|npx tsup`,
`echo a & npx tsup` and `echo a#b && npx tsup` are all split and all refuse `npx tsup`. c3 is the
one to look at hardest — the pipe has spaces on both sides and looks completely ordinary, because
`clobber` trims trailing whitespace before reading the last character.

**Why it matters.** This is the exact defect class the module's own docstrings claim to have
retired, at the exact site that retired it. `refusals()` is the instrument a reviewer runs when
someone pastes a new digest into `ALLOWED_STEP_BODIES` — the docstring says so in as many words
("`refusals()` is the instrument that answers it, and this is the gate that makes someone ask"). An
instrument that answers `[]` for a body that builds converts the digest gate from a review trigger
into a rubber stamp.

**Suggestion.** Make the three sites read `mask`, the way `isAlternation` already does. `clobber`
becomes "the last CODE character of `current` is `>`", `redirectAmp` the same over `[<>]`, and the
comment rule becomes `mask[i - 1]` plus the existing character test. `codeMask` is already computed
once per `commandsOf` call and indexed by absolute position, so all three are one-line changes; no
new state and no fourth parse. Then add c1, c3, d1 and g1 to `PLANTED` in
`packages/qfai/tests/unit/shippedLaneCommands.test.ts`, since the corpus is what keeps the class
from returning in a fourth spelling.

**Severity:** Blocking.
**Traces to:** `defect:correctness` — `US-0017-0004` ("no shipped lane runs or appears to run its
own build"), asserted through `refusals()` at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:572-590`; and the `codeMask`
single-parse invariant at `packages/qfai/tests/helpers/shippedLaneCommands.ts:261-268`.

---

### B2

**A here-document discards everything between its delimiter and the end of the line, so
`<<EOF && npx tsup` and `<<EOF > evil.cjs` are both invisible. Executed.**

**Issue.** `packages/qfai/tests/helpers/shippedLaneCommands.ts:143-145`:

```ts
current += body.slice(i, k);
i = lineEnd + (at === null ? rest.length : at.index + at[0].length);
continue;
```

`k` is where the delimiter scan stopped; `lineEnd` is the newline. Everything in `body(k, lineEnd)`
— the rest of the redirection line — is skipped without ever entering `current` or `out`. In bash
that region carries the operators that follow the here-doc: `&& cmd`, `; cmd`, `| cmd`, and any
further redirection.

`cat <<EOF && npx tsup` is masked today only because `cat` is not on either allowlist, so the
command refuses itself for an unrelated reason. Put a `HARMLESS_PROGRAMS` head in front and the
refusal disappears:

| # | body | `commandsOf` | `refusals()` | bash |
| - | ---- | ------------ | ------------ | ---- |
| f1 | `read x <<EOF && npx tsup` + heredoc | `["read x <<EOF"]` | `[]` | `BUILD-RAN: npx tsup` |
| f2 | `grep -q hi <<EOF && npx tsup` + heredoc | `["grep -q hi <<EOF"]` | `[]` | (same shape) |
| f3 | `read x <<EOF > evil.cjs` + heredoc | `["read x <<EOF"]` | `[]` | **creates `evil.cjs`** |

Control: `read x <<EOF` with `npx tsup` on a line *after* the closer is split correctly and refused.

f3 is the worse half. `ALLOWED_REDIRECT_TARGETS` is two entries wide precisely because "a redirect
creates a file, and a created file can be code" (line 1000) — and this branch is a hole straight
through the write scan, not just the invocation scan. `cat <<EOF >> "$GITHUB_OUTPUT"` is GitHub's
own documented idiom for a multiline step output, so a body of exactly this shape is something the
shipped tree could plausibly gain, and it would arrive with the write unreported.

**Suggestion.** Do not skip to `lineEnd`. Consume only `body(i, k)` into `current`, jump `i` to
`k - 1`, and record the here-doc's data span so the main loop skips it when it later crosses the
newline — or, simpler and local: append `body.slice(k, lineEnd)` to `current` before jumping, so
the operators on that line are re-scanned by the normal path. Either way the here-doc BODY stays
data, which is the property this branch was added for and which should not be lost.

**Severity:** Blocking.
**Traces to:** `defect:security` (an unreported file write from a shipped lane) and
`defect:correctness` — `US-0017-0004`, and the write rule at
`packages/qfai/tests/helpers/shippedLaneCommands.ts:1178-1188`.

---

### B3

**The here-document closer's regex escape is inert — it escapes nothing at all — so a delimiter
carrying a regex metacharacter swallows the remainder of the body. Executed.**

**Issue.** `packages/qfai/tests/helpers/shippedLaneCommands.ts:139`:

```ts
delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\$&")
```

The character class closes at the `]` that follows `[\`, so the class is `[.*+?^${}()|[\]` and the
pattern then demands two further literal backslashes and a literal `]`. It matches a metacharacter
only when that metacharacter is followed by `\]`, which no delimiter is. Measured by reading the
regex literal straight out of the file rather than retyping it (`tmp/r16/escprobe.mjs`, which
extracts `/[.*+?^${}()|[\]\\]/g` and `"\$&"` from source and evals them):

```
"EOF"  -> "EOF"     "EOF+" -> "EOF+"     "EOF$" -> "EOF$"
"E.F"  -> "E.F"     "A|B"  -> "A|B"
```

Nothing is escaped. The delimiter is therefore interpolated raw into
`^[ \t]*<delimiter>[ \t]*$`. Both directions break:

- **Fails open.** A `+`, `*`, `?`, `$`, `^`, `(`, `)`, `{`, `}`, `[` or `|` in the delimiter makes
  the closer never match, `at === null` fires, and `i` jumps to the end of the body. Everything
  after the here-doc is consumed as data. Measured: `read x <<'EOF+'` / `hi` / `EOF+` /
  `npx tsup` gives `commandsOf === ["read x <<'EOF+'"]` and `refusals() === []`, while bash prints
  `BUILD-RAN: npx tsup`. Same for `EOF$`. Control with a plain `EOF` delimiter refuses `npx tsup`.
- **Fails closed spuriously.** An unescaped `.` matches any character, so a delimiter like `E.F`
  ends the here-doc at the first body line matching `E?F`, and the remaining data lines are then
  read as commands.

The quoted-delimiter scan deliberately collects any character inside quotes
(lines 122–125), so `<<'EOF+'` reaches this regex by design; nothing upstream constrains the
delimiter to a safe alphabet.

**Suggestion.** Fix the escape — `/[.*+?^${}()|[\]\]/g` with replacement `"\$&"` — and add a unit
row asserting that a metacharacter delimiter still terminates the here-doc, so the escape is
falsifiable rather than decorative. Better still, drop the regex: compare each line of `rest` with
`line.trim() === delimiter` (or `trimStart` plus `trimEnd` on tabs/spaces only), which needs no
escaping and cannot regress this way.

**Severity:** Blocking.
**Traces to:** `defect:correctness` — `US-0017-0004`; and a repository quality expectation in
`CLAUDE.md` ("All source changes must have corresponding test coverage") — the escape has no test
that would notice it doing nothing.

---

### B4

**A fourth channel the two lists do not cover: the VALUES of `on:`, `permissions:` and `runs-on:`.
The install lane can be given a `pull_request_target` trigger and a write token with every digest,
every multiset and every key enumeration green.**

**Issue.** Section 2 of the brief asks what else in a workflow executes that neither list covers.
`ALLOWED_WORKFLOW_KEYS`, `ALLOWED_JOB_KEYS` and `ALLOWED_STEP_KEYS` enumerate key NAMES. For four
keys the value is then also read — `uses` against `ALLOWED_ACTION_COMMITS`, `with` against
`ALLOWED_ACTION_INPUTS`, `shell` against `ALLOWED_SHELLS`, `env` against `ALLOWED_STEP_ENV` — under
the principle the `ALLOWED_ACTION_COMMITS` docstring states outright:

> a pin whose value nothing checks is a shape, and the shape was never the point

Three enumerated keys are exempt from that principle, and all three decide the execution context of
the reviewed bodies: `on:` (when), `permissions:` (with what token) and `runs-on:` (on whose
machine). `qfai-validate.yml`'s `on:` is not read anywhere — the only trigger assertion in the suite
(`spec0017LayeredCiScaffoldE2E.test.ts:839-853`) reads `ORCHESTRATOR` alone, and it is a
`toContain("pull_request")`, which an added `pull_request_target` does not disturb.

**Measured** (`tmp/r16/gate-mutate.mjs`, replaying `refusals()`, the body multiset, the action-step
multiset and the three-level `readUses` walk over `git show HEAD:` copies):

```
A baseline                        -> []
B pull_request_target + write     -> []
C runs-on self-hosted             -> []
D control (unenumerated input)    -> ["qfai-validate.yml#validate: actions/checkout with ref"]
```

B adds `pull_request_target:` to `qfai-validate.yml`'s triggers and turns
`permissions: contents: read` into `contents: write` + `id-token: write`. The job it changes is the
one whose steps are `Install dependencies (lockfile-aware)` and `qfai validate` — a lockfile-aware
install executes the adopter's dependency lifecycle scripts, and `pull_request_target` runs it
against a fork's head with the base repository's secrets and token. Nothing about the twelve bodies
moves, so the digests do not move. C repoints the job at an attacker-nameable self-hosted pool. D
proves the harness can report.

This is not a new obligation invented in review: `permissions: contents: read` is already a control
the shipped file asserts in its own comment ("Least privilege: the job only checks out the
repository and runs the validator"), so the tree already makes the claim — nothing checks it.

**Suggestion.** Two constants beside the ones that already exist, and two comparisons in the same
`readUses` walk, so no fourth site is added:

- `ALLOWED_JOB_PERMISSIONS: ReadonlyMap<string, ReadonlySet<string>>` — for `validate`,
  `{contents: read}`; compare the whole map, not just the keys.
- `ALLOWED_TRIGGERS: ReadonlyMap<string, ReadonlySet<string>>` per workflow file, replacing the
  `toContain` with an equality so an ADDED trigger is a diff.

`runs-on:` I would leave: its value is `${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}`, an adopter
knob by design, and pinning it would pin the adopter's own configuration surface. Record that
decision rather than closing it silently.

**Severity:** Blocking.
**Traces to:** `defect:security` (privilege escalation on the shipped surface, demonstrated with a
control) and `defect:consistency` — the value-pinning principle stated at
`packages/qfai/tests/helpers/shippedLaneCommands.ts:713-721` is applied to four enumerated keys and
not to three others of the same kind.

---

### M1

**`withoutRedirections` removes the FIRST occurrence of `source` rather than the span at `start`, so
a quote-aware scan is undone by a quote-blind `String.replace`.**

**Issue.** `packages/qfai/tests/helpers/shippedLaneCommands.ts:1132-1138`:

```ts
for (const redirection of redirectionsOf(command)) {
  out = out.replace(redirection.source, " ");
}
```

`redirectionsOf` already computed `start` and `j`; `source` is `command.slice(start, j)`. Throwing
those indices away and searching for the text again reintroduces exactly the disagreement the
function's own docstring says it removes — "nothing here can disagree with `redirectionsOf` about
what a redirection is". `redirectionsOf` skips quoted regions; `String.prototype.replace` with a
string pattern does not, and it stops at the first hit. `out` also shrinks as the loop runs, so
indices from the second redirection onward no longer line up with the string being edited.

**Measured** (`tmp/r16/run2.mjs`):

| body | `withoutRedirections` yields | consequence |
| ---- | ---------------------------- | ----------- |
| `npm ci "2>&1" 2>&1` | `npm ci " " 2>&1` | refusal `npm ci +   2>&1` — names a token that is a redirection, the precise symptom the docstring says was fixed |
| `echo ">x" >x` | `echo " " >x` | invocation reported as `"echo  "` |
| `npx qfai validate ">f" >f` | leftover `>f` in the token stream | flag/argument walk reads a redirection |

I did **not** find a false negative from this one; the three demonstrated failures are all in the
noisy direction. It still matters, for two reasons. First, the flag walk and the `node -e` payload
extraction both read `tokensOf(withoutRedirections(command))`, so a shipped payload that ever
contains the literal text of its own step's redirection would have that text excised from the
payload and `payloadDigest` would move for a reason no reader could locate. Second, a refusal that
names a token the command does not carry is the failure mode this instrument spends its fail-closed
budget avoiding.

**Suggestion.** Have `redirectionsOf` return `start` and `end`, and rebuild the string by slicing:
walk the spans right-to-left (or accumulate the kept ranges left-to-right) and splice a single
space in. That removes the search entirely and cannot desynchronise from the scan. `source` can
stay on the record for reporting.

**Severity:** Major.
**Traces to:** `defect:correctness` — the stated invariant at
`packages/qfai/tests/helpers/shippedLaneCommands.ts:1121-1131`.

---

### m1

**The `ALLOWED_NODE_PAYLOADS` docstring carries two claims that the shipped tree refutes, and its
own inline comments already contradict it.**

**Issue.** `packages/qfai/tests/helpers/shippedLaneCommands.ts:784-806`. The docstring says:

- "the two payloads are 514 and 909 characters" — measured 630 and 1039. The inline comments two
  lines below already say 630 and 1039, so the file states both numbers.
- "Both shipped workflows carry the same payload: the one that reads `packageManager` out of
  `package.json`. A second one is a change someone should read." — measured: two distinct payloads
  with two distinct digests, and the inline comments say so ("reads `scripts`" / "reads
  `packageManager`"). The second payload is not a pending change; it is already enumerated.

Measurement in `tmp/r16/digests.mjs`, against `git show 0132370d:` copies.

**Why it matters.** This is round 15's own catalogued class — "Two comments here said the opposite
for three rounds" (line 500) — recurring in the docstring of the constant the same round
regenerated. The prose above a pinned constant is what the next reader uses to decide whether a
digest change is expected; here it would tell them a second payload is a novelty when it is the
status quo.

**Suggestion.** Delete the two sentences rather than restate them: the inline comments beside each
digest already carry the length and the purpose, and a numeral that appears twice will disagree
with itself again. Keep the paragraph explaining *why* it is a hash.

**Severity:** Minor.
**Traces to:** `defect:documentation` — `CLAUDE.md` traceability discipline; the file's own
comment-accuracy rule recorded at
`packages/qfai/tests/helpers/shippedLaneCommands.ts:496-505`.

---

### A1

**A step's NAME being part of the body pin: right call, but the failure does not distinguish a
rename from a swap.**

Answering the brief's question directly. Making the location `file#job [step name]` is correct — it
is the coordinate the reviewer used, and round 15's permutation attack moved a body between steps
in one job, which a `file#job` key alone would not have caught. The cost is real but small: a purely
cosmetic rename reddens the gate.

What is worth improving is the SIGNAL, not the pin. On a rename, the first assertion (unreviewed
digests, reported by step name) stays `[]` and only the pairing `toEqual` fails — as a diff of two
sorted twelve-element lists of `location :: 64-hex`. A reader looking at that diff sees a hash they
cannot verify beside a name they can, and the cheapest way out is to paste. That is the "trains
people to paste" risk the brief names, and it is avoidable.

**Suggestion.** Add one assertion between the two, comparing the multiset of digests alone. If it
passes while the paired assertion fails, exactly one thing happened: a body moved or was renamed,
and no body changed. The message can then say so. Three cheap lines, no new constant.

**Severity:** Advisory. **Traces to:** `advisory:maintainability` — no obligation added; the pin
stays as it is.

---

### A2

**`ALLOWED_ACTION_INPUTS` per action: the split is right, and the refusals it will cause are the
intended cost.**

Also answering the brief directly. The three sets are `checkout: {fetch-depth, persist-credentials}`,
`setup-node: {cache, node-version}`, `pnpm/action-setup: {}` and they match the shipped tree
exactly (verified in `tmp/r16/gate.mjs` baseline). Inputs the tree could legitimately gain —
`cache-dependency-path` and `sparse-checkout` are the obvious two — would each be refused until
someone adds a word to a set. That is the same trade the invocation list makes and the docstring
argues for it in the same terms, so I would not change it.

One thing to keep in view rather than fix: the empty set for `pnpm/action-setup` is load-bearing
in a way the others are not. `version:` is deliberately absent so the action falls back to
`packageManager`, which is what the `Resolve the package manager (pnpm route fails closed)` step
exists to guarantee. If that ever loosens, the coupling between the two should be written down
where the set is, not only in the workflow comment.

**Severity:** Advisory. **Traces to:** `advisory:maintainability` — no change required.

---

## What I attacked and could not break

Recorded so the next round does not re-spend the budget, and so the negatives are auditable.

- **A fourth digest collision.** There is none to find in `bodyDigest` or `payloadDigest` as
  written: both are sha256 over the exact string, nothing is normalized, so two different strings
  cannot share a digest. The remaining attack surface is above the digest — what the digest does
  not cover — which is `B4`.
- **The duplication rule `duplicates && /^[0-9]+-?$|^-$/`.** I could not break it. `&>file` does
  not set `duplicates` (the `&` sits before `i`, and the operator loop starts at `i`), so `&>1`
  reports a write, not a duplication; `>&file` sets `duplicates` but fails the target test, so it
  also reports a write; `2>&1`, `>&2`, `2>&-` and `1>&2-` all classify correctly.
- **`<>`, `>|`, `${VAR}` folding.** All behave as the docstrings claim. `1<>package.json` reports
  `<writes> package.json`; `>|` is one operator; `${GITHUB_OUTPUT}` folds to `$GITHUB_OUTPUT`.
- **`withoutRedirections` producing a false NEGATIVE.** Three wrong-span removals demonstrated
  (`M1`), none of them in the permissive direction. The removed text always begins with `>`, `<`,
  a descriptor digit or `&`, which is why it cannot delete a program name or a flag.
- **A fifth token reader, and reader disagreement.** See gate 4 above.
- **CRLF reachability after the fold was removed.** See gate 5 above.

## Residual risk

1. `B1`, `B2` and `B3` are three holes in one function, `commandsOf`. Each was reachable from a
   different branch and none was reachable from the other two, which is the argument for fixing all
   three and adding all three to `PLANTED` rather than fixing the one with the best demo.
2. `B1`'s root cause is structural: `codeMask` is computed and then consulted by one of four
   decisions. Until the other three consult it, this class will produce an eighth spelling.
3. `B4` says the digest boundary answers "what body" and not "in what context". Bodies are pinned to
   a step; steps are not pinned to a trigger or a token. Round 15 closed permutation between steps;
   the same move is still available one level up, between execution contexts.
4. The evidence pack for this row should record that `refusals()` returned `[]` for seven bodies
   that a `bash` on the same machine executed, since the row's claim is that the instrument fails
   closed.

## Sign-off

- [x] Review verdict is explicit — **REVISE**.
- [x] Findings cite concrete artifacts or evidence — file and line for each, plus executed probes
      under `tmp/r16/`.
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`.
- [x] Required gates and residual risks are recorded — five gates passed, four residual risks.

**Findings:** `B1`, `B2`, `B3`, `B4`, `M1`, `m1`, `A1`, `A2`.

---

## Reproduction integrity

Every finding was re-measured at the end of the round, after the subject was confirmed unmoved.
`packages/qfai/tests/helpers/shippedLaneCommands.ts` hashes to
`4ccc211403360c101ce116e2263e0611a11e7419` both on disk and at
`0132370d:packages/qfai/tests/helpers/shippedLaneCommands.ts`, so nothing measured it in a planted
state. `B1` (c1/c3/c6, g1), `B2`/`B3` (f1–f5), `B4` (A/B/C/D) and the twelve body digests all
reproduce identically on the re-run.

**One operational note for the orchestrator, not a finding.** `tmp/r16/` is shared: it also holds a
sibling's scratch files this round (`slc.orig.ts`, `sec.orig.ts`, `plant.py`, `plant2.py`,
`orig/`, `fullsuite-planted.txt`). Two reviewers keeping restore copies of the same subject in one
unnamespaced directory is the collision hazard the round's plant partition exists to prevent, one
level down. I created only files with names of my own and overwrote none of theirs; the end-of-round
hash check above is what rules out having measured through anyone's plant. A per-role scratch
directory (`tmp/r16-<role>/`) would remove the question next round.
