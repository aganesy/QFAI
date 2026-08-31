# R01 — implementation-reviewer, round 18 (spec-0017, ATDD stage gates)

**Revision under review:** `0f61ad2f` (recorded at start). **Emphasis:** sections 1 and 3 of the brief —
the two quote walks in `packages/qfai/tests/helpers/shippedLaneCommands.ts` and the byte-digest boundary.

**Verdict: REVISE.**

## Method

Every claim below is measured, not read. Two independent oracles:

- **bash itself.** A fake `npx` / `pnpm` / `tsup` / `make` / `gradle` / `yarn` on `PATH` appends its own
  argv to a marker file. A case "ran a build" iff bash actually executed `tsup`. Cases run in a
  subshell in an isolated cwd under `timeout 5`, so a syntax error scores as "did not run" rather than
  as a pass.
- **the helper itself**, imported unmodified from a copy of the subject under `tmp/`, calling the
  exported `refusals()` / `commandsOf()` / `invocationsOf()` / `fileDigest()`.

A finding is a case where bash ran a real build and `refusals()` returned `[]`.

Corpora: 88 curated + 1200 seeded-random (`seed 20260822`) + 256 template cases (64 quoting
decorations x 4 separators) + 10 targeted probes. 1554 cases executed under bash in total.

**Corpus-authoring note, which is itself a measurement.** The first curated corpus was written through a
shell heredoc and the heredoc silently dropped one backslash before `'` and before `>`, so four cases
measured something other than what they said. Every case reported below is composed from
`String.fromCharCode` / a marker substitution, written to disk, and dumped with `cat -A` before it is
believed. A reviewer measuring a lexer through a shell is measuring two lexers.

## Findings

### B1

**the tenth spelling: `matchingParen` has no backslash, and it is the file's THIRD quote walk**

**Severity:** Blocking. **Traces to:** `defect:correctness` — `US-0017-0004`, the row whose whole content
is "no shipped lane runs a build"; the assertion at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:636`.

**Issue.** `matchingParen` (`packages/qfai/tests/helpers/shippedLaneCommands.ts:453-473`) models quotes
but not the backslash. `commandsOf` models it (line 263-275) and `codeMask` models it (line 432-437);
`matchingParen`, which both of them call to find the end of a `$( … )`, does not. So a `\"` inside a
command substitution opens a quote that swallows the real `)`, `matchingParen` returns `body.length`,
and `commandsOf` hands the whole rest of the body to a recursive call as substitution content while the
outer word keeps its own open `"`.

Measured, exactly these bytes
(`6563686f202224286563686f205c222922203b206e70782074737570`):

```
echo "$(echo \")" ; npx tsup
```

- bash: prints `"`, exit 0, and **the marker records `npx tsup`** — a real build ran.
- `commandsOf` -> `["echo \\\")\" ; npx tsup", "echo \"\u0000substitution\u0000"]`
- `invocationsOf` -> `["echo \") ; npx tsup", "echo \u0000substitution\u0000"]`
- `refusals` -> `[]`

`echo` is on `HARMLESS_PROGRAMS`, so the second command's `SUBSTITUTION` placeholder does not trip the
`<unreadable substitution>` rule either. The build is invisible in both readers.

**Twenty-four of the 256 template cases are this defect**, and they cover every separator the splitter
has — `;`, `&&`, newline and `|` all fail-open — across six decorations:

```
echo "$(echo \")"            <sep> npx tsup      refusals []   build RAN
echo "$(echo \')"            <sep> npx tsup      refusals []   build RAN
echo "$(printf '%s' \")"     <sep> npx tsup      refusals []   build RAN
echo "$(echo \\\")"          <sep> npx tsup      refusals []   build RAN
echo "$(echo "$(echo \")")"  <sep> npx tsup      refusals []   build RAN
echo a; echo "$(echo \")"    <sep> npx tsup      refusals []   build RAN
```

