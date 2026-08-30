# R01 — implementation-reviewer, round 17, spec-0017 (ATDD stage)

**Revision at start:** `1d7c0c3f`. **Revision at finish:** recorded in the closing section.

**Verdict: REVISE.**

A gate that passed, stated as the brief requires: the round-16 repair of the noclobber rule holds.
`echo a\>|npx tsup` — the spelling that ran a real build past round 15 — now splits into
`["echo a\\>", "<pipe> npx tsup"]` and `refusals()` returns `["npx tsup"]`, measured by executing the
body under `bash -e -o pipefail` against a stub `npx` on `PATH` and confirming the stub was not
invoked. The here-document metacharacter class repaired in round 16 also holds: extracted from the
file's own bytes, line 168 reads `/[.*+?^${}()|[\]\\]/g` to the engine, so `]` and `\` are genuinely
escaped this time.

That is the extent of what passed in my two sections.

## Method

Every claim below was measured, not read. Two rigs, both under `tmp/r17-impl/` and `tmp/r17-scope/`:

- `rig.mjs` imports the subject helper directly (`node` v24 strips the types), computes `refusals()`
  and `commandsOf()` for a body, then writes the same body to `step.sh` and runs it under
  `bash -e -o pipefail` with stub `npx` / `tsup` / `webpack` / `make` on `PATH` that append to a
  marker file. An **escape** is `refusals() === []` **and** the marker written.
- `regexes2.mjs` extracts every regex literal from `shippedLaneCommands.ts` **by byte scan**, compiles
  each one, and prints what the engine built plus each character class member by member — the method
  round 16 used to find the two doubled escapes. Twenty literals; results in `A1`.

Scratch source files contain **no literal backslashes** (`const B = String.fromCharCode(92)`), because
this environment eats one escape level through a heredoc and a probe with a mangled escape measures a
different string than the one it names.

## A plant I saw, reported rather than measured through

At `08:39` the working tree was clean (`git status --porcelain` empty, recorded with `HEAD` at start).
At `08:40:05` and `08:40:20` three untracked files appeared inside the shipped asset tree:

    packages/qfai/assets/init/root/.npmrc          112 bytes  ignore-scripts=false / audit=false / fund=false
    packages/qfai/assets/init/root/package.json    202 bytes  "scripts": { "preinstall": "node ./.ci-primer.cjs" }
    packages/qfai/assets/init/root/.ci-primer.cjs  215 bytes  writes QFAI_PLANT_EXECUTED.txt

`.qfai/report/validate.log` also moved (20 insertions, 12 deletions), which is the documented trap
firing for whoever ran the suite.

These are not mine and I did not touch them. They are outside `packages/qfai/assets/init/root/.github/
workflows/`, so they are not inside `qa-gatekeeper`'s declared partition either — whoever owns them
should say so. I re-took every shipped-tree reading from `git show HEAD:<path>` and did all of my own
measuring in `tmp/`, so nothing below is measured through them. **I did not run `vitest` at all this
round**: the suite would have measured through the plant and would have overwritten a
`.qfai/report/validate.log` that was already dirty with someone else's state, which I could not then
have restored honestly. Every measurement below is direct execution instead, which is stronger.

The subject itself is unmodified: `git diff HEAD --stat` over
`packages/qfai/tests/helpers/shippedLaneCommands.ts`, `tests/e2e/`, `tests/unit/` and
`assets/init/root/.github/` is empty.

### B1

**An eighth lexer spelling: ANSI-C quoting `$'…'`. `refusals()` returns `[]` and a real build runs.**

**Issue.** Neither `commandsOf` nor `codeMask` models `$'…'` (POSIX/bash ANSI-C quoting), in which a
backslash escapes the closing quote. Both read the escaped quote as *closing* the single-quoted run and
the next quote as *opening* a new one, so quote parity inverts for the remainder of the body and every
separator after it is swallowed as quoted text. Measured, executed:

    body       echo $'a\'' | npx tsup
    commandsOf ["echo $'a\\'' | npx tsup"]        <- ONE command, not two
    refusals   []
    bash       stub npx invoked with "tsup"       <- the build ran

    body       echo $'a\'' && npx tsup
    commandsOf ["echo $'a\\'' && npx tsup"]
    refusals   []
    bash       stub npx invoked with "tsup"

The head resolves to `echo`, which is on `HARMLESS_PROGRAMS`, so the whole line is allowed by name and
the build after the separator is never a command at all. Both the pipe form and the `&&` form escape,
which matters because they are the two shapes the previous seven spellings took.

