# R01 — implementation-reviewer — round 15, spec-0017 (ATDD stage gates)

**Revision under review:** `21e2cdc6` at start. Re-checked at finish (recorded at the end of this file).
**Emphasis:** sections 1, 2, 3 and 4 of `review_request.md`.
**Method:** every finding below is demonstrated by running the subject, not by reading it. The helper
`packages/qfai/tests/helpers/shippedLaneCommands.ts` was transpiled unmodified into `tmp/r15-impl/slc.mjs`
with esbuild (types stripped only) and driven directly; the `yaml` parser used is the same `yaml@2.8.2` the
gate imports; bash bodies were executed with the same `bash -e -o pipefail` the suite's `runStep` uses.
**Nothing under review was modified.** No plant was made in
`packages/qfai/assets/init/root/.github/workflows/` — that directory belongs to `qa-gatekeeper` this round,
so the two workflow-shaped demonstrations below were done by parsing the shipped files and mutating the
**parsed document in memory**, never the files. `git status --porcelain` was clean at start and at finish.

## Verdict

**REVISE.**

## The gate that passed

`pnpm vitest run tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — **10 passed / 10**, exit 0, at
`21e2cdc6`. That includes the whole of `US-0017-0004`'s second row: `refusals()` over every shipped body,
the sixteen-program pin, the unreviewed-body check, the digest multiset, and the three key enumerations.
So the repairs are green against the tree they ship; every finding below is a hole **inside** that green.

---

### B1 — `redirectionsOf` reports `writes: false` for every `<>` spelling, and `<>` writes; a shipped body can create the manifest an allowed install then executes, with `refusals()` returning `[]`

**Severity:** Blocking.
**Traces to:** `defect:security` (execution channel in a shipped surface), `defect:correctness`.
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:889-948` (`redirectionsOf`),
`:906-916` (operator consumption), `:977-995` (`refusals`'s write scan).

**Issue.** `redirectionsOf` decides `writes` from the FIRST character of the operator only:

```ts
if (ch !== ">" && ch !== "<") continue;
const writes = ch === ">";
// Consume the operator: `>`, `>>`, `<`, `<<`, `<<<`, and the `&` of `>&` / `&>`.
let j = i;
while (j < command.length && (command[j] === ch || command[j] === "&")) { ... }
```

The consumption loop accepts only `ch` again or `&`, so for `<>` it stops after the `<` and the `>` is read
as the first character of the TARGET. bash's `<>` opens the named file for **reading and writing** and
creates it if absent, and `n<>file` puts that read-write descriptor on fd `n` — so `1<>file` is a write.
`redirectionsOf` reports it as a read, `refusals`'s write scan skips it (`if (!redirection.writes)
continue;`), and the stdin rule below it (`:1022-1028`) only fires for a program that is **not** on
`HARMLESS_PROGRAMS` — `printf`, `echo`, `grep`, `tr`, `cut` are all on it.

**Demonstrated.** `refusals()` over the two-line body, and then the same body under bash:

```
printf '{"name":"a","version":"1.0.0","scripts":{"preinstall":"touch OWNED-BY-PREINSTALL"}}' 1<>package.json
npm install --no-audit --no-fund
```

```
refusals = []
```

```
$ bash -e -o pipefail step.sh
exit=0
> a@1.0.0 preinstall
> touch OWNED-BY-PREINSTALL
$ ls
OWNED-BY-PREINSTALL   package-lock.json   package.json   step.sh
```

Both lines are individually blessed: `printf` is a `HARMLESS_PROGRAMS` member and `npm install
--no-audit --no-fund` is an `ALLOWED_INVOCATIONS` entry with both flags on `ALLOWED_FLAGS`. The write in
between — the whole point of `ALLOWED_REDIRECT_TARGETS` — is invisible. This is arbitrary code execution
in an adopter's lane with the scanner reporting clean.

**It is a class, not a spelling.** Every one of these returns `[]`, while the plain `>` twin of the first
is correctly refused:

| body | `refusals()` |
| --- | --- |
| `printf '{…}' >package.json` | `<writes> package.json :: …` |
| `printf '{…}' 1<>package.json` | `[]` |
| `printf 'x' 1<> package.json` | `[]` |
| `printf x 2<>package.json` | `[]` |
| `printf x 1<>>package.json` | `[]` |
| `printf x <>package.json 1>&0` | `[]` |
| `echo '{"scripts":{"preinstall":"id"}}' 1<>package.json` | `[]` |
| `grep -q . 1<>package.json` | `[]` |
| `printf x \| tr a b 1<>package.json` | `[]` |

**Why it matters beyond the one payload.** This is the request's own sixth-time pattern, seventh instance:
one command written two ways with opposite verdicts, `x>f` versus `x<>f`. The docstring at `:875-888` says
the repair "stops reading token shapes" and walks characters — it does, and the character walk is still
reading only the first character of a two-character operator.

**Suggestion.** Decide `writes` after consuming the operator, not before, and consume `<>` as one operator:

```ts
if (ch !== ">" && ch !== "<") continue;
let j = i;
let duplicates = false;
let writes = false;
while (j < command.length && /[<>&]/.test(command[j] ?? "")) {
  if (command[j] === ">") writes = true;          // `>`, `>>`, `<>`, `&>`, `n<>` all write
  if (command[j] === "&") duplicates = true;
  j += 1;
}
```

That is smaller than the current loop, removes the `ch`-vs-`&` special case, and makes `<>` a write by the
same rule that makes `>` one. Add `1<>package.json` and `2<>f` to
`tests/unit/shippedLaneCommands.test.ts` beside the existing `x>f` / `x >f` pair, so the seventh spelling
has an assertion rather than a round.

**The suggestion was measured, not guessed.** Applied to a **copy** of the helper in `tmp/` (the subject was
not touched) and re-run over the shipped tree and a regression corpus:

```
--- shipped tree under the FIXED helper ---
  (nothing — still clean, all 12 bodies)
--- catch / regression ---
  printf '{"scripts":{"preinstall":"id"}}' 1<>package.json  orig=[]  fixed=["<writes> package.json :: …"]
  printf x 2<>package.json                                  orig=[]  fixed=["<writes> package.json :: …"]
  printf x <>package.json 1>&0                              orig=[]  fixed=["<writes> package.json :: …"]
  printf x >&2 / 2>&1 / >&-                                 orig=[]  fixed=[]      (still suppressed)
  printf x >>"$GITHUB_OUTPUT" / >/dev/null                  orig=[]  fixed=[]      (still allowed)
  printf x >package.json / &>package.json                   both refused            (no regression)
  printf x <payload / grep -q x <<<'hello'                  orig=[]  fixed=[]      (still reads)
```

---

### B2 — the third `bodyDigest` collision: the `\r\n` rule is **reachable** from the gate, and it re-opens exactly the line-continuation collision the second one closed

**Severity:** Blocking.
**Traces to:** `defect:correctness` (a documented invariant of the boundary gate is false),
`defect:security` (the boundary conflates a body the scanner refuses with one it accepts).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:755-773` (`bodyDigest` and the
"unreachable" paragraph), `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:595` (the only caller).

**Issue, part 1 — the reachability claim is false.** The docstring says:

> The `\r\n` rule is **unreachable from the only caller** … the `yaml` parser normalizes line breaks
> inside a block scalar, so a CRLF document yields a CR-free string and the gate never hands this
> function a CR.

Round 14 measured **block scalars**, and the conclusion was generalised past the measurement. A `run:`
written as a **quoted flow scalar** — which GitHub Actions accepts and which the gate parses with the same
`yaml@2.8.2` — delivers a literal CR to `bodyDigest`. Measured against the real parser:

```
1 block scalar, CRLF document  => "echo a\necho b\n"    hasCR: false   <- what round 14 measured
3 double-quoted, literal CR    => "echo a\rX"           hasCR: true
4 single-quoted, literal CR    => "echo a\rX"           hasCR: true
run: "…--fail-on error\r\necho done"  => "…--fail-on error\r\necho done"   hasCR: true
```

A CR is not a YAML line break inside a quoted scalar, so nothing normalizes it. The branch is production
code on a live path, not a kept-for-a-future-caller branch, and the paragraph that argues for keeping it is
arguing from a false premise.

**Issue, part 2 — the collision.** Because the branch is live, `\r\n` and `\n` are the same body to the
boundary. The class that produces is precisely the one the function's own inline comment says it exists to
prevent:

> a trailing space after a line continuation is the difference between a continued line and two commands —
> both sides of that pair pass `refusals()`, so the scanner could not have caught what the digest let
> through.

bash treats `\` + CR as an escaped CR, so the line is **not** continued. `\` + LF is a continuation. Same
digest, different command count — and this time the scanner does **not** agree with itself either:

```
L bytes: "echo a \\nnpx tsup\n"
C bytes: "echo a \\r\nnpx tsup\n"
same bytes?     false
digest L : 1bf602922b77306d8c5b43bdb7dfd75cbf0262e00868fcb0b51c39c0078944b2
digest C : 1bf602922b77306d8c5b43bdb7dfd75cbf0262e00868fcb0b51c39c0078944b2
DIGESTS EQUAL:  true
commandsOf(L): ["echo a  npx tsup"]      <- ONE command, an echo
commandsOf(C): ["echo a \\", "npx tsup"] <- TWO commands, the second is a real build
refusals(L):   []
refusals(C):   ["npx tsup"]
```

Two bodies, one digest, and the boundary cannot tell the one `refusals()` clears from the one it refuses.
That is the third collision, found the same way as the first two.

**Scope, stated honestly.** None of the twelve bodies shipped today carries a `\` continuation, so this is
not exploitable against `21e2cdc6` as it stands — I could not construct a CR variant of a **current**
approved digest that does more than turn a job red (a CR after `then` or `fi` is a bash syntax error; a CR
after `>> "$GITHUB_OUTPUT"` silently redirects the step output to a different filename). What makes it
blocking rather than advisory is that (a) the code states a measured falsehood a reviewer will rely on,
and (b) `qfai-tests.yml` says in five places that "the test-lane body ships in a later revision of this
file" — the continuation-bearing body is planned, not hypothetical, and this gate is what is supposed to
be guarding it when it arrives. I also could not execute the bash half locally: Git Bash on Windows
(`5.2.37(1)-release (x86_64-pc-msys)`) strips CR at read time even with `igncr` off, so the bash-side
divergence is asserted from `bash(1)` semantics on `ubuntu-latest` while the **gate-side** divergence above
is executed.

**Suggestion.** Pick one and say why in the docstring:

- **Delete the normalization.** `createHash("sha256").update(body)` — a CR is then a byte like any other,
  which is what "only line endings are normalized" was reaching for and what the line-continuation comment
  actually requires. The block-scalar measurement round 14 made says this costs nothing: a CRLF *document*
  already yields a CR-free string, so no legitimate checkout moves a digest.
- Or keep it and **reject CR outright** at the gate — `expect(run).not.toMatch(/\r/)` beside the digest
  assertion — so the normalization can never be asked to conflate two bodies.

Either way, correct the paragraph at `:755-763`: the branch is reachable, and
`tests/unit/shippedLaneCommands.test.ts` should carry the quoted-scalar measurement above rather than an
assertion that the branch is dead.

---

### B3 — the digest multiset is blind to LOCATION, so a reviewed body can be moved to any job in any shipped workflow: what a lane executes changes with no key added at any of the three levels

**Severity:** Blocking.
**Traces to:** `defect:security` (execution channel in a shipped surface), `defect:correctness`.
**Artifacts:** `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:587-610` (the `bodies` array and both digest
assertions), `packages/qfai/tests/helpers/shippedLaneCommands.ts:790-815` (`ALLOWED_STEP_BODIES` and its
per-entry `// <file>#<job> [<step name>]` comments).

**Issue.** This is the request's own section-2 question — "find a way to change what a shipped lane
executes without adding a key to any of the three levels" — and the answer does not need a key, a body, an
action or a pasted digest. It needs the two digest assertions to be exactly what they are:

```ts
bodies.push({ digest: bodyDigest(run), at: `${id} [${name}]` });
…
expect.soft(bodies.filter((b) => !ALLOWED_STEP_BODIES.has(b.digest)).map((b) => b.at)).toEqual([]);
expect.soft(bodies.map((body) => body.digest).sort()).toEqual([...ALLOWED_STEP_BODIES].sort());
```

`at` is computed on every element and then **discarded from both comparisons** — the first maps it away
after filtering, the second never reads it. `ALLOWED_STEP_BODIES` records the reviewed location for each of
the twelve entries, in a comment. Nothing asserts the comment. Round 14 upgraded set → multiset, which
pinned the COUNT; the LOCATION was never pinned by either version.

**Demonstrated.** Both shipped workflows parsed, two reviewed bodies swapped **in the parsed document**
(the files on disk were not touched — that directory is `qa-gatekeeper`'s this round), then the full audit
re-run: unreviewed-body check, multiset check, `refusals()` over every body, and all three key
enumerations.

```
=== shipped tree, unmodified ===
  unreviewed bodies : []      multiset matches : true
  refusals()        : []      unenumerated keys: []

=== install body relocated into qfai-tests.yml#detection (bodies swapped, no key added) ===
  unreviewed bodies : []      multiset matches : true
  refusals()        : []      unenumerated keys: []

  detection job now runs: ["Checkout with full history …","Select lanes from the name-only diff",
                           "Probe layer-named test scripts"]
  its 2nd step body head: ["if [ -f pnpm-lock.yaml ]; then","  pnpm install --frozen-lockfile",
                           "elif [ -f yarn.lock ]; then"]
```

Every gate stays green while `qfai-tests.yml#detection` — a job with **no `if:`**, which therefore runs on
every push to `main`/`master` and every pull request — now executes the lockfile-aware install. That runs
the adopter's own install lifecycle scripts, unconditionally, in a job whose step is still labelled "Probe
layer-named test scripts" (a step's `name:` is an enumerated key whose value nothing reads, so the label
and the body are decoupled and neither is checked against the other).

**And it contradicts the shipped file's own contract.** `qfai-tests.yml:23` states, in the table an adopter
reads: `| `packageManager` precondition | none today - no lane installs. A lane that gains a pnpm install
needs `"packageManager"` in package.json |`. After the swap that sentence is false and no assertion in the
suite noticed.

**Why the existing boundary argument does not cover it.** `ALLOWED_STEP_BODIES`'s docstring is explicit
that its value is "a body nobody reviewed has no digest here" and that pasting a digest is "a visible act
in review". Both hold. What does not hold is the unstated half — that a reviewed digest means the reviewed
body runs **where it was reviewed**. Review of `Install dependencies (lockfile-aware)` was review of an
install in `qfai-validate.yml#validate`, gated behind the fail-closed `packageManager` step that precedes
it. Relocation carries the digest and leaves the review behind. Ordering has the same hole: the swap above
also proves that moving the fail-closed pnpm guard to *after* the install it guards moves no digest.

**Suggestion.** Make `ALLOWED_STEP_BODIES` a `ReadonlyMap<string, string>` from location to digest — the
key is the comment that is already there — and compare the sorted `at::digest` pairs instead of the sorted
digests:

```ts
expect.soft(bodies.map((b) => `${b.at} :: ${b.digest}`).sort())
  .toEqual([...ALLOWED_STEP_BODIES].map(([at, d]) => `${at} :: ${d}`).sort());
```

That is one assertion instead of two, it subsumes both current ones (an unreviewed body has no pair; a
replicated body is a second pair), it turns the twelve location comments from prose into the thing being
asserted, and relocating a body becomes the same visible two-line edit as changing one. Step ORDER within
a job stays unpinned by that change — if order is part of what was reviewed, compare in document order
rather than sorted, which costs nothing here because the order is already deterministic.

---

### M1 — `bareArgumentsOf` counts a redirection as a package name, so every allowed install refuses itself the moment it gains `>/dev/null` or `2>&1` — including the `2>&1` `redirectionsOf` deliberately suppresses

**Severity:** Major.
**Traces to:** `defect:correctness` (false refusal with a message that misnames the cause),
`defect:maintainability`.
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:951-968` (`bareArgumentsOf`),
`:1069-1071` (`TAKES_NO_PACKAGE`), `:940-944` (the descriptor-duplication suppression in `redirectionsOf`).

**Issue.** This is section 4's second bullet — "is the count right for a command with a redirection in the
middle of its arguments, now that redirections are found by character?" It is not. `headIndexOf` skips
leading redirect tokens, but `bareArgumentsOf`'s own loop past the head keeps only one test:

```ts
for (let i = head + 1; i < tokens.length; i += 1) {
  const token = tokens[i] ?? "";
  if (!token.startsWith("-")) out.push(token);
}
```

A trailing `>/dev/null` does not start with `-`, so it is counted as a bare argument, and every entry on
`TAKES_NO_PACKAGE` refuses at `> 1`:

```
npm install --no-audit --no-fund >/dev/null   -> ["npm install + >/dev/null"]
npm ci 2>&1                                   -> ["npm ci + 2>&1"]
npm ci >/dev/null 2>&1                        -> ["npm ci + >/dev/null 2>&1"]
pnpm install --frozen-lockfile > /dev/null    -> ["pnpm install + > /dev/null"]
corepack enable >/dev/null                    -> ["corepack enable + >/dev/null"]
```

Three things make this worth fixing rather than tolerating as fail-closed:

1. **The message names the wrong thing.** `npm install + >/dev/null` is the format reserved for "an install
   carrying a package", and a reader acting on it will look for a package called `>/dev/null`. The request
   asks for refusals a reader can act on; this is one that misdirects.
2. **`npm ci 2>&1` is refused by this rule and simultaneously suppressed by `redirectionsOf`**, which spends
   nine lines of comment (`:940-944`) arguing that `2>&1` creates nothing and must not be reported —
   because reporting it "spends the fail-closed budget on a refusal a reader cannot act on". Two functions
   in one file now give opposite answers about the same four characters. That is the two-coordinate-systems
   defect `headIndexOf`'s own docstring (`:397-406`) says was removed; it was removed for the HEAD index and
   left for the tail.
3. **One command, two spellings, opposite verdicts** — the seventh instance, running the other way:
   `npm install --no-audit --no-fund >/dev/null` is refused while
   `npm install --no-audit --no-fund>/dev/null` is not (it is refused as an unenumerated flag instead, i.e.
   for a different and also wrong reason).

The shipped install step does not redirect today, which is the only reason this is green. The next revision
of it that silences install chatter turns the boundary red for a legitimate change, and the cheapest way
out of that failure is to loosen `TAKES_NO_PACKAGE` — which is the rule closing the two-token prefix's
blind spot.

**Suggestion.** `bareArgumentsOf` should drop the tokens `redirectionsOf` already accounts for rather than
grow a second, weaker redirect test — the same argument `codeMask` makes at `:219-226` about two copies of
one lexer. Minimum: skip a token that contains an unquoted `<` or `>` *and* skip the word after a bare
`>` / `2>&1`-style operator; better: have `redirectionsOf` return the character span it consumed and have
`bareArgumentsOf` count over the command with those spans removed, so there is one answer about where a
redirection is. Add `npm ci >/dev/null 2>&1` and `npm install --no-audit --no-fund >/dev/null` to
`tests/unit/shippedLaneCommands.test.ts` as accepted, not refused.

---

### M2 — `payloadDigest` collides against a currently-enumerated payload: whitespace collapse lets a `//` comment swallow the statement after it, and `refusals()` clears the result

**Severity:** Major.
**Traces to:** `defect:correctness`, `defect:security` (the scanner clears a payload that is not the
reviewed one).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:734-737` (`payloadDigest`),
`:727-732` (`ALLOWED_NODE_PAYLOADS`), `:1056-1067` (the `node -e` rule in `refusals`).

**Issue.** `bodyDigest`'s docstring (`:741-747`) already argues that collapsing whitespace is wrong for a
body because it erases the difference between a space and a newline. That argument applies to a JavaScript
payload too, and for a reason the docstring does not name: **a `//` line comment is terminated by a
newline**, and both enumerated payloads are full of them. Collapse the newline after the last comment line
and the statement that followed it is now inside the comment.

**Demonstrated against the real, enumerated payload** — `qfai-validate.yml#validate`, digest
`df5c5a7b43cd48300a7baf113779007e08e814f69d01bfa726e476d9680406e1`, listed at `:731`:

```
payload chars: 1039
digest: df5c5a7b…0406e1   enumerated: true
last comment line: "// truncating it."
code line        : "process.stdout.write(field.trim().replace(/\s+/g, \" \"));"

mutated digest: df5c5a7b…0406e1
DIGESTS EQUAL:  true
same text?      false
refusals(<step body carrying the mutated payload>): []
```

and the two payloads run differently under the same `package.json`:

```
$ node payload-orig.js      -> [pnpm@9.0.0]
$ node payload-mutated.js   -> []
```

In the shipped step that empty value is the `if [ -z "$declared" ]` branch: a `::error` annotation and
`exit 1`. So the mutated payload converts the fail-closed pnpm guard — the thing that whole step exists to
be — into an unconditional stop for every pnpm adopter, and the enumeration that is supposed to make a
payload change visible reports the same 64 characters.

**Bounded honestly.** The freedom whitespace collapse grants is whitespace-only, so it can *remove* code
(comment swallow) and in principle re-shape it via ASI; I could not construct an *insertion*, and both
enumerated payloads terminate every statement with `;` so I found no ASI variant. And `bodyDigest` over the
enclosing step body **is** exact, so `ALLOWED_STEP_BODIES` catches this today — which is why this is Major
and not Blocking. It is nevertheless a direct answer to section 6's question: `refusals()` has a hole here
that only the boundary is covering, and the docstring at `:711-726` sells the enumeration as the thing that
"refuses every payload nobody wrote down". It does not; it refuses every payload nobody wrote down *up to
whitespace*.

**Suggestion.** Hash the payload as-is, exactly as `bodyDigest` does, and delete `payloadDigest`'s
`replace(/\s+/g, " ")` — the two functions then make one claim instead of two contradictory ones, and the
"a reflow IS a change someone should read" sentence at `:714-716` becomes true of the payload as it already
is of the body. If the collapse was bought for tolerance to YAML re-indentation, `bodyDigest`'s own
measurement (`:751-753`: "YAML strips it when it parses the scalar … the tolerance the normalizing was
bought for did not exist") says that tolerance is not needed here either. Re-measure the two digests and
re-record them in the same commit.

---

### B4 — section 2's "a key on one of the three lists, dangerous in a value nobody checks" is `with: persist-credentials`, and the only thing reading that value counts `persist-credentials: false` in COMMENTS

**Severity:** Blocking.
**Traces to:** `defect:security` (a shipped checkout can keep a write-capable token while the gate reports
hardened), `defect:correctness`.
**Artifacts:** `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:262-275` (the `US-0017-0002` scan),
`packages/qfai/tests/helpers/shippedLaneCommands.ts:703-708` (`ALLOWED_ACTION_INPUTS`).

**Issue.** Section 2 asks whether an enumerated key is dangerous in a value nobody reads, and names
`runs-on`, `if`, `needs`, `outputs`, `permissions`. It misses the one that is actually load-bearing:
`persist-credentials` is on `ALLOWED_ACTION_INPUTS`, so `readUses` accepts it and never looks at its value.
The only assertion that reads the value is a **text count** in a different `it()`:

```ts
const content = text.split(/\r?\n/).filter((line) => !line.trim().startsWith("#")).join("\n");
for (const ref of content.match(/uses:\s*\S+/g) ?? []) { …floating… }      // reads `content`
const checkouts = (text.match(/uses:\s*actions\/checkout/g) ?? []).length;  // reads `text`
const refusals  = (text.match(/persist-credentials:\s*false/g) ?? []).length;
if (checkouts > refusals) unhardened.push(…);
```

The comment directly above (`:258-261`) says a scan that documentation can break "is a scan people learn to
work around", and strips comments into `content` — then the two lines below it read `text`. **The repair was
applied to the loop and not to the two statements after it.** And even with comments stripped, the check is
a COUNT, not an association: it never pairs a `persist-credentials: false` with the checkout it belongs to.

**Demonstrated.** The four lines above transcribed verbatim, verified against the real shipped files, then
run over a plant:

```
qfai-tests.yml     {"floating":[],"checkouts":1,"refusals":1,"unhardened":false}   <- transcription checks out
qfai-validate.yml  {"floating":[],"checkouts":1,"refusals":1,"unhardened":false}

PLANT:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          # persist-credentials: false is what we would normally set here
          persist-credentials: true

  ->  {"floating":[],"checkouts":1,"refusals":1,"unhardened":false}
```

A checkout that **keeps** the `GITHUB_TOKEN` in `.git/config` for every later step, with the refusal present
only as prose, is reported hardened. Nothing else in the suite reads the value: the key enumerations accept
`with`, `ALLOWED_ACTION_INPUTS` accepts `persist-credentials`, and `ALLOWED_ACTION_COMMITS` reads the SHA.
On `qfai-tests.yml#detection` that token would be live alongside a `fetch-depth: 0` checkout on every pull
request.

I did not plant this in the shipped tree — that directory is `qa-gatekeeper`'s this round — so the
demonstration is over the transcribed scan, whose fidelity is established by the two real-file rows above.

**Scope note, so the stage can triage honestly:** `git log -L 266,276` shows this block was **not** touched
by round 14's repairs (last changed in `0408248f`). It is pre-existing rather than a repair that went wrong.
It is graded Blocking on impact, not on novelty.

**Suggestion.** Read the value from the parsed document, where `readUses` already is, instead of counting
text:

```ts
if (action === "actions/checkout" && inputs?.["persist-credentials"] !== false) {
  refusedUses.push(`${label}: checkout without persist-credentials: false`);
}
```

That associates the refusal with its checkout, is immune to comments by construction, and deletes the two
text-count lines and the `unhardened` array with them. While there, either read `content` in both places or
delete the `content`/`text` split — one `it()` reading its input two ways is the two-copies defect this file
has now found at five sizes.

---

### m1 — the empty-string refusal round 14 found is still reachable: `>|`, `>""` and a trailing `>` all produce `<writes>  :: …` naming nothing

**Severity:** minor.
**Traces to:** `defect:maintainability` (a refusal a reader cannot act on).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:917-944`.

The operator consumption accepts only `ch` and `&`, so bash's clobber operator `>|` leaves the `|` in the
target position; `commandsOf` then splits at that `|` (it is not a case alternation) and the write scan sees
a command whose entire content is `>`:

```
printf x >| package.json  -> ["<writes>  :: printf x >", "package.json"]
printf x >""              -> ["<writes>  :: printf x >\"\""]
printf x >                -> ["<writes>  :: printf x >"]
```

The request states the standard — "a refusal must name something a reader can act on. Round 14 found one
whose target was the empty string" — and `>|`, a real bash redirection an adopter can write, still produces
it. Two refusals for one command, and `package.json` (the actual target, and the actual danger) appears in
neither as a write.

**Suggestion.** The B1 fix makes `>|` consume as `>` and leaves `|` where it is, which still splits. Add `|`
to the operator characters when it immediately follows `>`, and refuse an empty target explicitly with a
message naming the command rather than the target: `<writes> (unreadable target) :: <command>`.

---

### m2 — two comments in the helper state that `NODE_ENV=production npm ci` is accepted; measured, it is refused

**Severity:** minor.
**Traces to:** `defect:correctness` (a claim the code contradicts).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:450-457`, `:951-958`, `:531`.

`:453-454` says of the env-prefix rule: "`IFS=`, `NODE_ENV=production` and `declared=…` are not [refused],
which is what keeps the shipped tree readable." `:954-956` says the `bareArgumentsOf` repair exists because
"`NODE_ENV=production npm ci` yielded `["npm","ci"]`, so `TAKES_NO_PACKAGE` refused a line the shipped tree
may legitimately contain" — which reads as "and now it does not". Both are false:

```
ALLOWED_ENV_PREFIXES = ["IFS"]
NODE_ENV=production npm ci  ->  ["<unreadable> NODE_ENV=production npm ci"]
```

`NODE_ENV` is not on `ALLOWED_ENV_PREFIXES`, so `invocationOf` returns `UNREADABLE` two rules before
`bareArgumentsOf` is ever consulted. The behaviour is defensible — the docstring at `:520-530` argues
correctly that which variable is set is ours to enumerate — but the example chosen to illustrate it is one
the rule refuses. This is the same class round 14 found five of: a correction applied at one site while the
prose around it still describes the old behaviour.

**Suggestion.** Replace `NODE_ENV=production` with `IFS=` in both comments, or add `NODE_ENV` to
`ALLOWED_ENV_PREFIXES` if it is genuinely intended to ship — but not both readings in one file.

---

### m3 — `select` is modelled as `case`, but its word list is data like `for`'s, so `select x in a b` refuses a program named `a`

**Severity:** minor.
**Traces to:** `defect:correctness` (false refusal).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:422-429`, `:465-475`.

Section 4 asks whether the two functions still disagree. They do not — they now agree on a wrong answer for
`select`. `case NAME in PATTERN) CMD ;; esac` puts a command in the same segment, which is why skipping past
`in` is right. `select NAME in WORDS; do CMDS; done` does not: `WORDS` is a word LIST exactly as `for`'s is,
and the body arrives in a later `do …` segment. Grouping `select` with `case` therefore reads the first word
of the list as a program:

```
select x in a b                     ->  ["a b"]
select x in a b; do echo hi; done   ->  ["a b"]
for f in a b; do echo hi; done      ->  []          <- the correct shape
```

Fail-closed, so no hole — but it is a refusal naming a program nobody invoked, and the comment at `:466-469`
justifies the grouping with a `case` example that does not generalise to `select`.

**Suggestion.** Move `select` next to `for` in both functions (`return undefined` / `return NOTHING`) and
delete it from the `case` branch. Two `select` rows in
`tests/unit/shippedLaneCommands.test.ts` — one asserting the word list is not an invocation, one asserting
`do npx tsup` in the following segment still refuses.

---

### m4 — the head walk still skips redirections by TOKEN SHAPE, so a leading `2>&1` or `2>/dev/null` is read as the program

**Severity:** minor.
**Traces to:** `defect:correctness` (false refusal), `defect:maintainability` (the rule `redirectionsOf`
replaced is still live at two sites).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:412` and `:450` —
`token.startsWith(">") || token.startsWith("<")`.

`redirectionsOf`'s docstring (`:877-888`) says the repair "stops reading token shapes" because "a
redirection does not have to begin a token". The prefix skips in `headIndexOf` and `invocationOf` still read
exactly that shape, and a numbered descriptor does not begin with the arrow:

```
2>&1 npm ci          ->  ["2>&1 npm"]
2>/dev/null echo hi  ->  ["2>/dev/null echo"]
```

Both are valid bash with the redirection in leading position, both resolve to an invocation whose "program"
is a redirection. Fail-closed, so no hole, but it is the same token-shape rule in the same file that section
1 exists to have removed — removed at one call site and left at two, which is the file's own recurring
defect.

**Suggestion.** Reuse the character walk: a token is a leading redirection when
`redirectionsOf(token).length > 0 && tokensOf(token).length <= 1`, or (smaller) extend the test to
`/^\d*[<>]/`. Pair it with M1 so there is one answer to "is this token a redirection" in the file.

---

### m5 — `${GITHUB_OUTPUT}` is refused while `$GITHUB_OUTPUT` is allowed

**Severity:** minor.
**Traces to:** `defect:correctness` (false refusal), one-command-two-spellings.
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:873` (`ALLOWED_REDIRECT_TARGETS`).

```
echo "v=1" >> "$GITHUB_OUTPUT"   ->  []
printf x > ${GITHUB_OUTPUT}      ->  ["<writes> ${GITHUB_OUTPUT} :: …"]
```

Braced expansion is the same variable and the more defensive spelling of it. The set is compared by exact
string, so the two spellings of one target get opposite verdicts — the pattern this file has now been
defeated by seven times, here in the harmless direction.

**Suggestion.** Normalize `${NAME}` to `$NAME` before the membership test, in one place, and add both
spellings to the unit corpus.

---

### m6 — a here-document's DATA is scanned as commands

**Severity:** minor.
**Traces to:** `defect:correctness` (false refusal).
**Artifacts:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:75-217` (`commandsOf` splits on `\n`
with no here-document state).

A body of `printf x <<DELIM` / `hello` / `DELIM` yields `refusals() == ["hello", "DELIM"]`; the `<<-`
quoted form behaves the same. `redirectionsOf` reads `<<` correctly as a read whose target is the
delimiter, but `commandsOf` has no here-document state, so every line of the body is split off as a command
and `invocationOf` reports the first word of each as a program. Fail-closed, and a here-string
(`grep -q x <<<'hello'`) is handled correctly — but the here-document is the spelling an adopter reaches for
to write a config file, and it currently produces refusals naming words from the data.

**Suggestion.** When `redirectionsOf` reports a `<<` / `<<-`, skip `commandsOf` forward to the line after
the delimiter. One state variable in the existing walk; no second lexer.

---

### A1 — `ALLOWED_ACTION_INPUTS` is one flat set across three actions, so each action accepts the other two's inputs

**Severity:** advisory.
**Traces to:** `defect:maintainability`.

`readUses` checks an input key against a single set regardless of which action is being given it, so
`actions/setup-node` accepts `fetch-depth` and `persist-credentials`, and `actions/checkout` accepts
`node-version` and `cache` (measured: no refusal for either). Nothing dangerous ships from that today — the
four keys are individually benign — but the enumeration's stated value is "`arguments`, `args` and `run` are
refused by not appearing", and that value is per-action. `pnpm/action-setup`'s `run_install`, the one input
in the shipped set that would execute an install with caller-chosen arguments, is refused today only
because nobody has listed it; a fourth action added later inherits all four keys automatically.

**Suggestion.** A `ReadonlyMap<string, ReadonlySet<string>>` keyed by action, in the same shape
`ALLOWED_FLAGS` already uses for invocations — the file already has the pattern and the argument for it.

---

### A2 — `ALLOWED_STEP_BODIES` is a `Set` of literals, so a duplicated digest silently becomes eleven entries

**Severity:** advisory.
**Traces to:** `defect:maintainability`.

The `Set` constructor dedupes. If a future edit pastes a digest already present, the set becomes eleven and
the multiset assertion fails with "expected 12, got 11" pointing at the shipped tree rather than at the
duplicated literal. The docstring counts twelve in prose; nothing asserts it. The B3 fix (a `Map` keyed by
location) removes this too: two entries at different locations may legitimately share a digest, and a
duplicated LOCATION is the thing that would actually be a mistake.

---

### A3 — round 14's `ALLOWED_ACTION_COMMITS` repair is closed, and it is reachable at all three levels

**Severity:** advisory (a pass, recorded so the next round need not re-check it).

Section 2's last bullet asked whether the new SHA-value check reaches every `uses:` including one on a job.
It does — `readUses` reads `holder["uses"]` unconditionally and is called at workflow, job and step level.
Measured against a verbatim transcription of the check:

```
job-level  uses: actions/checkout@<forty zeros>   -> declares uses / pinned elsewhere to 11d5960a…  (both fire)
step       uses: actions/setup-node@<forty zeros> -> pinned elsewhere to 49933ea5…
step       uses: pnpm/action-setup@v4             -> pinned elsewhere to fc06bc12…
wf-level   uses: actions/checkout@<forty zeros>   -> declares uses / pinned elsewhere to 11d5960a…
```

Forty zeros is caught, a tag pin is caught, and a job-level `uses` is caught twice (key enumeration and
pin). The repair holds.

---

## What I attacked and could not break

Recorded so the next round spends its effort elsewhere. All measured, not reasoned.

**Section 1, the redirection lexer.** Refused correctly, each naming its target:
`exec 3>package.json` (twice — as a write and as an unenumerated `exec`), `printf x 10>package.json`
(descriptor above 9), `printf x ${v}>package.json`, `{ printf x; } > package.json`,
`while true; do printf x; done > package.json`, `printf x &>package.json`, `printf x & >package.json`,
`printf x >& package.json`, `printf x >&$fd`. The `&` split rule holds in both directions:
`printf x && npx tsup` and `printf x & npx tsup` both split and both refuse the build, while `>&2`, `2>&1`
and `2>&1 &` do not split. The `>&<digit>` suppression is right: `>&-` and `2>&1-` produce no refusal and
create nothing, `>&$fd` is refused rather than assumed. The one hole is `<>` (B1) and the one unactionable
message is `>|` (m1).

**Section 2, the key enumerations.** The three levels are enforced through one function at all three, and I
could not add an execution channel by adding a key: `defaults`, `strategy`, `container`, `services`,
`working-directory`, `continue-on-error` and a job-level `uses` are all refused, at the right level, with a
message naming the key. `shell:` values are read and only `bash` passes. `env:` names are read at the one
level where `env` is an enumerated key and refused at the two where it is not. What I could break was the
question one level up (B3) and one enumerated key's unread value (B4).

**Section 3.** The multiset upgrade does hold against replication: a thirteenth step carrying a reviewed
body fails the second assertion. `bodyDigest` is exact on everything except line endings, and the
line-ending case is B2.

**Section 4.** `headIndexOf` and `invocationOf` agree on every construct I could build where the answer is
observable — `case`, nested `case`, an arm whose pattern is the word `in`, an arm inside a function body,
a function header, `for`, `while IFS= read -r`, a glob head, `[`, an assignment prefix, a leading `>file`.
The one construct where they differ is a bare `)` as the whole first token: `headIndexOf` steps over it as
a case arm and returns index 1, `invocationOf` reads it as a `TERMINATORS` member and returns `NOTHING`.
Not observable today, because `bareArgumentsOf` and the flag loop are only reached for a resolved
invocation — but `headIndexOf` not knowing `TERMINATORS` is the seam the unification was supposed to
close, and it is worth closing while the reason is still written down.

---

## Section 6: is `refusals()` load-bearing again?

Yes, and worse: the two halves are now each other's only backstop and both have a hole.

The division the record states is that `refusals()` is an instrument and `ALLOWED_STEP_BODIES` is the
boundary. B1 is a body that runs arbitrary code with the instrument reporting clean — caught only because
the boundary would see a new digest. B3 is a change to what a lane executes with the boundary reporting
clean — and `refusals()` cannot see it either, because both bodies are reviewed bodies. So each finding is
survived only by the other half, and each half is holed in the direction the other cannot see. That is not
defence in depth; it is two single points of failure described as one.

The division is still the right one. What it needs is for the boundary to pin the pair (`location`,
`digest`) rather than the digest alone — after which B3's move is a visible edit, B1 remains an instrument
bug rather than a shipping hole, and the "pasting a digest is a visible act in review" argument becomes
true of relocation too.

**Gaps item 9 (`US-0017-0004`'s scope).** The scope statement — that the claim covers what the shipped TEXT
invokes, and that an allowed install runs the adopter's own lifecycle scripts — is now incomplete in two
further ways this round measured. `working-directory` showed the lane can select a manifest without writing
one; B1 shows it can **write** one (`1<>package.json`) with every assertion green; B3 shows it can **move an
install into a lane that is documented as installing nothing**. I am not asking for a new product
obligation: the fixes for B1 and B3 make both statements true again without changing scope. But if either
is deferred, Gaps item 9 has to say so, because `qfai-tests.yml:23` currently tells adopters "none today -
no lane installs" and B3 is the reason that sentence is not gate-backed.

---

## Sign-off

- [x] Review verdict is explicit — **REVISE**.
- [x] Findings cite concrete artifacts or evidence — every one names a file and line range, and every
      code finding is demonstrated by running the subject.
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding has `Traces to: none`.
- [x] Required gates and residual risks are recorded.

**Gates.** `vitest run tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — 10/10 passed, exit 0, at
`21e2cdc6`. Not re-run after this review because nothing was changed. I did **not** run
`qfai validate --profile atdd` — the request records that it rewrites the tracked
`.qfai/report/validate.log`, and I had no reason to pay that cost.

**Residual implementation risk.**

1. **B1 is exploitable today.** `printf … 1<>package.json` + `npm install` is two allowed lines and a
   working preinstall hook, executed. Only `ALLOWED_STEP_BODIES` stands in front of it.
2. **B3 needs no new text at all**, so it is invisible to the one gate that was designed to be the
   boundary, and it silently falsifies a table row an adopter reads.
3. **B4 is the cheapest of the four to exploit** — one word (`false` -> `true`) plus a comment — and it
   affects the token, which is the highest-value thing in the shipped set.
4. **M1 is a trap for the next legitimate edit**: the first person to add `>/dev/null` to the install step
   gets a red boundary with a message that misnames the cause, and the shortest route out is to weaken
   `TAKES_NO_PACKAGE`.
5. B2's collision is not exploitable against the twelve bodies shipped today; it becomes exploitable when
   a body with a `\` continuation ships, which `qfai-tests.yml` says five times is coming.

**Revision check.** `git rev-parse --short HEAD` at start: `21e2cdc6`. At finish: recorded below. Working
tree `git status --porcelain` was clean at start; the only path I wrote is this report. No plant was made
in `packages/qfai/assets/init/root/.github/workflows/` — the two workflow-shaped demonstrations mutated the
**parsed document in memory**. Everything else lives in `tmp/r15-impl/`.

---

## Sighting: a sibling's plant appeared in the working tree mid-review — reported, not measured through

At start `git status --porcelain` was clean. At finish it was not:

```
 M packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml
 M packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml
```

with mtime `2026-08-22 04:17:20`, and this content:

```diff
+      - name: Set up pnpm via pnpm/action-setup 4.4.0 (planted)
+        uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320
```
```diff
+      - name: Set up Node via actions/setup-node 4.4.0 (planted override)
+        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
+        with:
+          node-version: lts/*
```

**This is not mine.** I wrote nothing to that directory — it is `qa-gatekeeper`'s this round — and my two
workflow-shaped demonstrations mutated the parsed document in memory. The `(planted)` / `(planted override)`
labels and the timestamp identify it as a sibling's instrument. Per the request I am reporting it rather
than measuring through it, and I am **not** restoring it: it is not mine to restore, and restoring another
role's plant is how round 11's mis-attribution happened.

**What it does to my findings: nothing.** Both planted steps are `uses:` steps carrying no `run:` body, so
they cannot move a digest, a refusal or a body count. To remove all doubt I re-ran every measurement that
reads the shipped tree against pristine content extracted with
`git show HEAD:<path> > tmp/r15-impl/pristine/<name>` — never `git checkout` — and all four reproduce
byte-identically:

- **B3** — baseline `unreviewed [] / multiset true / refusals [] / keys []`, and after the swap the same
  four, with `qfai-tests.yml#detection` running the lockfile-aware install. Identical to the earlier run.
- **B1's proposed fix** — shipped tree still clean under the patched helper; all `<>` spellings caught.
- **B4** — `qfai-tests.yml {checkouts:1, refusals:1}`, `qfai-validate.yml {checkouts:1, refusals:1}`,
  plant reported hardened. Identical.
- **M2** — payload 1039 chars, digest `df5c5a7b…0406e1`, enumerated `true`. Identical.

The E2E gate I record as passing (10/10, exit 0) ran at 04:06:06, eleven minutes before the plant landed,
so that result is also against the unmodified subject.

**Note for `qa-gatekeeper`:** the pnpm plant is worth its own look. `qfai-tests.yml#unit` acquiring a
`pnpm/action-setup` step is a lane gaining a package-manager setup, and `qfai-tests.yml:23` tells adopters
"none today - no lane installs". Every gate in `US-0017-0004` stayed green for it in my reading, which is
the same class as my B3 — the shipped tree's documented contract is not gate-backed.

---

**`git rev-parse --short HEAD` at finish: `21e2cdc6`.** The subject did not move while this round ran; the
stage kept its commitment. The working tree did move, in the directory this role may not write to, and that
is recorded above.