The one-line control `echo "$(echo x)" ; npx tsup` is correctly refused, so the escape is the whole
difference. The **unquoted** twin `echo $(echo \") ; npx tsup` is refused — the surrounding `"` is what
converts the over-run into a swallow, and `"$( … )"` is the spelling every shell guide recommends.

**Why.** This is not a new class. The module docstring argues that "Two copies of the lexer is the
two-copies-of-an-allowlist defect one size smaller", and round 17 acted on it by teaching `codeMask` the
substitution model `commandsOf` already had. There are **three** walks with a quote model in this file,
not two: `commandsOf`, `codeMask` and `matchingParen` — and a fourth, `redirectionsOf`, and a fifth,
`tokensOf`. `matchingParen` is the one the other two both depend on for a decision they cannot recover
from, and it is the only one that never got the backslash.

**Suggestion.** `matchingParen` cannot be repaired by adding a backslash case alone: it also has no
`$'…'` model and no comment model, so the next round finds the same shape again. The smaller change is to
stop having a third walk — make `codeMask` return the substitution spans it already computes (it calls
`matchingParen` and then recurses into the span anyway), and have `commandsOf` read the span out of that
one result instead of re-deriving it. One walk decides where a `$( … )` ends, which is the same argument
`resolvedCommands` and `withoutRedirections` already won in this file.

### B2

**the two walks still disagree: `codeMask`'s comment rule is missing the guard `commandsOf`'s has**

**Severity:** Blocking. **Traces to:** `defect:correctness` — same row and same assertion as B1.

**Issue.** Round 16's comment repair is applied to one walk only. Compare the two rules, both in
`packages/qfai/tests/helpers/shippedLaneCommands.ts`:

```
line 259  commandsOf   if (ch === "#" && (i === 0 || (mask[i - 1] === true && /[\s;&|(]/.test(body[i - 1] ?? " "))))
line 443  codeMask     if (ch === "#" && (i === 0 ||                          /[\s;&|(]/.test(body[i - 1] ?? " ")))
```

The comment three lines above the first one states the rule and the reason for it: "What the rule needs
is the raw previous character AND the mask's verdict on it: a separator that is code starts a comment, an
escaped space does not." `codeMask` has the raw character and not the verdict. So after `\` + space,
`codeMask` starts a comment and `commandsOf` does not — and `codeMask`'s docstring at line 347 says it is
"Computed by the same state machine `commandsOf` runs".

**The consequence is fail-open, measured.** The mask marks the rest of that line non-code; `lastCode()`
(line 92-99) skips every non-code position, so at a later `&` it walks back past the whole masked region
and lands on the redirection operator. `redirectAmp` (line 318) then reads the `&` as part of a
redirection, the `&` stops splitting, and the backgrounded command after it is absorbed into the previous
command's text.

Five spellings, each executed:

```
echo x <\ #y & npx tsup                    bash: build RAN   refusals []
echo x <\ #y & npx tsup && echo done       bash: build RAN   refusals []
echo hi <\ #z & npx tsup                   bash: build RAN   refusals []
echo x <\<TAB>#y & npx tsup                bash: build RAN   refusals []
read v <\ #y & npx tsup                    bash: build RAN   refusals []
```

For the first, `commandsOf` returns the single command `["echo x <\ #y & npx tsup"]` and
`invocationsOf` returns `["echo x"]` — `echo` is on `HARMLESS_PROGRAMS`, and because it is,
the `<reads stdin>` rule at line 1487 is skipped as well. Every control in the same probe set splits
correctly: `echo a\ #b & npx tsup`, `… | npx tsup`, `… && npx tsup`, `… ; npx tsup` are all refused.
The `>` twin `echo x >\ #y & npx tsup` is caught, but only by the write scan and not by the invocation
scan, so the same collapse is present there too and is covered by a different rule.

**Suggestion.** Delete `codeMask`'s own comment rule and make the two share one. The mask is what decides
the question, so the predicate belongs beside the mask: have `codeMask` record, per index, whether the
character is a code separator, and let `commandsOf` consult that instead of re-testing `body[i-1]`.
Copying the `mask[i-1]` clause into line 443 is not possible as written — `codeMask` is building the very
array it would consult — and that asymmetry is the reason the two rules drifted. Making the mask carry
the answer removes the second rule rather than synchronising it.