**Why it is blocking.** This is the same class the file's own docstring says it was rebuilt to escape:
an instrument whose content is "there is nothing here" returning `[]` for a body that builds. The
`$'…'` blind spot is not exotic — `$'\n'`, `$'\t'` and `$'…\'…'` are how a bash author writes a literal
control character or an apostrophe without a here-document, and `printf $'%s\n'` is ordinary CI prose.
Unlike the seven round-16 spellings this one does not need a redirection, a comment or a noclobber
operator: two quotes and a backslash.

**Suggestion.** `$` followed by `'` is a distinct token and should be lexed as one, in **both**
`commandsOf` and `codeMask` (they must not diverge — that is `B2`'s root cause one level up): on
`$'`, scan to the terminator treating `\<any>` as two literal characters, and emit the whole run as
quoted text. The same walk should be used for `$"…"`. If a full ANSI-C lexer is not wanted, the
fail-closed alternative the file already has a symbol for is available: a body containing `$'` that
this scanner does not model resolves to `UNREADABLE`, which costs a refusal a reader can act on rather
than a shipped build.

**Severity: Blocking. Traces to:** `defect:security` — the assertion under `US-0017-0004`
("invokes only the programs an adopter's lanes are allowed to invoke") returns clean for a shipped
body that executes an arbitrary program.

### B2

**A ninth spelling, and a fail-OPEN default behind it: a here-document whose closer is never found
discards the whole rest of the body. `<<\EOF` reaches it in three lines.**

**Issue.** Two defects compose.

*The delimiter parse does not do quote removal for the backslash form.* Lines 145-158 strip `"` and
`'` from the delimiter word but treat `\` as an ordinary delimiter character, so `<<\EOF` yields the
delimiter `\EOF`. bash does quote removal on all three spellings — `<<'EOF'`, `<<"EOF"` and `<<\EOF`
are one operator written three ways, and all three end at a line reading `EOF`. This is the
"one command, two spellings" invariant the file's own comment at line 1105 says it has been defeated
by six times.

*When the closer is not found, the scanner assumes the here-document runs to the end of the body.*
Line 172: `heredocEnd = lineEnd + (at === null ? rest.length : at.index + at[0].length)`. `at === null`
means "I could not find where this data ends", and the code answers it by discarding every remaining
command as data. That is the fail-open direction, in the one function whose contract is to fail closed.

Composed, with the head on `HARMLESS_PROGRAMS` so nothing else fires. All three measured and executed:

    body       read line <<\EOF          data          EOF          npx tsup      (four lines)
    commandsOf ["read line <<\\EOF"]     <- the build is not a command at all
    refusals   []
    bash       stub npx invoked with "tsup"

    body       grep -q data <<\EOF       data          EOF          npx tsup
    commandsOf ["grep -q data <<\\EOF"]
    refusals   []
    bash       stub npx invoked with "tsup"

    body       read x <<\EOF >> "$GITHUB_OUTPUT"      k=v      EOF      npx tsup
    commandsOf ["read x <<\\EOF >> \"$GITHUB_OUTPUT\""]
    refusals   []
    bash       stub npx invoked with "tsup"

The third is the shape that matters most: it is GitHub's documented multiline-output idiom, which the
comment at line 137 names as the reason the here-document is handled at all, one backslash away from
swallowing the rest of the step.

**Why it is blocking.** Same class as `B1` and one size larger — `B1` mis-splits one line, this
discards an unbounded suffix of the body. A single unclosed or mis-derived here-document anywhere in a
shipped `run:` makes everything after it invisible to `refusals()`, `invocationsOf()` and the write
scan simultaneously, and the failure is silent by construction: the commands are not refused, they are
not reported, they are gone.

**Suggestion.** Two independent fixes, both small, and both are wanted:

1. Do quote removal in the delimiter walk for `\` as well as `"` and `'` — a `\` outside a quote
   contributes the next character literally and marks the delimiter as quoted, exactly as the two
   quote characters already do.
2. Make the missing closer fail closed. When `closer.exec(rest)` is `null` the scanner does not know
   where the data ends, so the honest answer is `UNREADABLE` for the body rather than a silent skip to
   EOF. `resolvedCommands` already has the symbol and `refusals()` already reports it as
   `<unreadable> …`. Fixing only (1) leaves the next mis-derived delimiter in the same place.

**Severity: Blocking. Traces to:** `defect:security` — `refusals()` returns `[]` for a shipped body
that runs a bundler, and (2) is a fail-open default in the function the module docstring says exists
because "it fails **closed**".

### B3

**All three shape pins are pins on `.github/workflows/**`. `qfai init` ships more than that, and the
rest of what it ships has no enumeration guard of any kind.**

**Issue.** `ALLOWED_WORKFLOW_SHAPE`, `ALLOWED_JOB_SHAPE` and `ALLOWED_STEP_SHAPE` are reached through
exactly two readers in `spec0017LayeredCiScaffoldE2E.test.ts`:

- `shippedWorkflowFiles()` (lines 197-202) — `readdir` of `<project>/.github/workflows`, filtered to
  `/\.ya?ml$/`
- `workflowText(file)` (lines 94-96) — `readFile` of `<project>/.github/workflows/<file>`

Everything else the file touches in the produced project is two catalog markdown files under
`US-0017-0009`. The tracked shipped root tree at `1d7c0c3f` is four files:

    packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml      pinned
    packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml   pinned
    packages/qfai/assets/init/root/qfai.config.yaml                      read by nothing in this gate
    packages/qfai/assets/init/root/DESIGN.md                             read by nothing in this gate

and **a fifth file added to that directory reaches an adopter's tree with no assertion naming it.**
I checked for a guard and there is none: `initAssetsRootMirror.test.ts` mirrors
`assets/init/.qfai/**` only and touches `root/` for a single existence check on `qfai.config.yaml`;
`sddTemplateWhitelist.test.ts`, `assets.test.ts` and the twenty-odd `QFAI_TREES` guards are all scoped
to `assets/init/.qfai`. No test enumerates the file set `root/` ships.

**Demonstrated, not argued.** In `tmp/r17-scope/`, reconstructing the shipped root tree from
`git show HEAD:` (so nothing is measured through the plant reported above), adding one file the pins
cannot see, and then running the **shipped install step's own body verbatim** — parsed out of the
shipped `qfai-validate.yml`, not retyped:

    fixture     .github/workflows/qfai-validate.yml   (HEAD bytes)
                qfai.config.yaml, DESIGN.md           (HEAD bytes)
                .npmrc                                <- the added file: node-options=--require=./.qfai-ci-primer.cjs
                .qfai-ci-primer.cjs                   <- appends to OUT_OF_SCOPE_EXECUTED.txt
                package.json                          <- the ADOPTER's own, with an ordinary `prepare` script

    run         bash -e -o pipefail <the "Install dependencies (lockfile-aware)" run: body>
    exit        0
    stdout      > adopter@0.0.0 prepare / > node -e "0" / up to date in 2s
    marker      OUT_OF_SCOPE_EXECUTED.txt present, contents "shipped file ran"

No lockfile, so the step took its own documented `npm install --no-audit --no-fund` branch — the exact
invocation `ALLOWED_INVOCATIONS` and `ALLOWED_FLAGS` enumerate. The digest of that body did not move,
no step was added, renamed or re-conditioned, no key appeared that is not on `ALLOWED_STEP_KEYS`, and
arbitrary shipped code executed. The `prepare` script belongs to the adopter (husky, patch-package and
`build`-on-install all put one there); the shipped tree supplied only `.npmrc` and the file it names.

**Why it is blocking.** The brief's own framing is right: the previous four channels were each found by
asking a smaller version of this question, and each repair named the key that had just been used. The
shape pins are a real advance *within* the document — but they answer "what does this workflow say",
and the claim `US-0017-0004` carries is about **an adopter's lanes**, which are executed by a runner
with the whole shipped tree checked out. `.npmrc`, `.yarnrc.yml` (Berry `plugins:` loads local JS),
`package.json` lifecycle scripts, `.nvmrc`, a `.github/actions/*/action.yml`, `.husky/*` and
`.devcontainer/*` are all inside what `qfai init` may ship and outside every pin in the helper. Round
17's own working tree already contains someone planting three of them, which is the fifth channel
arriving on schedule.

**Suggestion.** The pins do not need to grow a bash scanner for every file type. The cheap, in-shape
answer is the one this file already uses twice: **enumerate the shipped set**. One assertion over
`readdir`-recursive of the produced project's non-`.qfai` surface, compared against a written-down
list of relative paths (four entries today), fails closed on any fifth file and costs one line to
update deliberately. That is strictly the same argument `ALLOWED_STEP_SHAPE`'s docstring makes for
steps, one level up, and it subsumes the whole class rather than naming `.npmrc`.

**Severity: Blocking. Traces to:** `defect:security` — a shipped file executing arbitrary code inside
the digest-approved install step, with every assertion in the spec-0017 suite unmoved.

### B4

**`codeMask` and `commandsOf` do disagree, and the disagreement is exploitable: a flat quote tracker
with no model of `$( … )` puts a `)` on a CODE position, `isAlternation()` returns true for a real
pipe, and the build after it is absorbed as an argument to `echo`.**

**Issue.** The brief asks the right question. `codeMask` (lines 306-345) toggles `quote` on every `"`
and `'` in document order and has no notion of a substitution. `commandsOf` enters `$( … )` as its own
body with its own quote state — correctly, because bash re-opens quoting inside a substitution. So for
`"$(echo ")")"`, bash and `commandsOf` both see a quoted substitution whose output is `)`, while
`codeMask` sees `"` open, `"` close, then a bare `)` — **a code position where the document has none.**

`isAlternation()` (lines 247-264) reads exactly that mask: it walks forward over code positions and
returns `true` on the first `)`. A `true` there means the `|` is a `case` alternation and must not
split. Measured, executed:

    body       echo a | npx tsup "$(echo ")")"
    commandsOf ["echo \")\"", "echo a | npx tsup \"<substitution>\""]   <- the pipe did not split
    refusals   []
    bash       stub npx invoked with "tsup )"                           <- the build ran

    body       echo a | npx tsup "$(echo ")")" "x"
    refusals   []
    bash       stub npx invoked with "tsup ) x"

