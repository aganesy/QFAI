# R01 — implementation-reviewer, round 11, spec-0017

**Verdict: REVISE.**

Reviewer: `implementation-reviewer` (code / backend-safety domain). Stage: `/qfai-atdd`, stage gates
only. `P1d` was not re-opened.

## Provenance of this review

| | |
| --- | --- |
| `git rev-parse --short HEAD` at start | `4b58eadd` |
| `git rev-parse --short HEAD` at finish | `4b58eadd` (unchanged) |
| `git status --porcelain` at start | `M .qfai/report/validate.log`, `M .qfai/report/validate.spec-0017.json` |
| `git status --porcelain` at finish | identical to start; no other path modified, staged, or added |
| Scratch | `tmp/r11-impl/` only |

Every mutation below was reverted inside a `finally` with a printed byte comparison, and each restore
printed `identical=true`. No commit, no stage, no push.

Method note, stated because this stage discounts opinion: every finding below is a mutation plus a
command plus a before / after verdict. Where I could not reproduce something I say so.

## Sign-off

- [x] Review verdict is explicit
- [x] Findings cite concrete artifacts or evidence
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding has `Traces to: none`
- [x] Required gates and residual risks are recorded

---

### B1 — `git` is allowed by name, and `git` runs arbitrary configured commands

**Artifact:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:248-258` (`HARMLESS_PROGRAMS`), read
by `refusals()` at `:294-299` and by
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:496`.

**Severity:** Blocking. **Traces to:** `defect:correctness` — the module docstring at `:242-246` claims
these are "Programs whose arguments cannot reach a build", allowed by NAME — and `AC-0017-0014` /
`US-0017-0004`, whose sole remaining instrument this is.

**Issue.** `git` is on the by-name allowlist, so `refusals()` accepts it whatever its arguments. `git`
has at least five subcommands whose argument IS a shell command: `submodule foreach`, `bisect run`,
`difftool --extcmd`, `filter-branch --tree-filter`, and `-c alias.X=!<command>` followed by `X`.
`invocationOf` truncates at the program plus the first non-flag token, and `OPAQUE_AFTER` makes `-c` end
the scan at the program name, so every one of them collapses to `git` or `git <subcommand>`.

**Measurement.** `node --experimental-strip-types tmp/r11-impl/probeA.mjs`:

```
ESCAPES | refusals=[] | classifier=[] | git -c 'alias.zz=!pnpm build' zz    inv=["git"]
ESCAPES | refusals=[] | classifier=[] | git submodule foreach 'pnpm -C packages/qfai build'
ESCAPES | refusals=[] | classifier=[] | git bisect run make                 inv=["git bisect"]
ESCAPES | refusals=[] | classifier=[] | git difftool --extcmd='pnpm build' HEAD~1
ESCAPES | refusals=[] | classifier=[] | git config alias.zz '!pnpm build' ; git zz
```

Both instruments are blind: `refusals()` returns `[]` and `classifyBuildCommand` returns `none`.

The end-to-end measurement is `tmp/r11-impl/plant.mjs`, which planted six real builds — three of them
`git`-borne, three from `B2` — as new steps in
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, ran the row, and restored the file:

```
ORIGINAL bytes=11241 sha256:581608a7e1dbbb72
MUTANT   bytes=11925 sha256:e64df8b90f277c28
  E2E ... (US-0017-0004) > ships no lane that runs its own bundler build   PASSED
  Test Files  1 passed (1)      Tests  2 passed | 8 skipped (10)
EXIT STATUS = 0
RESTORED bytes=11241 sha256:581608a7e1dbbb72 identical=true
```

`tmp/r11-impl/plant2.mjs` then ran the same mutant against every other test that reads the shipped
workflow tree — `tests/assets/actionPinBumpOwner.test.ts`, the three
`tests/integration/shippedWorkflow*.test.ts`, `tests/unit/buildCommand.test.ts`,
`tests/unit/shippedLaneCommands.test.ts`, `tests/scripts/workflowHygiene.test.ts` and
`tests/scripts/ownWorkflowTopology.test.ts` — **123 tests, exit 0 on all four lanes**. Nothing in the
repository sees six real builds sitting in the shipped orchestrator.

**Suggestion.** `git` is in `HARMLESS_PROGRAMS` to support one shipped line,
`git diff --name-only origin/main...HEAD | cut -d/ -f1 | tr -d ' '`. Move it to `ALLOWED_INVOCATIONS`
as `git diff` — that is what the split at `:242-247` exists for, and it is the same argument the file
already makes for `npx qfai` versus `npx tsup`. `read` and `grep` need the same re-reading in light of
`B2`: both can execute through a process substitution.