### B3

**the here-document repair, fourth defect: an UNQUOTED delimiter expands its data, and the data is executed**

**Severity:** Blocking. **Traces to:** `defect:correctness` — same row and same assertion as B1.

**Issue.** `commandsOf` treats every here-document body as inert data
(`packages/qfai/tests/helpers/shippedLaneCommands.ts:129-200`), on the reasoning its own comment gives:
"A here-document's BODY is data, not commands. `cat <<'EOF' … npx tsup … EOF` prints a script". That
reasoning holds for the case it names — `<<'EOF'`, a **quoted** delimiter — and for no other. bash
performs parameter expansion, command substitution and arithmetic expansion on here-document data
whenever the delimiter is unquoted, so `$( … )` and a backtick in the data are **executed**.

The delimiter parser already knows which case it is in — it carries `delimiterQuote` through the scan at
lines 154-175 — and discards that fact instead of recording it.

Seven spellings, each executed under bash with the marker recording a real `tsup`:

```
read v <<EOF                                   build RAN   refusals []   commandsOf -> ["read v <<EOF"]
$(npx tsup)
EOF

read v <<EOF                                   build RAN   refusals []
`npx tsup`
EOF

read v <<EOF                                   build RAN   refusals []
value=$(npx tsup)
EOF

grep -q x <<EOF   /   tr a b <<EOF   /   cut -c1 <<EOF    build RAN   refusals []   (same shape)

while read l; do echo $l; done <<EOF           build RAN   refusals []
$(npx tsup)
EOF
```

The control settles the cause: the identical body with `<<'EOF'` — the exact spelling the repair's comment
cites — **does not run the build** and is correctly inert. One pair of quotes on the delimiter is the whole
difference, and the scanner reads both the same way.

Every program above is on `HARMLESS_PROGRAMS` or is the shipped tree's own idiom. `read v <<EOF` /
`while read … done <<EOF` is how a lane loads a value it then writes to `$GITHUB_OUTPUT`, and
`value=$(…)` inside the data is the form that idiom takes. `cat <<EOF` is refused today only because `cat`
is not allowlisted — a program name, not this rule, is what is holding the line.