The control tells the story. Remove the inner quote and the same shape is caught:

    body       echo a | npx tsup "$(echo hi)"
    commandsOf ["echo a", "echo hi", "<pipe>  npx tsup \"<substitution>\""]
    refusals   ["<unreadable substitution> <pipe>  npx tsup \"$(…)\""]

One `"` decides whether the gate reports a build or nothing. Once the pipe fails to split, the head is
`echo`, `echo` is on `HARMLESS_PROGRAMS`, and the substitution guard at line 1294 is explicitly
disarmed for harmless programs — so all three of the file's independent defences are bypassed by the
same single mis-classified character.

**Why it is blocking.** This is the fourth measured instance of the module's own stated defect: two
readings of one text that can disagree. `codeMask`'s docstring says it exists *because* "the
alternation lookahead used to be a second, weaker parse of the same text" and that "two copies of the
lexer is the two-copies-of-an-allowlist defect one size smaller". Round 16 unified the *consumer* and
left the two *parsers* — `commandsOf` recurses into substitutions and backticks, `codeMask` does not —
so the second copy is still there, one level down, and this is what it costs.

**Suggestion.** Make the mask come from the same walk that produces the commands rather than from a
second traversal. Concretely: have `commandsOf` emit the mask as it goes (it already knows when it is
inside a quote, a comment, a substitution or a here-document, and it already recurses), or — smaller —
teach `codeMask` the same three recursion points `commandsOf` has (`$(`, backtick, `<(`/`>(`) and mark
their whole span as non-code, which is the answer `isAlternation` needs anyway: a `)` that closes a
substitution is never a case arm. A fail-closed stopgap, if the unification is too large for this
round: when `isAlternation()` would return `true` at a `|` whose command contains a substitution,
return `UNREADABLE` for that command instead.