---

### B2 — `commandsOf` never enters a backtick or a process substitution, so the shipped tree's own idiom is a hole

**Artifact:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:77-140` (`commandsOf`, whose docstring
at `:66-76` says it splits "honouring quotes, newlines and command substitution") and `:198-216`
(`invocationOf`).

**Severity:** Blocking. **Traces to:** `defect:correctness`; `AC-0017-0014` / `US-0017-0004`.

**Issue.** Three things compose into a complete bypass:

1. Line 95 enters `$(` only. Backtick substitution — the other POSIX spelling of the same construct — is
   never entered; its characters accumulate into the surrounding word.
2. `<(` and `>(` (process substitution) are likewise never entered.
3. `invocationOf` returns `undefined` for any command whose head matches an assignment prefix (`:203`)
   or contains `=` (`:209`).

So a backtick assignment produces **no invocation at all** — `invocationsOf` returns `[]` — and that is
character-for-character the shape the shipped tree already uses and the SHIPPED corpus already pins:
`declared="$(node -e ...)"` at `tests/unit/shippedLaneCommands.test.ts:104`. One character class
separates the pinned form from the invisible one.

**Measurement.** `node --experimental-strip-types tmp/r11-impl/probeA2.mjs`. The backtick is written
`BQ` in this table only, to keep the code fence readable; the probe uses the real character.

```
ESCAPES | refusals=[] cls=[] inv=[]               | declared=BQ tsup BQ
ESCAPES | refusals=[] cls=[] inv=[]               | declared=BQ make BQ
ESCAPES | refusals=[] cls=[] inv=[]               | declared="BQ pnpm -C packages/qfai build BQ"
ESCAPES | refusals=[] cls=[] inv=[]               | if [ -n "BQ pnpm build BQ" ]; then echo ok; fi
ESCAPES | refusals=[] cls=[] inv=["echo BQ pnpm"] | echo BQ pnpm build BQ
ESCAPES | refusals=[] cls=[] inv=["printf %s"]    | printf '%s' BQ make BQ
ESCAPES | refusals=[] cls=[] inv=["read v"]       | read -r v < <(pnpm build)
ESCAPES | refusals=[] cls=[] inv=["grep <(make"]  | grep -f <(make all) file
refused | refusals=[tsup tsup.config.ts]          | declared="$(tsup --config tsup.config.ts)"
```

The last line is the control: the `$( ... )` form IS caught, so the mechanism works and only this
spelling is missing. Three of these shapes are among the six planted in `plant.mjs`, and the row passed
(see `B1`).

**Suggestion.** Treat a backtick as an opening delimiter whose body is re-entered as commands, exactly
as `$(` is at `:95-100`, and enter `<(` / `>(` the same way. Then add a REFUSED-direction case per
spelling to `tests/unit/shippedLaneCommands.test.ts` — the file currently contains no backtick anywhere,
in either corpus, which is why the hole survived authoring.

Second, smaller half of the same finding: an assignment whose value the scanner cannot read should not
return `undefined`, because `undefined` means "names no program". `undefined` and "unreadable" are being
conflated, and `refusals()` reads the second as consent. That is the structural reason this class keeps
recurring, and it is fixable independently of any list.

---

### B3 — `US-0017-0002` and `US-0017-0003` hardcode the workflow file list, which is round 10's `US-0017-0004` defect one row over

**Artifact:** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:227`
(`const files = [ORCHESTRATOR, "qfai-validate.yml"];`) and `:263` (the same literal pair), against
`shippedJobs()` at `:180-193`, which derives the set from the shipped directory and sits 40 lines above
them for exactly this reason.

**Severity:** Blocking. **Traces to:** `AC-0017-0009` ("**Every** checkout refuses to persist
credentials"), `AC-0017-0010` ("**Every** action reference is a full-SHA pin"), `AC-0017-0013` ("No
workflow-level Node literal"); also `defect:security` for the pin and credential half.

**Issue.** Round 10 found `US-0017-0004` reading one file while its annotation claimed a property of an
adopter's lanes, plural. The fix derived the set (`shippedJobs`, `:180`) and the docstring at `:168-179`
records the reasoning. Two rows in the same file were left on the hardcoded pair. The brief's question
5b asked whether any of the other eight are scoped narrower than their story: two are.

**Measurement.** `tmp/r11-impl/plant6.mjs` added a third shipped workflow,
`assets/init/root/.github/workflows/qfai-extra.yml`, carrying exactly the three things those two rows
say an adopter never receives — a floating `uses: actions/checkout@v4`, no `persist-credentials: false`,
and a workflow-level `node-version: 20` — and **no build at all**. Three consecutive runs of the whole
E2E file:

```
run 1 exit=1   Tests  1 failed | 9 passed (10)
run 2 exit=1   Tests  1 failed | 9 passed (10)
run 3 exit=1   Tests  1 failed | 9 passed (10)
AssertionError: layer separation must not arrive as one workflow file per layer
extra removed = true
```

`US-0017-0002` and `US-0017-0003` are among the nine that pass. The single failure is `US-0017-0005`,
annotated for a different story, and its message points a reader at layer separation rather than at an
unpinned action.

`tmp/r11-impl/plant4.mjs` then did what a legitimately-added workflow forces someone to do — update
`US-0017-0005`'s expected file list — and measured the result:

```
--- B: plus US-0017-0005's file list updated (exit 0) ---
  Test Files  1 passed (1)      Tests  10 passed (10)
RESTORED test bytes=32765 sha256:f218212627c3511e identical=true
```

**All ten rows green** while an adopter receives an unpinned action, a credential-persisting checkout and
a hardcoded Node version. The only guard that noticed is the one whose expected value has to change
whenever a workflow legitimately ships, which makes that coverage self-erasing — and `US-0017-0006` and
`US-0017-0008` between them describe two workflows that are supposed to arrive.

**Suggestion.** Both rows should read the derived set: factor the `readdir` half out of `shippedJobs()`
into `shippedWorkflowFiles()` and call it from `:227` and `:263`. Five lines, and it removes the third
and fourth copies of the literal `"qfai-validate.yml"` in this file. Pin each with `plant6.mjs`'s third
workflow.

---

### B4 — hugo's deleted `values` decided two verdicts, and the structural reason given for deleting it is false for every `bareIsBuild` tool

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:333-336` — "hugo declares no `values`: its own
`bareIsBuild` decides before any flag can matter, so a consumed argument cannot change the verdict" —
against `:992`, `if (tool?.bareIsBuild === true && !sawBare) return "build";`.

**Severity:** Blocking. **Traces to:** `defect:correctness`, plus the class round 10's `B3` established
(a deletion resting on an argument that is not sound). Also `defect:code-quality`: a comment asserting a
property of the code that the code does not have is the recurring class item 7 of
`.qfai/evidence/atdd-spec-0017.md` catalogues.

**Issue.** `bareIsBuild` is not evaluated "before any flag can matter". It is evaluated **after the token
loop**, at line 992, and it is gated on `!sawBare`. A flag in `values` consumes its argument
(`:887-894`); a flag NOT in `values` leaves its argument to be read as a bare token, which sets `sawBare`
(`:953` or `:963`) and suppresses `bareIsBuild`. The `values` list is therefore load-bearing for every
`bareIsBuild` tool, in both directions.

**Measurement 1 — the refutation the brief asked for: a command whose verdict the deleted entry decided.**
`tmp/r11-impl/mutate.mjs` restored `values: ["-d", "--destination"]` on hugo and re-measured 22 commands:

```
ORIGINAL bytes=49236 sha256:0f2b6512ab2c4137
=== MUTANT: restore hugo values === moved=2
  none -> build   hugo -d dist
  none -> build   hugo --destination dist
RESTORED bytes=49236 sha256:0f2b6512ab2c4137 identical=true
```

`hugo -d <dir>` is hugo building a site into `<dir>`. The deleted entry decided it.

**Measurement 2 — the general defect.** `node --experimental-strip-types tmp/r11-impl/probeC.mjs`, 13 of
24 wrong, in both directions and all from the same mechanism:

```
WRONG   real build   -> none      hugo -d dist
WRONG   real build   -> none      hugo -b https://example.com
WRONG   real build   -> none      hugo --config config/prod.toml
WRONG   real build   -> none      ninja -d stats
WRONG   real build   -> none      just --justfile Justfile
WRONG   real build   -> none      task -t Taskfile.yml
WRONG   real build   -> none      scons -f SConstruct
WRONG   real build   -> none      ant -lib lib/junit.jar
WRONG   real build   -> none      waf -o out
WRONG   NOT a build  -> build     rake -T
WRONG   NOT a build  -> build     rake -P
WRONG   NOT a build  -> build     scons --tree=all
WRONG   NOT a build  -> build     just --list
WRONG   NOT a build  -> build     task --list
WRONG   NOT a build  -> build     tsc --showConfig
```

Restoring hugo's `values` narrows the first group by two and does nothing for the second. So the deletion
is wrong AND insufficient: `bareIsBuild` as written requires a **complete** flag partition for a tool
whose flag set is open, which is the closed-world assumption this file's twelve-version history is about.

**Suggestion.** Do not re-add hugo's `values` and stop there. `bareIsBuild` should be decided from
whether a non-flag TARGET was given, not from whether any token failed to be consumed — that is,
`sawBare` should be set only at `:962-968`, where an unrecognised bare token sits in target position, and
not by a flag's un-consumed value. Alternatively give the `bareIsBuild` tools a per-tool `never` for
their query flags (`-T`, `-P`, `--list`, `--tree`, `--showConfig`), which is the shape `m4` already
introduced this round for make.

---

### M1 — `ALLOWED_INVOCATIONS` is documented as exact and is a two-token prefix, so `npm install <any package>` ships

**Artifact:** `packages/qfai/tests/helpers/shippedLaneCommands.ts:260-272` ("Exact invocations allowed for
a program that could otherwise build") against `invocationOf` at `:210-215`, which returns
`head + " " + token` on the FIRST non-flag argument and never looks further.

**Severity:** Major. **Traces to:** `defect:security` (arbitrary install-script execution in a shipped
lane) and `defect:code-quality` (the docstring's word "exact").

**Measurement.** `node --experimental-strip-types tmp/r11-impl/probeB.mjs`:

```
ALLOWED cls=build      inv="npm install"    npm install esbuild
ALLOWED cls=none       inv="npm install"    npm install --no-save @vercel/ncc
ALLOWED cls=build      inv="pnpm install"   pnpm install --filter tsup
ALLOWED cls=none       inv="yarn"           yarn --immutable
refused cls=build      inv="yarn add"       yarn add tsup                    <- control
```

`npm install --no-save @vercel/ncc` is invisible to BOTH instruments and installs and runs an arbitrary
package's lifecycle scripts. `npm install esbuild` is caught only by the classifier, which the row's own
docstring (`:470-484`) argues cannot be relied on.

Note the asymmetry the same probe exposes: `yarn add tsup` is refused and `npm install tsup` is not,
because `install` is an allowed second token and `add` is not. One idea, two spellings, two verdicts — the
invariant `m4` was raised for, in the allowlist this time.

**Suggestion.** Require the invocation to be the WHOLE command where the tail is bounded: keep prefix
semantics only where a subcommand tail is genuinely open (`npx qfai`), and make `npm install`,
`pnpm install`, `yarn install` and `npm ci` match only when no further non-flag token exists. The test at
`:154-166` already asserts the two lists are disjoint; add one asserting that a trailing package name is
refused.

---

### M2 — ninja, scons and rake report their dry-run flag as a build; make does not

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:248` (`ninja`), `:293` (`scons`), `:319`
(`rake`), against `:163-171` (`MAKE.never`) and the `never` docstring at `:150-160`.

**Severity:** Major. **Traces to:** `defect:correctness`. The docstring introducing `never` states the
invariant it is establishing — "One command, three spellings, two verdicts" — and this round left three
sibling tools on the wrong side of it.

**Measurement.** `tmp/r11-impl/mutate.mjs`, baseline and mutant:

```
=== BASELINE (HEAD) ===
  build     ninja -n
  build     ninja -n build
  build     scons -n
  build     rake -n
  none      make -n
  none      make -n build

=== MUTANT: give ninja a make-style never === moved=2
  build -> none   ninja -n
  build -> none   ninja -n build
```

`-n` is documented dry-run in all four tools. `make -n build` is `none` and `ninja -n build` is `build`.
`scons --dry-run` is `none` through the global `NEVER_FLAGS` while `scons -n` is `build` — one tool, two
spellings of one flag, two verdicts, which is precisely the `m4` defect unmoved.

**Suggestion.** `never: ["-n"]` on ninja; `never: ["-n", "--no-exec", "--just-print", "--recon"]` on
scons; `never: ["-n"]` on rake — with one pinning case each, since `m4`'s own case covers only make.

---

### M3 — deleting `@vercel/ncc` from `BUNDLERS` changed a verdict for a command `ncc` actually has

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:378-396` (`BUNDLERS`); the justification is in
commit `b510843b`'s message, "`@vercel/ncc`, which the unknown-binary rule already reads".

**Severity:** Major. **Traces to:** `defect:correctness`, and round 10's `B3` class.

**Issue.** The unknown-binary rule reads the word `build`. `ncc` has a second subcommand that also
compiles: `ncc run <input>` builds and then executes. The word `build` is absent, so the rule reads
nothing.

**Measurement.** `tmp/r11-impl/mutate.mjs`:

```
=== BASELINE (HEAD) ===
  none      npx @vercel/ncc run src/index.js
  none      @vercel/ncc build src/index.js
  build     npx @vercel/ncc build src/index.js

=== MUTANT: restore @vercel/ncc in BUNDLERS === moved=2
  none -> build   npx @vercel/ncc run src/index.js
  none -> build   @vercel/ncc build src/index.js
```

The deleted member decided both. The `build`-subcommand form IS covered by the unknown-binary rule, so
the stated reason is true of one of the three shapes and was generalised to all three.

**Suggestion.** Restore `"@vercel/ncc"` and add `"ncc"`, pinned on `npx @vercel/ncc run src/index.js` —
a case the unknown-binary rule provably cannot answer, which is the standard round 10 set for a member's
pinning case.

---

### M4 — the coordinate-model assertion's identity half is set-membership over every line, so it has no positional content: three mutations leave it green

**Artifact:** `packages/qfai/tests/assets/retractedClaims.test.ts:600-689`, specifically `:635-646`, where
`lines` is a `Set` of every flattened line in the file and the check is `if (!lines.has(slice))`. The claim
under test is the comment at `:612-613`: "the assertion is identity against the SOURCE, where a
one-character displacement is a different string".

**Severity:** Major. **Traces to:** `defect:code-quality` — a claim asserted over how the assertion is
written rather than over what it does, which is the recurring class the record's item 7 calls canonical.
This is a candidate **twelfth** entry for that list.

**Issue.** `lines` is the set of the flattened text of EVERY line in the file. So the check says "this
exempt span is *a* line", never "*the* line at this position". Any whole-line displacement satisfies it by
construction; only sub-line displacements are caught. The stated property holds for the character case and
not for the line case, and the docstring does not distinguish them.

**Measurement.** `tmp/r11-impl/mutRetracted.mjs` and `tmp/r11-impl/mutRetracted2.mjs`, three mutants of
`flattenDocument`, each reverted with a printed byte comparison:

| mutant | change | target assertion alone | whole file |
| --- | --- | --- | --- |
| J | exempt the PREVIOUS line's span, not this line's | **exit 0, green** | exit 1, caught by a sibling |
| K | two separators per line instead of one | **exit 0, green** | exit 1, caught by a sibling |
| L | exempt the fence DELIMITER line too, reverting `m3` | **exit 0, green** | exit 1, caught by a sibling |

```
=== BASELINE ===  [HEAD, unmutated]  exit=0   Tests  1 passed | 10 skipped (11)
=== MUTANT J ===  [span test only]   exit=0   Tests  1 passed | 10 skipped (11)
                  [WHOLE FILE]       exit=1   AssertionError: inside a fence: expected false to be true
=== MUTANT L ===  [WHOLE FILE]       exit=1   AssertionError: as a fence info string: expected true to be false
=== MUTANT K ===  [WHOLE FILE]       exit=1   AssertionError: an entry matching nothing ...
RESTORED bytes=39903 sha256:2077845323edbc89 identical=true
```

Mutant J is the answer to the brief's question: a fourth mutation the second version does not catch, and
it is a whole-line displacement of exactly the kind the identity check was written to make impossible.
Mutant L is stronger still — it reintroduces the `m3` laundering route this very commit closed, and this
assertion cannot see it.

The mitigation is real and I state it plainly: the FILE holds. All three are caught by a sibling test
("exempts what a fence shows and refuses what follows"). So this is not a live laundering route; it is a
guard weaker than its own docstring, inside the repair whose subject was that class.

**Suggestion.** Compare positionally rather than by set membership: build the exempt spans alongside a
parallel array of their source line index, and assert the slice equals that specific line's flattening.
Two lines, and it kills J outright.

---

### M5 — `command()` is 211 lines, four times the project's stated limit

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:784-994`.

**Severity:** Major. **Traces to:** `CLAUDE.md` Project Rules — "Keep functions focused; extract when a
function exceeds ~50 lines".

**Measurement.** Function-length scan over the four subject files (`tmp/r11-impl`, brace-matched at
column 0):

```
packages/qfai/tests/helpers/buildCommand.ts        function command(...)      211 lines (L784-L994)
packages/qfai/tests/helpers/shippedLaneCommands.ts function commandsOf(...)   64 lines (L77-L140)
scripts/check-atdd-annotation-ledger.mjs           collectTestSources(...)    73 lines (L102-L174)
scripts/check-atdd-annotation-ledger.mjs           main()                     57 lines (L256-L312)
```

`command()` carries at least six separable concerns: prefix and interpreter dispatch, grammar selection,
the flag loop, the bare-token loop, the script-resolution hand-off, and the post-loop `bareIsBuild`
decision. `B4` is a direct consequence of the last two being 130 lines apart: the reason the "before any
flag can matter" comment could be written and believed is that the reader cannot see line 992 from line
336.

**Suggestion.** Extract `selectGrammar(verb, ctx)`, `readFlag(...)` and `readBareToken(...)`. This is not
cosmetic here — it is the smallest change that makes `B4`'s ordering visible to a reader.

---

### m1 — jekyll's documented `b` alias is not a build, while cargo's identical alias is declared

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:337` (jekyll) against `:260-265` (cargo, whose
comment reads "`b` is cargo's own documented alias for `build`").

**Severity:** Minor. **Traces to:** `defect:correctness`.

**Measurement.** `tmp/r11-impl/mutate.mjs`:

```
=== BASELINE ===  none  jekyll b       (and: build  jekyll build)
=== MUTANT: restore jekyll b alias === moved=1
  none -> build   jekyll b
```

`jekyll b` is jekyll's own documented short form. **Suggestion.** `builds: ["b"]` on jekyll, pinned the
way cargo's is.

---

### m2 — `stops` is matched on the whole token while the adjacent generic rule reads the colon tail

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:945` (`if (stops.has(whole)) return "none";`)
against `:946` (`if (whole === "build" || verbTail === "build") return "build";`) and `:935`, where
`verbTail` is computed for exactly this purpose.

**Severity:** Minor, low confidence on impact. **Traces to:** `defect:code-quality`.

**Issue.** Two adjacent lines read two different tokens from the same computation. The only case that
distinguishes them is a colon-qualified stop, and I could not construct a real command for a
colon-qualified `cmake build` or `docker run`. So I report this as a consistency defect, not a
demonstrated miss. It becomes a real miss the first time a `stops` entry is declared for gradle or another
colon-qualifying tool, which is one line of future work away.

**Suggestion.** `if (stops.has(whole) || stops.has(verbTail)) return "none";`, or state in the comment why
the asymmetry is intended.

---

### m3 — a `Set` is constructed per token inside the `never` check

**Artifact:** `packages/qfai/tests/helpers/buildCommand.ts:840`:
`if (tokens.some((token) => new Set(tool?.never ?? []).has(token))) return "none";`

**Severity:** Minor. **Traces to:** `defect:code-quality`; `.github/instructions/principles.instructions.md`
(avoidable pessimization, and least astonishment against the six sibling lines).

**Issue.** Lines 832-839 hoist every other grammar set into a local. This one allocates a fresh `Set` per
token, and it is the only line in the block that does. `stops`, `builds`, `values` and `buildFlags` are
all hoisted two lines above it.

**Suggestion.** `const never = new Set(tool?.never ?? []);` beside line 838, then
`if (tokens.some((t) => never.has(t))) return "none";`.

Related residual, reported here rather than as a finding because I could not construct a real command for
it: this check runs over ALL tokens including flag values, so a tool whose flag value could legitimately
be one of its own never-flags would be mis-answered. The shapes that would trip make (`make -W -n build`,
`make -o -n all`) are not commands anyone writes, and wrapper flags are already stripped before this line
(`nice -n 10 make build` and `xargs -n 1 make build` both stay `build`, traced through `stripPrefix`).

---

### m4 — bare `as` assertion in a subject file

**Artifact:** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:133`:
`const code = (child.error as NodeJS.ErrnoException).code;`

**Severity:** Minor. **Traces to:** `CLAUDE.md` Project Rules — "TypeScript: avoid bare `as` type
assertions; prefer type narrowing". Pre-existing, not authored this round; reported because the rule is
live and the file is under review.

**Suggestion.** The repository already has the narrowing idiom for this exact shape:
`scripts/check-atdd-annotation-ledger.mjs:182-202` narrows an unknown error with
`typeof error === "object" && error !== null && "code" in error`. Use it, or a local `isErrnoException`
predicate.

---

### m5 — the ~50-line rule is cited in one function of `check-atdd-annotation-ledger.mjs` and not applied to the other two

**Artifact:** `scripts/check-atdd-annotation-ledger.mjs:211-213` ("Extracted from `main` because that
function was 83 lines against the ~50 the project rules set") against `collectTestSources` (73 lines,
`:102-174`) and `main` (57 lines, `:256-312`).

**Severity:** Minor. **Traces to:** `CLAUDE.md` Project Rules (~50 lines); measurement is the scan in
`M5`.

**Suggestion.** `collectTestSources` splits cleanly at "resolve and dedupe this directory" versus "read
its entries"; both halves come in under 40 lines.

---

### m6 — the two instruments disagree and nothing asserts their relationship

**Artifact:** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:448-536`, where the two
`US-0017-0004` assertions run independently, and `tests/unit/shippedLaneCommands.test.ts`, whose PLANTED
corpus is asserted only against `refusals`.

**Severity:** Minor. **Traces to:** `defect:code-quality`.

**Measurement.** From `probeB.mjs`, four commands where the two instruments give opposite answers:

```
ALLOWED by allowlist, cls=build   npm install esbuild
ALLOWED by allowlist, cls=build   pnpm install --filter tsup
refused by allowlist, cls=none    docker run --rm -v .:/w img make build
refused by allowlist, cls=none    docker exec ci make build
```

Each instrument covers a hole in the other, which is a good property — and it is nowhere written down or
asserted, so either could be narrowed without the loss being visible. The `refusals` corpus in particular
is never measured against `classifyBuildCommand`.

**Suggestion.** One assertion over the PLANTED corpus recording, per line, which of the two instruments
catches it. That makes the complementarity a measured fact rather than an accident, and it is the cheapest
defence against the next narrowing.

---

### m7 — one non-reproducible observation, reported rather than suppressed

In `tmp/r11-impl/plant4.mjs` run A, with a **build-free** third workflow planted, the two `US-0017-0004`
assertions FAILED (`Tests 3 failed | 7 passed`). Three subsequent runs of the identical mutant
(`plant6.mjs`) gave `1 failed | 9 passed` every time, with only `US-0017-0005` red, and a targeted
`-t US-0017-0004` run passed. The failure signature in run A matches the content of the PREVIOUS harness
step's workflow, which did contain a build, so the likeliest explanation is my own harness sequencing
rather than a defect in the subject.

**Severity:** Minor, low confidence. **Traces to:** `none` — advisory only; I cannot demonstrate this from
the changed artifacts.

I record it because the alternative explanation would be order-dependence in the memoized `project()`
fixture (`:60-79`), shared across ten tests in the file and torn down in `afterAll`. If anyone can
reproduce a `US-0017-0004` verdict that depends on which other tests ran, that is a real finding and this
is the only trace of it I have.

---

## What I could NOT refute, stated as measurements

The brief asked for a refutation of four deletions. Two survive, and the record should say so with the
same evidence I used for the two that did not.

1. **The nine `builds: ["build"]` deletions — SOUND.** Restoring `builds: ["build"]` on `next` moved
   **0 of 22** verdicts (`mutate.mjs`: `=== MUTANT: restore builds build on next === moved=0`). The
   structural argument also holds by inspection: `builds.has(whole)` at `:936` and `whole === "build"` at
   `:946` sit inside the same `tool !== undefined` guard, with only `buildPrefixes` and `stops` between
   them, and none of the nine declares `stops`. **Residual:** the equivalence is conditional on no tool
   declaring `stops: ["build"]` — and cmake does. If a `builds: ["build"]` is ever added to a tool that
   also stops on `build`, the entry dies silently. Worth one sentence at `:323-326`.
2. **tox's `stops: ["--version"]` — SOUND, and dead for a second reason the commit message does not give.**
   Restoring it moved **0 of 22** (`=== MUTANT: restore tox stops --version === moved=0`). `--version` is
   in `NEVER_FLAGS` (`:485`), checked at `:787` — but more fundamentally `stops` is consulted only at
   `:945`, inside the non-flag branch, so a token beginning with `-` can never reach it at all. The entry
   was unobservable regardless of `NEVER_FLAGS`.
3. **The `stops`-before-generic-verb ordering — I found no real build it now misses.** The change can only
   matter for a token that is both in a tool's `stops` and equal to `build` or to its colon tail, and
   cmake's `build` is the only such member. Measured: `cmake build` -> `none` (intended; it configures
   `./build` as a source directory), `cmake --build .` -> `build`, `docker run ...` and `docker exec ...`
   -> `none` both before and after, because the generic rule only ever fires on the literal `build`.
   Reported as not reproducible.
4. **make's `never` list carried as a value rather than a flag — I found no real build.** See the residual
   note in `m3` for the reasoning and the two traced counter-examples.

Two further checks the brief asked for, both clean at my HEAD:

- **`shippedJobs()` reads what `qfai init` emits, not a fixture.** It resolves
  `path.join(await project(), ".github", "workflows")`, where `project()` runs `runInit` into a temp dir
  (`:63-70`, `:180-193`), and `plant3.mjs` confirmed that a file added to
  `assets/init/root/.github/workflows/` becomes visible to it and correctly turns both `US-0017-0004`
  assertions red when it carries a build. The round 10 fix works; `B3` is that two siblings did not get it.
- **The derived-count guards pass at `4b58eadd`.**
  `tests/assets/stageEvidenceCounts.test.ts`, `coverageDepthMatrix.test.ts`, `retractedClaims.test.ts` and
  `reviewerRoundBudget.test.ts`: `Test Files 4 passed (4) / Tests 46 passed (46)`. The response count is
  derived by counting files matching the `R0N_*.md` pattern per pack
  (`stageEvidenceCounts.test.ts:365-373`), so round 11's pack contributing zero responses is why the
  numbers are currently consistent. This report landing will move them, which is the sealing step's
  obligation and not a defect.

## Required gates before this stage can pass

1. `B1`, `B2` — `refusals()` must refuse the six shapes `plant.mjs` planted, and `plant.mjs` itself is
   reusable as the falsification. Those shapes belong in the REFUSED-direction corpus of
   `tests/unit/shippedLaneCommands.test.ts`, which today contains no `git`, no backtick and no process
   substitution.
2. `B3` — `US-0017-0002` and `US-0017-0003` must read the derived workflow set, each pinned with
   `plant6.mjs`'s third workflow.
3. `B4` — the `bareIsBuild` / `sawBare` interaction must be corrected, or the comment at `:333-336`
   withdrawn; the 13 wrong verdicts in `probeC.mjs` are the measurement to close against.
4. `M1`-`M3` closed, or explicitly deferred with a recorded reason.
5. Re-run: `--project unit tests/unit/buildCommand.test.ts tests/unit/shippedLaneCommands.test.ts`;
   `--project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts tests/assets/`;
   `--project integration tests/integration/shippedWorkflow*.test.ts`;
   `--project scripts tests/scripts/workflowHygiene.test.ts tests/scripts/ownWorkflowTopology.test.ts`.

## Residual implementation risks

- **The allowlist has one oracle, and it is still its own test file.** After `B1` and `B2` are fixed it
  will have been falsified once, by me. The design argument — an allowlist fails closed — is sound; the
  IMPLEMENTATION of it fails **open** wherever the parser cannot read a construct, because `invocationOf`
  returns `undefined` for "unreadable" and `refusals()` reads `undefined` as consent. That is a structural
  property of the current code, not a list-membership question, and it will keep producing findings of
  this shape until unreadable input is refused rather than skipped.
- **`HARMLESS_PROGRAMS` needs a stated criterion.** "Cannot reach a build whatever their arguments" is
  false for `git` (`B1`), and `read` and `grep` pass it only because process substitution is a shell
  feature rather than a program feature (`B2`). The honest criterion is "cannot execute another program,
  given that the scanner enters every substitution form" — and the second clause is a precondition the
  code does not currently meet.
- **`US-0017-0007` remains uncovered and `TDD-0069` / `TDD-0070` remain `todo`.** Unchanged by this review
  and outside my domain; noted so the stage verdict is not read as contradicting the skill's own
  Definition of Done.

## Advisory / Change Request proposals

None. Every finding above except `m7` is demonstrated from the changed artifacts and traces to a
`defect:*` class or to a named `AC-*` / `CLAUDE.md` rule, so none of them is reviewer-originated scope.
`m7` is advisory and explicitly `Traces to: none`.