**Suggestion.** Record the delimiter's quoting, which the loop already computes: set a flag when
`delimiterQuote` is ever entered or a `\` is consumed at lines 161-172, and when the delimiter was
**unquoted**, scan the data region for substitutions rather than skipping it — `commandsOf` already has
exactly the recursion needed (`$( … )`, backtick, `<( … )`), so the data can be handed to the same
substitution branches with the surrounding literal text dropped. Skipping the data wholesale remains
correct for a quoted delimiter and only for a quoted one.

### B4

**the here-document delimiter is not terminated by `<`, `>` or `(`, so bash and the scanner name different delimiters**

**Severity:** Blocking. **Traces to:** `defect:correctness` — same row and same assertion as B1.

**Issue.** The delimiter scan breaks on `/[\s;&|)]/`
(`packages/qfai/tests/helpers/shippedLaneCommands.ts:173`). bash's word terminators also include `<`, `>`
and `(`. So for `cat <<EOF>out` bash's delimiter is `EOF` with a redirection after it, and the scanner's
is the single token `EOF>out`.

The scanner's delimiter is always a **superset** of bash's, so its closer is found later than bash's or
not at all — and both branches are wrong in the same direction:

- **Found later: the data region over-runs and real commands vanish.** Measured, executed:

  ```
  echo a <<EOF>out        build RAN   refusals []   commandsOf -> ["echo a <<EOF>out"]
  x
  EOF
  npx tsup
  EOF>out
  ```

  and the same with `read v <<EOF>out`. bash closes the here-document at `EOF`, runs `npx tsup`, and
  fails on the last line; the scanner closes it at `EOF>out` and skips `npx tsup` with the region. Note
  also that `redirectionsOf` swallowed the `>out` into the here-document's target word, so the write scan
  did not see the redirection either.

- **Not found: the rest of the body is discarded.** `cat <<EOF>>"$GITHUB_OUTPUT"` — GitHub's own
  documented multiline-output idiom, written without the space this file's own comment writes it with —
  yields the delimiter `EOF>>$GITHUB_OUTPUT`, no closer, and the `at === null` branch sets `heredocEnd`
  to the end of the body. The refusal it emits is what keeps this fail-closed, and it is a false one:
  the same idiom with a space is accepted. One removed space, opposite verdicts — which is the
  "one command written two ways" invariant `redirectionsOf`'s own docstring says has now defeated this
  file six times.

**Suggestion.** Change the class to `/[\s;&|()<>]/`. That is bash's own word-terminator set for this
position, it makes the two branches above agree with bash rather than closing them one at a time, and it
is the character class this file already writes correctly in `redirectionsOf`.

### B5

**`lastCode` skips quoted text, so a quoted redirection target disarms both the `|` and the `&` split**

**Severity:** Blocking. **Traces to:** `defect:correctness` — same row and same assertion as B1. This is the
most reachable of the five: the shipping spelling it defeats is `> "$GITHUB_OUTPUT"`.

**Issue.** Two rules in `commandsOf` decide whether a separator splits by asking what the previous code
character was:

```
line 293  const clobber = ch === "|" && lastCode(i) === ">";
line 318  const redirectAmp = ch === "&" && ((body[i + 1] === ">" && mask[i + 1] === true) || /[<>]/.test(lastCode(i)));
```

Both exist for operators whose two characters are **adjacent** — bash's `>|` noclobber override and
`>&2` / `&>`. `lastCode` (lines 92-99) skips spaces, tabs **and every non-code position**, so a quoted
redirection target — correctly masked by `codeMask` — is walked straight over and the redirection
operator is returned as if it were adjacent.

Measured directly on the mask (`codeMask` exported from a copy, the subject untouched):

```
"echo x > \"/dev/null\" | npx tsup"
   mask: echo x > ........... | npx tsup
   lastCode(at the |) = ">"   => clobber: true    (the pipe does not split)
"echo x > /dev/null | npx tsup"
   mask: echo x > /dev/null | npx tsup
   lastCode(at the |) = "l"   => clobber: false   (the pipe splits, and the build is refused)
```

Ten spellings, each executed under bash, each running a real build with `refusals()` empty:

```
echo x >  "/dev/null"      | npx tsup      build RAN   refusals []
echo x >  '/dev/null'      | npx tsup      build RAN   refusals []
echo x >  "$GITHUB_OUTPUT" | npx tsup      build RAN   refusals []
echo x >  "/dev/null"      & npx tsup      build RAN   refusals []
echo x >  '/dev/null'      & npx tsup      build RAN   refusals []
echo x >> "/dev/null"      & npx tsup      build RAN   refusals []
echo x 2> '/dev/null'      & npx tsup      build RAN   refusals []
echo x <  '/dev/null'      & npx tsup      build RAN   refusals []
read v <  '/dev/null'      & npx tsup      build RAN   refusals []
printf 'x' > "/dev/null"   & npx tsup      build RAN   refusals []
```

and the unquoted controls `echo x > /dev/null | npx tsup` and `echo x > /dev/null & npx tsup` are both
correctly refused. **Quoting the redirection target is the entire difference**, and `> "$GITHUB_OUTPUT"`
is GitHub's documented spelling — `qfai-tests.yml` writes `>> "$GITHUB_OUTPUT"` itself. A lane that
already writes that line is one `|` or one `&` away from this.

`echo x >'/dev/null'| npx tsup` (no spaces) is refused, but only by the write scan and only because
`redirectionsOf` absorbed the `|` into the target and reported a write to `/dev/null|`. That is a second
symptom of the same confusion, not a defence.

**Issue -> Why.** The file has already found this exact instrument wrong once and written it down, at
lines 251-258: "**`lastCode` was the wrong instrument**: it skips spaces". The comment rule was moved off
it in round 16. The two rules that still use it were not, and they ask a strictly narrower question —
adjacency — than `lastCode` can answer.

**Suggestion.** Neither rule wants "the last code character"; both want "the immediately preceding
character, unquoted". Replace `lastCode(i)` in both with a check on `body[i - 1]` together with
`mask[i - 1] === true` — the same pair the comment rule was repaired to use — so `>|` and `>&` are
recognised only when they are one operator, which is the only thing bash calls them. That also deletes
`lastCode`, whose last two callers are these two rules.

**B5, addendum — a quoted here-document DELIMITER is the same spelling.**

`read v <<'E' & npx tsup` (data `x`, closer `E`) — **build RAN, `refusals []`**, `commandsOf` returns the
single command `["read v <<'E' & npx tsup"]`. The unquoted twin `read v <<E & npx tsup` splits correctly
and is refused. The quoted delimiter is masked, `lastCode` at the `&` returns the `<`, and `redirectAmp`
fires. `<<'EOF'` is the spelling the here-document repair's own comment recommends.

### M1

**`fileDigest` is not a byte digest, and its stated reason contradicts the repository it cites**

**Severity:** Major. **Traces to:** `defect:quality` — the boundary claim in
`packages/qfai/tests/helpers/shippedLaneCommands.ts:914-937` and the assertion at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:821-824`.

**Issue.** The docstring says "The bytes are the identity" and the function is described as "The bytes of a
shipped file, line endings normalized and nothing else." Both are false in two ways, and I could measure
both.

1. **It is a digest over decoded TEXT, not bytes.** The caller reads with
   `readFile(path, "utf-8")` (line 100 of the e2e file), so every invalid UTF-8 sequence becomes
   `U+FFFD` before `fileDigest` sees it. Measured — two files differing in one byte:

   ```
   digest of <workflow>+0xFE : 8c0dddd2d0ee6661ba2310eda31500e0f8ea32bddcf0f2ed2f303751c271c8ec
   digest of <workflow>+0xFF : 8c0dddd2d0ee6661ba2310eda31500e0f8ea32bddcf0f2ed2f303751c271c8ec
   ```

   A collision, on a function whose whole purpose is that two files that differ cannot share an identity.
   The parsed shapes collide too, for the same reason, so nothing else in the gate separates them either.

2. **`\r\n` -> `\n` erases a difference the sibling function refuses to erase.** Twelve lines below,
   `bodyDigest` documents folding CRLF as one of three measured collisions and concludes "Measuring the
   reachable case and concluding about all cases is the class this record catalogues." `fileDigest`'s own
   justification is "`.gitattributes` stores these files LF and a checkout is free to hand back CRLF" —
   which is the same shape of argument, and it is also **self-defeating**:

   ```
   $ git check-attr text eol -- packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml
   ... text: auto
   ... eol: lf
   ```

   `* text=auto eol=lf` means a checkout is *not* free to hand back CRLF; git writes LF into the working
   tree on every platform. The normalization is defending against the one case the cited file excludes,
   and paying for it by collapsing a class the same file elsewhere calls behaviour-bearing.

**What I could NOT reproduce, stated so the next round does not re-derive it.** I built LF/CRLF twins of a
four-scalar-style workflow (double-quoted flow with a `\` continuation, folded flow, block literal,
single-quoted flow) and the `yaml` parser in this workspace normalized CRLF in **all four** — identical
`bodyDigest`, identical `refusals()`. So round 15's recorded "a quoted FLOW scalar delivers a live CR" does
not reproduce here, and I am not claiming an exploitable CRLF hole today. What I am claiming is that the
one thing keeping this closed is a parser's incidental behaviour, which is exactly the ground round 14's
"unreachable" verdict stood on before round 15 overturned it.

**Suggestion.** Two lines. Read the file as a `Buffer` and hash the buffer, and drop the
`.replace(/\r\n/g, "\n")`. `fileDigest` then means what it says, matches `bodyDigest`'s settled rule ("the
bytes are the identity"), needs no argument about which parser folds what, and costs nothing — the shipped
files are LF by `.gitattributes` and both digests already match on real `qfai init` output.

### m1

**a process substitution is entered inside double quotes, where bash has none**

**Severity:** Minor. **Traces to:** `defect:quality`.

Both walks guard the `<( … )` / `>( … )` branch with `quote !== "'"`
(`packages/qfai/tests/helpers/shippedLaneCommands.ts:201` and `:379`), so both enter one inside a
**double**-quoted string. bash performs no process substitution inside double quotes. Measured:

```
echo "see <(x) here" && echo ok
  commandsOf -> ["x", "echo \"see <SUBSTITUTION> here\"", "echo ok"]
  refusals   -> ["x"]
```

A refusal naming a program nothing invokes. The `$( … )` and backtick branches are correct to use
`quote !== "'"` — those two ARE active inside double quotes — so the guard was copied one branch too far.
The cost is a spurious refusal, which this file budgets for; the reason to fix it is that the budget is
paid for by refusals a reader can act on, and this one names a program that does not exist. Guard the
process-substitution branch with `quote === ""` in both walks.

### m2

**the byte-digest failure is reported under a message that says no digest can see it**

**Severity:** Minor. **Traces to:** `defect:quality`.

`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:823` pushes the byte-digest failure into
`contexts`, and `contexts` is asserted at line 864 with the message "a workflow or a job saying something
this tree does not ship. None of it appears in a `run:` body, so **no digest** and no body scan can see any
of it". A reader whose byte digest moved is handed a message asserting that no digest is involved. The two
claims were merged into one array when the byte pin was added and the message was not revisited. Assert
the digest mismatches in their own `expect.soft` with their own sentence.

### m3

**the unterminated-here-document refusal is a synthetic string re-parsed as a shell command**

**Severity:** Minor. **Traces to:** `defect:quality`.

Line 193 pushes `` `unterminated-here-document ${delimiter}` `` into the command stream, which
`resolvedCommands` then runs through `invocationOf` and `refusals` runs through `redirectionsOf`. Measured
on `cat <<EOF>>"$GITHUB_OUTPUT"`, the delimiter is `EOF>>$GITHUB_OUTPUT` and the emitted refusal reads
`unterminated-here-document EOF` — `withoutRedirections` ate the rest of the sentinel. A delimiter
containing `>` and a disallowed name would additionally raise a phantom `<writes>` refusal against a file
nobody wrote to. A sentinel that has to survive the parser it is a report about is fragile by
construction; return it out-of-band, or spell it with characters the tokenizer cannot act on the way
`SUBSTITUTION` and `STDIN_FROM_PIPE` are.

### m4

**dead ternary in `codeMask`'s substitution branch**

**Severity:** Minor (nit). **Traces to:** `defect:quality`.

`packages/qfai/tests/helpers/shippedLaneCommands.ts:380`:

```ts
const opensAt = ch === "$" ? i + 1 : i + 1;
```

Both arms are the same expression. It reads as if `$( … )` and `<( … )` open at different offsets and
invites the next reader to "fix" one arm. Write `const opensAt = i + 1;`.

### A1

**advisory: `refusals()` has been the gate's only fail-open surface in every round it has existed**

**Severity:** Advisory — **not blocking**, and it proposes a scope change, so it is filed as a Change
Request proposal per `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations`
rather than as a required fix. **Traces to:** none required (advisory).

**Observation, not a defect.** The e2e row's own comment at
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:682-687` already states the conclusion:
"reading bash converges only at a complete bash parser while every gap on the way fails open. So the gate
is IDENTITY: the twelve bodies this tree ships were reviewed, and their digests are written down."

That reasoning is now load-bearing and measured. This round I ran over 1600 cases through bash. **Every
one of the fifty fail-opens came from `refusals()`, and none came from the digest pins** —
`ALLOWED_STEP_SHAPE`, `ALLOWED_WORKFLOW_FILES`, `ALLOWED_WORKFLOW_SHAPE` and `ALLOWED_JOB_SHAPE` all
computed clean against real `qfai init` output and cannot fail open by construction: a body that is not
one of the sixteen reviewed digests is refused whatever it is written in.

So the two halves of this gate have opposite risk profiles, and the parsing half has been broken in three
consecutive rounds by five distinct root causes after being rewritten in each of them. It costs a
maintenance burden with no measured benefit over the digest pin for the *shipped-tree* assertion.

**CR proposal (for the CR owner to accept or reject, not for this stage to act on).** Split the two
claims: keep `refusals()` and its corpus as a **unit-level** instrument in
`tests/unit/shippedLaneCommands.test.ts`, where its value is that its corpus is falsifiable; and let the
E2E row's claim about the shipped tree rest on `ALLOWED_STEP_SHAPE` alone, which already covers every
shipped body exactly. That removes a fail-open surface from the boundary without weakening any assertion,
because the digest is strictly stronger than the scan for the sixteen bodies that actually ship. If the
CR is rejected, B1-B5 still stand on their own.

## What passed

Stated so the verdict is not "everything is broken". Measured against a real `qfai init` into an OS temp
directory (258 files), not against the source assets:

- `ALLOWED_WORKFLOW_FILES` — both byte digests **match**
  (`581608a7…f9ee`, `08e79f77…c7f6`), on init output and independently on `git show HEAD:<path>`.
- `ALLOWED_WORKFLOW_SHAPE`, `ALLOWED_JOB_SHAPE` — no `contexts` entries; both directions of the orphan
  check are present and clean.
- `ALLOWED_STEP_SHAPE` — the derived list is **16 steps and matches the pin element for element**,
  including order, `if:`, `id:` and body digest.
- `refusals()` over every shipped `run:` body — **`[]`**.
- The pinned program set — matches the sixteen listed exactly.
- `INIT_MUST_NOT_SHIP` over all 258 init files — **no hits**. `ALLOWED_INIT_PATHS` — six outside-tree
  paths, no unreviewed file, no reviewed path missing. Both directions clean.
- A BOM prepended to a workflow **does** move `fileDigest`, so that route is closed (see M1 for the two
  that are not).

## Residual risks

- **B1-B5 are five root causes, not five spellings.** Fifty executed cases fell open; the tenth spelling
  the brief asked for is B1, and B2/B3/B4/B5 are four more independent ones behind it. B5 is the one to
  fix first: it needs no adversary, only `> "$GITHUB_OUTPUT"` followed by a `|` or an `&`.
- The `yaml` parser's CRLF normalization is currently the only thing closing M1's second half. A parser
  bump can reopen it silently, and nothing in the suite would notice.
- I did not review sections 2, 4 or 5 beyond what section 1 and 3 required; the init-path and
  `INIT_MUST_NOT_SHIP` measurements above are incidental, not a review of section 2.

## Subject stability

`git rev-parse --short HEAD` was `0f61ad2f` at the start of this review and `0f61ad2f` at the end;
`git status --porcelain` was empty at both points. **The subject did not move while I measured.** No plant
was made in the subject tree: the helper was copied to `tmp/r18-impl/helper.ts` and, for the mask
measurement in B5, to `tmp/r18-impl/helperx.ts` with `codeMask` exported. Nothing was written under
`packages/qfai/assets/init/root/`.


## Verdict

**REVISE.** Five blocking findings (`B1`–`B5`), one major (`M1`), four minor (`m1`–`m4`), one advisory
(`A1`). Every blocking finding is a case where bash executed a real build and `refusals()` returned `[]`,
demonstrated by execution against an independent oracle, with a passing control in every case that isolates
the cause to one character.

Gates that passed are listed under **What passed** — the byte digests, all three shape pins, the 16-step
ordered pin, the init-path pins and `INIT_MUST_NOT_SHIP` all compute clean against real `qfai init` output.
The identity half of this boundary is sound; the parsing half is not.

Subject `0f61ad2f` at start and at finish, unmoved.