**Severity: Blocking. Traces to:** `defect:security` — `refusals()` returns `[]` for a body that runs
a bundler, through the specific two-parser disagreement the file claims to have removed.

### M1

**`JSON.stringify` over a parsed YAML node is not a boundary. It is a lossy projection, and I can name
three collision classes it admits — including one that leaves a document GitHub Actions will refuse to
run looking byte-identical to the reviewed one.**

**Issue.** The brief asks whether the canonical-JSON comparison is stable enough. It is not, and the
losses are on both stages: `yaml.parse` normalizes, and `JSON.stringify` normalizes again.

I built a faithful replica of the three assertions (`spec0017LayeredCiScaffoldE2E.test.ts:642-812`) in
`tmp/r17-scope/pinrig.mjs`, confirmed it GREEN against the HEAD bytes of both shipped workflows, then
mutated the documents. Every line below is a measured result of that replica.

*1 — a step that is not a mapping is invisible at three call sites simultaneously.*

    mutation   a bare `- npx tsup` list item spliced into the verdict job's steps
    result     GREEN

`if (!isRecord(step)) continue` appears in the step-shape loop (line 646), in `readUses`'s caller
(line 802) and in the `refusals` loop (line 578, as `isRecord(step) ? step["run"] : undefined`). A
scalar step is skipped by all three, so the pin reports the document unchanged. GitHub will reject
that workflow — which is the point: **the lane then never runs, and a lane that never runs is a lane
that never fails.** That is verbatim the failure mode `ALLOWED_WORKFLOW_SHAPE`'s own docstring says it
was written to close "before it is planted".

*2 — `null` is a collision class of at least eight spellings, two of which are not null.*
`ALLOWED_WORKFLOW_SHAPE` pins `"pull_request":null`. All eight of these leave it GREEN:

    pull_request:        pull_request: ~        pull_request: null     pull_request: Null
    pull_request: NULL   pull_request: .nan     pull_request: .inf     pull_request: -.inf

The last three are floats. `JSON.stringify` cannot represent `NaN` or `Infinity` and emits `null` for
both, so a trigger key carrying a float is indistinguishable from the reviewed empty value.

*3 — number spellings collapse.* `timeout-minutes: 5`, `5.0`, `0x5` and `5e0` are one value after
parse, so the pin cannot tell them apart. Both `0x5` and `5.0` measured GREEN against the pinned `5`.

For completeness, two normalizations that are **correct** and I am not reporting as defects: a
whole-file CRLF conversion and a prepended UTF-8 BOM both measured GREEN, and both preserve behaviour.

**Why it matters.** It does not currently reach execution, which is why this is `M` and not `B`. It
matters because of what the pin is FOR. Its docstring says a workflow is pinned as "everything it
says", and the three collision classes above are things a workflow says that the pin cannot hear. The
first one is not hypothetical drift either — it is the same `isRecord` early-`continue` idiom repeated
at three sites, which is the "two copies of one rule" pattern this file has now found at five sizes.

**Suggestion.** Two changes, both small:

1. Make the non-record cases **loud instead of skipped**. `if (!isRecord(step)) contexts.push(...)`
   rather than `continue`, at all three sites, and the same for `if (!isRecord(job)) continue` at line
   770 and `if (!isRecord(parsed)) continue` at line 762. A shipped document this scan cannot read is
   exactly the `UNREADABLE` case the helper argues for on the command side; the YAML side answers it
   with silence.
2. If the pin is meant to be an identity check, compare the **document**, not a projection of it: pin
   `bodyDigest` of the file bytes with the step `run:` bodies excised, or serialise from the yaml
   library's own AST rather than through `JSON.stringify`. The step list already took this lesson —
   `bodyDigest`'s docstring is three paragraphs on why "the bytes are the identity" after three
   normalizations each produced a collision. `JSON.stringify` is the fourth normalization, applied to
   everything except the bodies.

**Severity: Major. Traces to:** `defect:correctness` — the pin's stated claim ("the document is not
the reviewed one") is false for three demonstrated classes of document.

### M2

**`ALLOWED_WORKFLOW_SHAPE` and `ALLOWED_JOB_SHAPE` are checked in ONE direction. A pinned entry with
nothing left to pin is invisible — which is precisely the property the step list's docstring claims
for itself, and the two new pins did not inherit it.**

**Issue.** The step pin is bidirectional by construction: it is an array compared with `toEqual`, so a
line with no step left fails. The two map-shaped pins are not. Lines 764 and 772 only ever ask "does
what the tree ships match a pin"; nothing asks "does every pin still describe something the tree
ships". Measured on the replica, against unmodified HEAD bytes with only the pin map mutated:

    an orphan entry added to ALLOWED_JOB_SHAPE       ("qfai-tests.yml#deploy")   GREEN
    an orphan entry added to ALLOWED_WORKFLOW_SHAPE  ("qfai-release.yml")        GREEN
    the unit job's pin DELETED from ALLOWED_JOB_SHAPE                            RED   (fails closed, correct)

**Why it matters.** These two maps are the only written record of what shape was reviewed. If they can
carry entries for jobs and files that do not exist, the record drifts toward the reviewer's memory
rather than the tree, and the next person reading `ALLOWED_JOB_SHAPE` to learn what ships is reading
nine entries for eight jobs with nothing to tell them which. The step list's own comment names this
exact hazard — "a digest with no body left is an entry nobody deleted" — one pin away.

It also has a concrete near-term cost: these two pins were created **one commit ago** by collapsing
three earlier pins, and `US-0017-0008` records that retiring `qfai-validate.yml` is this spec's own
direction. When that retirement lands, four `ALLOWED_JOB_SHAPE` / `ALLOWED_WORKFLOW_SHAPE` entries and
their `ALLOWED_STEP_ENV` / `ALLOWED_ACTION_COMMITS` neighbours go stale silently, and only the step
array will say anything.

**Suggestion.** Two lines. Build the observed set of `${file}` and `${file}#${id}` keys during the same
walk and assert `[...ALLOWED_WORKFLOW_SHAPE.keys()].sort()` and `[...ALLOWED_JOB_SHAPE.keys()].sort()`
equal them. That is the same `toEqual` the step pin already uses and the same rule the unit suite
already applies to `HARMLESS_PROGRAMS` ("an unused entry is not harmless breadth — it is a slot a
future edit can fill without anyone reading it", `tests/unit/shippedLaneCommands.test.ts:410`). The
argument is already written down in this repository; it just has not been applied to the two newest
pins. `ALLOWED_STEP_ENV`, `ALLOWED_ACTION_COMMITS`, `ALLOWED_ACTION_INPUTS` and `ALLOWED_ACTIONS` are
one-directional in the same way and want the same treatment.

**Severity: Major. Traces to:** `defect:code-quality` — the reviewed-shape record can diverge from
the shipped tree in the one direction no assertion reads.

### M3

**Round 16's comment repair went one step too far: `commandsOf` no longer recognises the ordinary
trailing comment, and `codeMask` still does. A shipped step can never again carry `cmd # note` — and
the refusal it produces names something that is not there.**

**Issue.** Round 16 moved the comment decision from the raw previous character to `lastCode(i)`
(line 212), which fixes the escaped-space case its comment cites. But `lastCode` *skips spaces and
tabs by design* (line 95), so for `echo hello # note` it returns `o`, not the space — and `o` is not in
`[\s;&|(]`, so **no comment starts.** `codeMask` was not changed and still reads `body[i - 1]` raw
(line 338), so the mask says comment and the walk says not. Same question, two rules, two answers, in
the two functions round 16 unified.

The consequence is not theoretical. Measured, with bash executing each body and running nothing:

    body      echo hello   # a && npx tsup
    refusals  ["npx tsup"]                                        <- bash ran nothing

    body      npm ci # installs, then && npx tsup in a note
    refusals  ["npm ci + # installs, then", "npx tsup in a note"]  <- bash ran nothing

    body      echo a >/dev/null # >evil.cjs
    refusals  ["<writes> evil.cjs :: echo a >/dev/null # >evil.cjs"]

    body      pnpm install --frozen-lockfile # keep in sync with the lockfile; do not use npm ci
    refusals  ["pnpm install + # keep in sync with the lockfile", "not use"]

Four false positives from the most ordinary bash prose there is. The last is the one to read twice: it
is a comment a maintainer of this very tree would write, and the gate reports a package named
`# keep in sync with the lockfile` installed by `pnpm install`, plus a program called `not use`. The
`#` word also reaches `bareArgumentsOf`, so `TAKES_NO_PACKAGE` fires on it.

**Why it matters.** `US-0017-0004` goes RED the first time anybody adds a trailing comment to a shipped
step — a test that punishes a legitimate edit, and punishes it with a message that names the wrong
thing. This file spends its fail-closed budget deliberately and says so: "a spurious refusal costs a
review someone reads". A refusal naming `not use` is not a review anyone can act on; it is the cost
without the benefit. It is also a **regression this round introduced** — the previous rule got this
case right.

**Suggestion.** The two properties are not in tension; they just need different lookbacks. A comment
starts where the previous character is unquoted whitespace **or** a separator **or** nothing — so the
rule wants the raw previous character for the whitespace test and the mask only to decide whether that
character is *code* whitespace rather than quoted or escaped. Concretely: `body[i-1]` matches
`[\s;&|(]` **and** `mask[i-1] === true`. That rejects `echo a\ #b` (the escaped space has
`mask === false`, which is why round 16's example fails today) and accepts `echo hello # note`.
Whatever form it takes, `codeMask` must be changed in the same commit — the two answering differently
is the defect, independently of which answer is right.

**Severity: Major. Traces to:** `defect:correctness` — a regression introduced at `2783a5ca`, reddening
legitimate shipped content and reporting invented programs.

### m1

**A second reachable trigger for `B2`'s fail-open here-document skip: the arithmetic left-shift
operator. `(( n = 1 << 2 ))` on its own line discards every command after it.**

**Issue.** The here-document branch fires on `<<` whenever `quote === ""` (line 139). It does not know
it is inside an arithmetic command, so `(( n = 1 << 2 ))` is read as a here-document with delimiter
`2`, no closer is found, and `heredocEnd` is set to the end of the body. Measured:

    body       (( n = 1 << 2 ))          npx tsup      (two lines)
    commandsOf ["(( n = 1 << 2 ))"]      <- the second line is gone
    refusals   ["(( n"]
    bash       stub npx invoked with "tsup"

`$(( 1 << 2 ))` is safe — the `$(` branch consumes it and the recursion sees no newline — so it is
specifically the arithmetic **command** form, which is how CI writes a loop bound or a bit test.

This one is caught today, but only by accident: `(( n` happens to be unreadable, so `refusals()` is
non-empty. It is one allowed head away from `B2`'s silent form, and the reported refusal names the
arithmetic rather than the swallowed build, so a reader who "fixes" the refusal by allow-listing the
construct opens the hole rather than closing it.

**Suggestion.** Fixing `B2`'s point (2) — `UNREADABLE` when the closer is not found — fixes this too,
with a message that says what actually happened. Recognising `((` as an arithmetic command and
skipping to its matching `))` is worth doing as well, but it is the second fix, not the first.

**Severity: Minor. Traces to:** `defect:correctness` — same root cause as `B2`; recorded separately
because the trigger is a different shell construct and a reader would not find it from `B2`'s
delimiter story.

### m2

**Dead defensive code in `US-0017-0006`, and it hides which YAML version the gate assumes.**

**Issue.** Line 856 reads `parsed["on"] ?? parsed[String(true)] ?? parsed["true"]`, commented "`on` is
read under two keys: YAML 1.1 folds the bare word to the boolean `true`." Two problems: `String(true)`
and `"true"` are the same key, so the third arm can never be reached; and the `yaml` package parses
under YAML 1.2 core, where I measured `on:` staying the string `on` — so the second arm is unreachable
too. Both fallbacks are dead.

That is only a tidiness point on its own. It matters because **GitHub's own parser is the YAML 1.1
one** — this is why the fallback was written — and the gate therefore reads the shipped document under
a different YAML version than the runner does. `ALLOWED_WORKFLOW_SHAPE` pins `"on"` as a string key; a
document written `true:` parses to the key `"true"` here (measured) and to the trigger block at
GitHub. The pin catches that particular one, which is why this is `m` and not `M`, but the version
mismatch is an assumption nothing in the file states.

**Suggestion.** Delete the two unreachable arms and put one sentence where they were: this gate parses
YAML 1.2 core via the `yaml` package, GitHub parses YAML 1.1, and the shape pins are the thing that
has to hold across the difference. A dead fallback reads as a handled case.

**Severity: Minor. Traces to:** `defect:code-quality` — unreachable code documenting a real
assumption that is now recorded nowhere else.

### A1

**Advisory + Change Request proposal: the denylist argument now applies to the lexer itself.**

**What I measured, first.** I re-ran round 16's byte-extraction method over every regex in the file —
`tmp/r17-impl/regexes2.mjs` scans the source character by character, compiles each of the twenty
literals, and prints each character class member by member. **All twenty compile as they read.** In
particular the class round 16 repaired, line 168, reaches the engine as `/[.*+?^${}()|[\]\]/g`: `]`
and `\` are genuinely escaped, and a delimiter carrying `+`, `$` or `{` is quoted correctly. The one
regex that is not a literal — line 169's `new RegExp(` + backtick + `^[ \t]*${quoted}[ \t]*$` +
backtick + `, "m")` — I verified behaviourally rather than by reading, and its `[ \t]` is a real tab
class. There is no third doubled escape. That method is worth keeping.

**The observation.** This module's founding argument is that a denylist over build spellings cannot
converge, "because the space of spellings is not ours to enumerate", and it fails open. Seventeen
rounds later the module is 1361 lines and its scanner is an allowlist over **shell spellings** — and
the space of those is not ours to enumerate either. The score is the argument: the seven spellings
round 16 closed, the three I closed in this report (`B1`, `B2`, `B4`), and each repair adds one more
shell feature (`$( )`, backtick, `<( )`, `<<`, `<<-`, `>|`, `&>`, `<>`, `$'…'` next). Every one was
found by someone who knew one more thing about bash than the last person did. The three I found took
two hours, which says nothing about the repairs and everything about the surface.

The instrument does have the right escape hatch — `UNREADABLE`, "the scanner's own failure is a
refusal" — and `B1`, `B2` and `B4` are all cases where a construct the scanner does not model resolved
to *consent* instead. The distance between the design and the code is the whole finding, and it is
narrowing round by round; I am not proposing the design is wrong.

**Change Request proposal, for `/qfai-sdd` to adjudicate — not for the implementer.** Consider
replacing the hand-written lexer with a real one. `bash -n` is on every runner this scaffold targets,
and `bash --pretty-print` / `set -x` dry-run expansion, or an off-the-shelf POSIX shell parser, would
answer "what does this body invoke" from a parser that already knows `$'…'`, `<<\EOF` and arithmetic
commands. The allowlists (`ALLOWED_INVOCATIONS`, `ALLOWED_FLAGS`, `ALLOWED_NODE_PAYLOADS`,
`HARMLESS_PROGRAMS`) are the reviewed part and would be kept unchanged; only the tokenizer is
replaced. That is a scope decision about a shipped quality bar, so it is upstream's call and not a
condition of this round.

**Severity: Advisory. Traces to: none** — reviewer-originated scope. It changes no already-approved
obligation, so it does not block: `B1`, `B2` and `B4` are separately blocking as defects and are
fixable inside the current design.

## Gates

**Passed, stated concretely — this is what makes the verdict `REVISE` rather than a refusal to review:**

1. **The round-16 noclobber repair holds.** `echo a\>|npx tsup` splits at the pipe and `refusals()`
   returns `["npx tsup"]`; executed under bash, the stub bundler was not invoked. The three raw-text
   decisions round 16 moved onto `codeMask` are correct for the `>` and `&` cases (`echo hi >&2`,
   `echo a &>/dev/null`, `2>&1 npm ci`, `>| out.txt` all measured correct). The `#` case is not — `M3`.
2. **The here-document metacharacter class is genuinely fixed.** Extracted from the file's own bytes
   and compiled: `/[.*+?^${}()|[\]\]/g`. All twenty regex literals in the file compile as they read;
   there is no third doubled escape (`A1`).
3. **The shipped tree is clean under its own gate, at HEAD bytes.** `refusals()` over every `run:` body
   of both shipped workflows returns `[]`, and the invoked program set is exactly the sixteen entries
   pinned at `spec0017LayeredCiScaffoldE2E.test.ts:607-624`. Measured through the helper directly, from
   `git show HEAD:` bytes, not through the working tree.
4. **The channel the new pins were built for is closed.** An `if:` rewritten to a constant `false` on
   the `unit` job is caught by `ALLOWED_JOB_SHAPE`; deleting a pin fails closed. Both measured on the
   replica.

**Not run, and why.** No `vitest` this round. For the window in which a sibling's plant was live in
`packages/qfai/assets/init/root/`, running the suite would have measured through it; and it would have
overwritten a `.qfai/report/validate.log` that was already dirty with someone else's state, which I
could not then have restored honestly. Every finding above is direct execution or a byte-faithful
replica instead. The one consequence a reader should weigh: I have **not** confirmed the suite is
green end to end at `1d7c0c3f`. `qa-gatekeeper` and `completion-reviewer` should be asked for that.

## The plant, resolved

Recorded above as I saw it. It has since been cleanly restored: at `08:55` the three files under
`packages/qfai/assets/init/root/` are gone, `.qfai/report/validate.log` is back to its `HEAD` bytes,
and `git status --porcelain` is empty. Two further things a reader should know:

- Between those readings `.qfai/evidence/atdd-spec-0017.md` was also modified and then reverted. That
  is the stage's record, and the brief says the stage does not edit the subject while this round runs.
  It was restored and `HEAD` never moved, so nothing I measured is affected — but a finding measured
  against a half-applied state is indistinguishable from a false one, and both siblings should confirm
  their own measurements were not taken inside that window.
- Nothing I planted needed restoring. Every mutation I made was to a copy in `tmp/`, reconstructed
  from `git show HEAD:<path>`. I wrote nothing under `packages/qfai/assets/init/root/.github/
  workflows/` and nothing outside `tmp/` and this report.

## Residual implementation risks

1. **`B1`, `B2` and `B4` are three shell features, not three bugs.** Fixing the three spellings I found
   is necessary and is not the same as closing the class — that is `A1`'s point, and it is upstream's
   call, not the implementer's. The implementer's fail-closed lever already exists: prefer
   `UNREADABLE` over a silent skip wherever the scanner does not model a construct. `B2`'s point (2)
   and `B4`'s stopgap are both that lever.
2. **`M2` compounds with `US-0017-0008`.** When `qfai-validate.yml` retires, four `ALLOWED_JOB_SHAPE`
   entries, one `ALLOWED_WORKFLOW_SHAPE` entry and their `ALLOWED_ACTION_COMMITS` neighbours go stale
   with nothing to say so. The two-line reverse assertion is cheapest to add before that lands, not
   after.
3. **`B3` is the fifth channel and the sixth is the same shape.** The shipped tree grows by file, and
   every guard in this repository that enumerates a shipped surface enumerates `assets/init/.qfai/**`.
   Until `assets/init/root/**` has the same treatment, the next reviewer finds this again.
4. **I reviewed sections 1 and 2.** Sections 3 (the three guards) and 4 (the record) are within my
   domain but outside my assignment this round; nothing in this report should be read as clearing
   them. `A1`'s byte-extraction method is the one the brief asks be applied to the other patterns, and
   I applied it only to `shippedLaneCommands.ts` — the guards in `tests/assets/**` have not been read
   that way by me.

## Revision

Start: `1d7c0c3f`. Finish: `1d7c0c3f`. **`HEAD` did not move while I worked.** The working tree was
clean at start, carried another role's plant and two reverted edits in the middle, and is clean again
at finish.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts or evidence — every one names a file and line and carries an
      executed measurement
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding has `Traces to: none`
- [x] Required gates and residual risks are recorded
