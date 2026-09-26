# CLI Contract: `qfai prototyping`

- Contract scope: public CLI surface backing the `/qfai-prototyping` skill
- Owning flow: `BF-0001`
- Used-by: `/qfai-prototyping` and the prototyping validation lane
- SSOT modules:
  - `packages/qfai/src/cli/commands/prototypingIterate.ts`
  - `packages/qfai/src/cli/commands/prototypingCertify.ts`
  - `packages/qfai/src/core/prototyping/iteration.ts` (cycle SSOT)
  - `packages/qfai/src/core/prototyping/specResolution.ts` (`resolveAllUiBearingSpecs()`)
  - `packages/qfai/src/core/prototyping/specsCovered.ts` (`readUiContractsCovered()`)
  - `packages/qfai/src/core/prototyping/licenseVerify.ts` (license-class gate)

## Public sub-commands

Only these four sub-commands are part of the stable public surface. The
parent `qfai prototyping` token is not itself an orchestration command;
dispatch must go through one of the sub-commands.

### `qfai prototyping iterate --cycle <0..9>`

One cycle of the prototype loop. Cycle 0 requires `--target-url`, freezes the
hash of root `DESIGN.md`, the UI contract set, the license catalog, and the
target URL in `.qfai/evidence/prototyping/prototyping.json`. The root
`DESIGN.md` lock under `<paths.contractsDir>/design/` governs the frozen
design state, including the accepted major hash and patch-zone hash.

The UI-bearing set consists of YAML or YML files under
`<contractsDir>/ui/` that declare one full `CON-UI-NNNN` ID and at least
one `screens[]` entry. `--primary-ui-contract CON-UI-NNNN` overrides
`prototyping.primaryUiContract`; both require the full ID. The primary
contract selects the initial prototype context. Every UI-bearing contract
and its declared screens must be reviewed for convergence.

Cycle 0 writes `uiContractsCovered[]` and `frozenSurfaceUnion[]` with
the complete UI-bearing set. Cycle ≥ 1 requires both fields to be
well-formed, canonical, and equal to the live UI-bearing set. Missing
fields or scope drift exit 2 and require a cycle-0 re-seed. Root
`DESIGN.md`, its lock, and the frozen license catalog are also checked
for drift.

Each cycle writes `iter-NN/iterate-plan.json` and review payloads at
`iter-NN/CON-UI-NNNN/<screen>.review.json`. Convergence requires the
four ordinal UX scores to be `exceptional` and `blockingFindings[]`,
`layoutAntiPatternsDetected[]`, and `designMdViolations[]` to be empty
for every contract and screen pair. The cycle summary records the scores;
the per-screen payload records the bounded impressions and findings used
in the review.

The cycle that ends the loop, the convergence stop (exit 64) or the budget
stop (exit 65), writes `<paths.contractsDir>/design/design-system.yaml`
before it exits. The file copies the token tables of the root `DESIGN.md`
that invocation read, with that file's sha256, and the same `DESIGN.md`
always gives the same bytes. No earlier cycle writes it.

- A `DESIGN.md` that cannot be read or parsed exits 2 before the stop is
  evaluated, and nothing is written. So does a lock that is malformed,
  unreadable, or differs from `DESIGN.md`.
- A missing lock does not stop the write. The recorded sha256 is that of
  the `DESIGN.md` copied, which equals the lock's whenever a lock exists.
- A failed write is a runtime error, exit 1.

| Exit | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| 0    | Continue or cycle-0 no-op when no UI-bearing contract exists.             |
| 2    | Invalid input, missing state, or frozen scope / design / license drift.   |
| 64   | Converged, or reviewer Playwright hard stop. Inspect the recorded status. |
| 65   | Ten-cycle budget exhausted.                                               |
| 66   | License verification failed.                                              |

### `qfai prototyping certify [--check]`

Certify requires a canonical `uiContractsCovered[]`, an equal
`frozenSurfaceUnion[]`, and a live UI-bearing set equal to both. It
requires a valid, converged payload for every frozen contract and
declared screen at the accepted iteration. A missing, malformed, or
identity-mismatched payload exits 64. Missing or malformed state exits 2.
The accepted iteration also needs the expected HTML evidence and a
passing validate, verify, and reviewer gate.

Write mode emits `completion-certificate.json`, including
`uiContractsCovered[]`, `convergedUiContracts[]`, and
`laggingUiContracts[]`. `--check` verifies the existing certificate
and sealed evidence without writing; exit 0 is the completion signal.
License verification belongs to iterate, not certify.

### `qfai prototyping show-ui-contract`

Reads the frozen state and live UI contract inventory. Missing or
legacy state exits 2. JSON output contains `uiContractsCovered[]`,
`frozenSurfaceUnion[]`, `liveUiBearing[]`, and an optional
`primary: { uiContractId, contractPath, source }`.

### `qfai prototyping rescope --remove CON-UI-NNNN --reason <id>`

Retires only a frozen UI contract that is no longer live. The command
updates both frozen arrays, records the reason, and preserves earlier
review evidence. It refuses a live contract or a noncanonical ID.

## Review payload

The closed review schema requires the full `uiContractId`,
`screenId`, and `cycle` that match its path and accepted iteration.
Each `designMdViolations[]` item has a `kind` of `color`, `font`,
`radius`, or `shadow`, plus a string `found`; additional fields
are allowed. `findDesignMdViolations(html, designMd)` is pure and
deterministic: it reads no filesystem, process state, clock, or network.
Non-empty violation arrays block convergence.

## Determinism

The CLI uses the frozen design, scope, and license records as the loop
baseline. On drift it exits 2 with a cycle-0 re-seed instruction. It
does not infer current scope from historical spec packs or marker titles.

## Capture and serve flags

The capture and serve flags are opt-in under
`decisions.md#DEC-0199`. Without either flag, the reviewer writes the
per-screen review payload and iterate neither captures screenshots and
HTML nor starts a server.

### `--capture`

When passed, `iterate` drives Playwright per the Capture contract block
emitted into `iter-NN/iterate-plan.json` and writes per-screen artifacts
for every entry in the spec's UI contract `screens[]`.

Per-screen capture contract block (emitted at cycle 0 freeze; one entry
per `screens[].id`):

```yaml
capture:
  <screen-id>: # snake_case per DR-0001-0007 (OQ-0110=A)
    viewport:
      width: integer # device-pixel CSS viewport width
      height: integer # device-pixel CSS viewport height
    deviceScaleFactor: number # Playwright deviceScaleFactor; typically 1 or 2
    waitUntil: enum # Playwright waitUntil: "load" | "domcontentloaded" | "networkidle" | "commit"
    htmlSourceCopy: boolean # true → copy source HTML; false → page.content()
```

Output paths (written when `--capture` is passed):

- `iter-NN/<screen-id>.png` — full-page screenshot at the configured
  viewport / deviceScaleFactor. Always written when `--capture` is on.
- `iter-NN/<screen-id>.html` — HTML snapshot. When
  `htmlSourceCopy: true`, the source HTML is copied byte-for-byte from
  `.qfai/prototypes/iter-NN/<screen-id>.html` (the iterate-emitted
  source) rather than calling `page.content()`. This avoids the runtime
  style-block injection that Playwright would otherwise serialize into
  the captured HTML.

Capture failures surface via the iterate command itself rather than
through layout anti-pattern codes: when the default
`runCapturePath` runner cannot complete (Playwright not installed,
navigation timeout, screenshot write failure, etc.) iterate exits `2`
with the operator-actionable reason on stderr. The implemented
advisory band is `lap-009` (md5 duplicate, REQ-0124) and `lap-010`
(missing route, REQ-0124); both are advisory-failing per DR-0001-0006
and counted in `layoutAntiPatternsDetected[]`. A further code is added by
declaring it in the registry, which is what the validator reads; no
identifier is reserved ahead of an entry that detects something.

These two are computed by the capture pass rather than judged by the
reviewer, and they are declared in the same `lap-*` registry as the
codes the reviewer judges. That array has one vocabulary: a code in it
that no registry entry declares is `QFAI-PROT-002`, whichever writer
put it there. A new advisory code is therefore registered at the same
time it is emitted.

### `--auto-serve`

When passed, `iterate` manages a local HTTP server lifecycle bound to
the configured port (or the port derived from `targetUrl`) for the
duration of the cycle. **Default port: `4321`** (override by passing
`--target-url <url>:<port>` with an explicit port component, or by
supplying a custom `serverRunner` via the DI escape hatch below).
4321 was picked because it does not collide with common dev-server
defaults (Vite 5173, Next 3000, Vue CLI 8080, webpack-dev-server 9000,
Storybook 6006). The SSOT for the literal is
`DEFAULT_AUTO_SERVE_PORT` in `defaultServerRunner.ts`.
The **default runner** (`defaultServerRunner.ts`)
is an in-process `node:http` server — there is no subprocess spawn:

- **Start** — iterate creates a `node:http` server before the first
  Playwright navigation; the server roots at the project's prototype
  tree with a path-traversal guard.
- **Teardown** — on SIGINT (and on normal cycle completion), iterate
  calls `server.close()` with a 2-second bound, then exits. Because
  there is no child process, `tree-kill` / `taskkill /F /T` are not
  used by the default runner.
- **Foreign-process safety (NFR-0106)** — if `listen()` fails with
  `EADDRINUSE`, iterate MUST NOT attempt to kill the owning process.
  Iterate refuses to attach to the foreign owner, surfaces the
  offending PID + owning command line (from `/proc` on Linux,
  `ps -o command=` on macOS, `Get-Process | Select-Object Id, Path,
CommandLine` on Windows) to the operator, and exits `2` with a
  recovery hint to either free the port manually or change the
  configured port.

#### DI escape hatch (programmatic consumers only)

Operators that need subprocess-spawn semantics — spawning an external
dev server (`vite`, `next dev`, `python -m http.server`, etc.) and
tearing it down with `tree-kill` (Linux/macOS) or `taskkill /F /T`
(Windows) — supply their own runner via the `options.serverRunner`
DI surface on `runPrototypingIterate(...)`. Custom runners are
responsible for their own process-tree management and SIGINT
teardown semantics; the CLI does not ship a subprocess-spawn default.

The default (absence of `--auto-serve`) preserves the cycle-0 contract
that the operator manages serving externally (e.g. via the
orchestrator script). Existing orchestrator-managed flows are not
broken.

### Combined `--capture --auto-serve`

Both flags compose: iterate starts the in-process `node:http` server,
drives capture against it, and tears down the server via
`server.close()` before exit. The PNG / HTML artifacts above are
written.

## prototyping.json Schema (v1.9.1+)

REQ-0111 makes `prototyping.json` validate-conformant without
orchestrator post-processing. The `iterations[i]` block and the
convergence-time top-level fields are specified below.

### `iterations[i]` required fields (per-cycle)

```yaml
iterations:
  - cycle: integer # 0..9
    commitSha:
      string
      # repo HEAD commit at iter emit time, OR the sentinel
      # "uncommitted" when no HEAD commit is applicable
      # (clean workspace before any commit, detached state,
      # CI ephemeral checkout where HEAD is rewritten, etc.).
      # Validators MUST accept "uncommitted" as canonical
      # and MUST NOT fail prototyping-profile validate on it.
    proseCritique: string # non-empty; reviewer-emitted prose summary
    scores: # ordinal axes per DR-0012-0012 (preserved)
      informationArchitecture: enum [weak, acceptable, strong, exceptional]
      navigationFlow: enum [weak, acceptable, strong, exceptional]
      usability: enum [weak, acceptable, strong, exceptional]
      functionality: enum [weak, acceptable, strong, exceptional]
    layoutAntiPatternsDetected: string[] # ids the lap-* registry declares; empty required for convergence
    designMdViolations: object[] # findDesignMdViolations() output; empty required for convergence
    pivotDirective: string # reviewer's next-cycle directive; empty allowed only at converged-cycle
    reviewerId:
      string
      # resolved reviewer sub-agent identity; placeholder
      # values "qfai" / "default" / "auto" / "system" /
      # "unknown" / "" are rejected per DR-0201 (preserved).
    evidenceRefs: # one entry per evidence artifact at this iter
      - kind: enum [screenshot, html]
        path:
          string
          # POSIX-form relative path under
          # .qfai/evidence/prototyping/, e.g.
          # "iter-NN/<screen-id>.png" or
          # "iter-NN/<screen-id>.html". `<screen-id>` MUST be
          # the underscore-normalized form per DR-0001-0007
          # (OQ-0110=A).
```

When `--capture` is **not** passed for an iteration, `evidenceRefs[]`
MAY be empty for that iteration (DR-0012-0029 default preserved).
When `--capture` IS passed, `evidenceRefs[]` MUST contain at least one
`kind: screenshot` entry per `screens[].id` (and a `kind: html` entry
when `htmlSourceCopy: true` for that screen).

### Convergence-time top-level fields

On convergence (exit 64), `iterate` MUST set on the top-level
`prototyping.json` record:

```yaml
acceptedIterationIndex: integer # 0..9; index into iterations[]
stopReason: enum
  - converged # every (spec,screen) pair has all three finding arrays empty
  - max-iterations # exit 65 path (budget exhausted without convergence)
  - license-verify-fail # exit 66 path
  - input-error # exit 2 path
```

`qfai validate --profile prototyping --fail-on error` MUST PASS on a
converged-iterate output WITHOUT orchestrator post-processing. This is
the machine-checkable acceptance signal for REQ-0111.

### Screen-id casing (OQ-0110=A, end-to-end underscore)

Per DR-0001-0007, `screens[].id` is **snake_case** (underscore-separated)
end-to-end:

- UI contract authoring (`primary_tasks` slot per REQ-0115) uses
  underscore form.
- Iterate emit (`iter-NN/<screen-id>.{png,html,review.json}`) uses
  underscore form.
- Validator expectation matches underscore form.
- Aggregate-dir mirror on convergence
  (`.qfai/evidence/prototyping/screenshots/<screen-id>.png` and
  `.qfai/evidence/prototyping/html/<screen-id>.html`) uses underscore
  form.
- The `evidenceRefs[].path` field uses underscore form.

Existing hyphen-form iter outputs are accepted during the deprecation
window (`D-DEPRECATED-PATH` warning); sunset is qfai 1.10.0 per
`package.json#version`.

## UI contract evidence and migration

The canonical review directory is
`.qfai/evidence/prototyping/iter-NN/CON-UI-NNNN/`. Screen IDs retain
the declared underscore form. The primary UI contract and frozen set
use full IDs; bare numbers and `spec-NNNN` are invalid current IDs.

A `prototyping.json` with `specsCovered` or
`frozenSpecsCovered`, or without `uiContractsCovered`, exits 2 on
iterate cycle ≥ 1, certify, and show-ui-contract. Cycle 0 re-seeds the
record. Historical `iter-NN/spec-NNNN/` evidence is retained as an
archive and is excluded from current review coverage.

The design lock resides at
`<contractsDir>/design/DESIGN.md.lock.yaml`. With the standard
configuration, this is
`.qfai/spec/03_contract/design/DESIGN.md.lock.yaml`.
The auto-served prototype resides in `.qfai/prototype/iter-NN/`.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Examples                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-0127 | `qfai prototyping certify` reads `validate-prototyping.json` for its profile gate; a newer tdd-profile `validate.json` pointer is not a prototyping pass. Certify does not silently rerun validate. At or after the announced 1.10.0 sunset, legacy `.qfai/output/validate.json` is not written and `D-DEPRECATED-PATH` is an error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0049-03, EX-0001-0049-04                                                    |
| BR-0255 | Skill-First Interface - `/qfai-prototyping` is the active interface. - `qfai prototyping` is not an active public orchestration command; its public sub-commands are `preflight`, `iterate`, `certify`, `show-ui-contract` and `rescope`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0125-02                                                                     |
| BR-0256 | The delegation map must name owners for implementation, review scoring, and build. An opt-in `--capture` run also names capture responsibility. The default reviewer-driven run has no fixed third capture identity. Invalid assignments produce a delegation finding; one in the planning record is reported at planning, before any role is dispatched. Execution planning records `targetIterations`, `evaluationAxesSource`, `delegationMap` and `plannedAt` before the first review.                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0100-01, EX-0001-0102-02, EX-0001-0102-01                                   |
| BR-0257 | Before scoring, the reviewer receives the live prototype, root `DESIGN.md`, prior review context, and the layout anti-pattern catalog. PNG and HTML snapshots are additional inputs only when opt-in `--capture` produced them. A finding names any missing mandatory input. The reviewer checks the prototype against every category root `DESIGN.md` declares and names each mismatch in a finding or in `designMdViolations[]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0105-01, EX-0001-0106-01                                                    |
| BR-0258 | Validate Gate - `qfai validate --fail-on error` is the machine gate for schema/evidence integrity. - Validate does not replace human/sub-agent evaluation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0101-01                                                                     |
| BR-0259 | Verify Gate - `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings. - Completion is blocked on `REVISE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0101-02                                                                     |
| BR-0260 | Non-UI Exclusion - On the story tree, only a UI contract declaring a `CON-UI-NNNN` ID and a `screens[]` entry is UI-bearing. No spec-level marker is read. - Validate must not over-fire UI evidence rules for non-UI work or an incomplete UI contract file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0118-01                                                                     |
| BR-0261 | A convergence-mode run accepts its latest convergence iteration. An earlier iteration with higher ordinal scores does not replace it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0109-01                                                                     |
| BR-0262 | Layout-Anti-Pattern Catalog and IA Cap - `layoutAntiPatternsDetected[]` entries MUST be identifiers declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`. The capture pass writes into the same array, so the declared set covers what the reviewer judges and what the tool computes alike. - Detection caps `informationArchitecture` at `acceptable`. Higher score raises `QFAI-PROT-021`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0111-01, EX-0001-0111-02                                                    |
| BR-0263 | The reviewer writes `pivotDirective` by the rule the shipped reviewer prompt states. With `open(r)` the number of `blockingFindings` plus `layoutAntiPatternsDetected` in review `r`, it is `pivot` when `open(latest) > 0`, `open(latest) >= open(prior)` and `open(prior) >= open(prior2)`; otherwise `continue` when a prior review exists and `open(latest) < open(prior)`; otherwise `refine`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0108-02, EX-0001-0108-03, EX-0001-0108-04                                   |
| BR-0264 | UX score scale - Each UX axis score is one of `weak`, `acceptable`, `strong` or `exceptional`, and any other value is rejected. The scale carries no ordinal index.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0108-01                                                                     |
| BR-0265 | At dispatch, generation and review must use distinct sub-agent identities. Reusing one identity for both raises a delegation finding. This enforces the role separation declared by BR-0256 without reinstating a fixed third capture identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0100-02                                                                     |
| BR-0266 | Cycle 0 records the root `DESIGN.md` SHA and checks it against the design lock. At cycle 1 or later, when no lock exists or the lock matches the live file, a live SHA that differs from the cycle-0 record exits 2 before new review evidence is written and instructs a cycle-0 re-seed. At every cycle, cycle 0 included, a root `DESIGN.md` whose SHA differs from `DESIGN.md.lock.yaml#designMdSha256` exits 2 naming both digests and writes no seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0115-01, EX-0001-0114-01, EX-0001-0114-02                                   |
| BR-0267 | design-system Mirror - `qfai prototyping iterate` writes `<paths.contractsDir>/design/design-system.yaml` on the cycle that ends the loop (exit 64 or 65) as a deterministic byte-equivalent mirror of root `DESIGN.md` token tables (color / typography / radius / shadow, plus spacing, the typography scale and weight, and `brand.theme` when `DESIGN.md` has them), recording `source: DESIGN.md` and that file's sha256. It is NOT extracted from the final iter HTML, and no earlier cycle writes it. - A mirror value that differs from DESIGN.md raises `QFAI-DCON-005`, and a DESIGN.md that differs from its lock raises `QFAI-DCON-032` (validator owned by the qfai-validate spec).                                                                                                                                                                                                                | EX-0001-0117-01                                                                     |
| BR-0268 | One /qfai-prototyping invocation resolves every UI-bearing UI contract under <paths.contractsDir>/ui/. A contract is UI-bearing only when it declares a full CON-UI-NNNN ID and non-empty screens[]. The invocation does not prompt for a primary spec or use a spec-level marker. Zero UI-bearing contracts is a deterministic cycle-0 no-op with exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0118-05, EX-0001-0118-06                                                    |
| BR-0269 | `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` in `core/prototyping/iteration.ts` are the iteration budget authority. A non-converged run terminates at cycle 9; validators reject an out-of-range index or inconsistent recorded count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0127-01, EX-0001-0127-02, EX-0001-0127-03, EX-0001-0127-04, EX-0001-0107-01 |
| BR-0276 | Certify reads the cycle-0 frozen `uiContractsCovered[]` and requires an accepted-iteration review payload for every screen in every covered UI contract. A missing pair exits 64 and is named in the failure, and contract IDs are validated before review paths are built.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0124-04, EX-0001-0122-03, EX-0001-0124-03                                   |
| BR-0277 | Menu reachability is qualitative (not hard-fail) - The Reviewer SHOULD exercise every primary menu entry point declared by the spec (by the UI contract on the story tree) at least once during its Playwright session. - Findings surface in `menuReachabilityFeel`; unreachable entries are qualitative critique only and do NOT hard-fail the cycle. Menu reachability is a sub-criterion of `navigationFlow` (OQ-0007 Option A), not a 5th axis.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0120-05                                                                     |
| BR-0280 | Cycle 0 freezes the complete UI contract set in `uiContractsCovered[]` and the accepted stock-photo license catalog in cycle-0 evidence. Subsequent cycles use those frozen values for scope, aggregation, and license verification. At cycle 1 or later, a missing `prototyping.json#frozenLicenseCatalog`, or one that differs from the shipped default catalog other than by order, exits 2 with a re-seed instruction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0125-05, EX-0001-0126-01, EX-0001-0122-02                                   |
| BR-0281 | Tailwind allowlist + body-scope (SSOT-sync invariant) - `findDesignMdViolations` MUST apply the OQ-0103 compound remedy = β (preflight literal allowlist) + γ (gate scope narrowed to `<body>` only). - The shipped `generator-prompt.md` Tailwind contract clause and the scanner's allowlist constants form a single SSOT pair; every change to one MUST ship with a matching change to the other (Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` severity: error on violation). - NFR-0102 (3-cycle convergence p95 on canonical fixture pack) is enforced by the integration test in `tests/integration/prototyping/tailwindContractConvergence.test.ts`.                                                                                                                                                                                                                                                   | EX-0001-0128-01, EX-0001-0116-01, EX-0001-0116-02                                   |
| BR-0282 | `var()` unwrap parity across scanners - `scanFonts`, `scanRadius`, `scanShadow` MUST call `unwrapVarReference(declarationValue, rootDeclarations)` with the identical signature `scanColors` uses. - Unit tests MUST exercise the canonical `:root` fixture in `tests/unit/core/prototyping/scanners/unwrapVar.test.ts` for all three scanners. - NFR-0110 floor: scanner unit-testability ≥ 30 unit tests; ≥ 90% statement coverage on the scanner module.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0129-01                                                                     |
| BR-0283 | SAFE_LITERALS includes CSS-wide keywords - `SAFE_LITERALS` (consumed by all four scanners) MUST include `inherit`, `initial`, `unset`, `revert`, `currentColor`. - The 5×4 keyword × scanner pass matrix MUST be exercised in unit tests; failures MUST emit explicit assertion text naming the cell.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0130-01                                                                     |
| BR-0284 | `--*-shadow*:` declaration strip (OQ-0104 Option B) - `SHADOW_DECL_STRIP_RE` MUST match the broader `--*-shadow*:` pattern (any custom property whose name contains `shadow`) when the value contains `rgba()` / `rgb()` literals. - The strip MUST execute BEFORE `scanColors` evaluates the input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0131-01                                                                     |
| BR-0285 | proseCritique cap, unit selected by the text - QFAI-PROT-002 MUST select the unit from the text: CJK present is measured in CJK characters, anything else in whitespace-separated words. Only the selected unit's cap applies. - The rule is a cap. Neither unit carries a lower bound, so a critique of any length up to its cap passes. - Selecting the unit rather than accepting whichever fits is what keeps the cap a cap: an English critique carries no CJK characters, so a rule passing on either unit would pass every English text however long. - Error text over the cap MUST name (a) the count form measured (words or characters), (b) the cap, (c) the actual count.                                                                                                                                                                                                                          | EX-0001-0132-01                                                                     |
| BR-0286 | `browserTool` config compatibility window - `prototyping.execution.browserTool` MUST accept `"playwright"` (primary) AND `"playwright-cli"` (deprecation window). - Documented default in shipped `assets/init/qfai.config.example.yaml` MUST be `"playwright"`. - `"playwright-cli"` MUST emit `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset; sunset version named in the migration memo per REQ-0127).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0133-01                                                                     |
| BR-0290 | Self-completable certify via `verify.json#scope` (OQ-0107 Option B) - `verify.json` MUST carry a `scope: "prototyping" \| "atdd" \| "full"` field. - `qfai prototyping certify --check` MUST accept `scope: "prototyping"` as satisfying the prototyping-phase gate WITHOUT requiring `/qfai-atdd` or `/qfai-implement` artifacts. - `completion-certificate.json` MUST explicitly record `scope: "prototyping"` and MUST NOT claim full DONE. - Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity: error) fires when a future PR reintroduces the cycle "certify requires full verify PASS AND full verify requires ATDD/implement artifacts".                                                                                                                                                                                                                                                               | EX-0001-0137-01                                                                     |
| BR-0291 | Single-spec public skill surface (OQ-0108 Option A) - `resolveSurfaceUnion()` MUST NOT appear on the public skill surface; it remains internal-only for the cycle ≥ 1 drift gate. - `SKILL.md` MUST use single-spec language. - Documentation lint MUST verify zero remaining multi-spec public-surface mentions at HEAD. - On the story tree `SKILL.md` MUST name the UI contract (`CON-UI-NNNN`) as the unit rather than the spec.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0138-01                                                                     |
| BR-0295 | `primaryUiContract` pin: full ID only - On the story tree the pin is the `prototyping.primaryUiContract` config key or the `--primary-ui-contract` flag, and the flag takes precedence. Both MUST accept only the full `CON-UI-NNNN` form: any other input, a bare `NNNN` included, is exit 2 with an error naming the `CON-UI-NNNN` shape and the input received. No input is normalised.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0142-01                                                                     |
| BR-0301 | A `DESIGN.md` patch zone identifies editable tokens or ranges. An in-zone edit updates `patchHash` without changing `majorHash` or invalidating evidence; an out-of-zone edit or removal of the zone invalidates evidence and emits warning `R-DESIGN-MD-PATCH-OUT-OF-ZONE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0148-01, EX-0001-0148-02                                                    |
| BR-0302 | `--mode` overrides `qfai.config.yaml#prototyping.mode`, whose default is `convergence`. The selected mode is recorded for each iteration. Exploration relaxes score and design-compliance errors to warnings while schema and license gates remain hard errors; only convergence iterations may be accepted, and certify rejects an exploration iteration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0149-01, EX-0001-0149-02                                                    |
| BR-0303 | `QFAI-CRIT-009` names each required `taskFidelity` keyword and its document section. The shipped evidence guidance lists the same keywords, and `iterate --capture` emits a template with each required keyword as a placeholder.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0150-01, EX-0001-0150-02                                                    |
| BR-0336 | - `qfai prototyping certify --scope saas-package` MUST seal `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field naming every skipped gate (the ATDD / implement-class gates skipped by the SaaS-package validate profile, REQ-0166 validate side in spec-0004). - The SaaS-package certificate MUST NOT claim full DONE; any field that would assert full completion MUST be withheld or set to the `saas-package` scope value. - `--upgrade-scope full` MUST be rejected while any gate named in `notes:` is still missing, and MUST be permitted to upgrade the sealed certificate to full scope only after every previously-skipped gate PASSes. - This `--scope saas-package` delivery mode MUST be documented in `/qfai-prototyping` SKILL.md as a SaaS-tenant delivery mode (DCON-005 design-system attestation reference; one-minor deprecation window per OC-63). | EX-0001-0166-01                                                                     |
| BR-0518 | The shipped reviewer prompt uses the four fixed ordinal UX axes in the per-cycle summary: information architecture, navigation flow, usability, and functionality. It follows the closed per-screen review payload schema for six bounded impressions and blocking findings, and the screen payload carries no axis rating; no weighted visual score or AC-pass percentage decides convergence; no discussion-pack rubric defines these fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0085-01, EX-0001-0110-01                                                    |
| BR-0519 | The shipped reviewer prompt includes a concrete actionable critique and a contrasting overly lenient critique. The actionable case identifies the screen, observed defect, correction, and blocking finding; a favorable score or vague praise cannot replace that finding. No calibration sidecar is emitted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0086-01                                                                     |
| BR-0725 | The entry check and worker behaviour of `/qfai-prototyping` follow `.qfai/spec/03_contract/cli/qfai-workflow.md#hoststage-skill-handover`, and its `SKILL.md` cites `references/orchestrated-mode.md` with one line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0211-01                                                                     |
| BR-0726 | The Operations table in `references/orchestrated-mode.md` of `/qfai-prototyping` lists exactly the operations `.qfai/spec/03_contract/cli/workflow-files.md#vocabulary` assigns to `qfai-prototyping`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0211-02                                                                     |
| BR-0727 | Under a work order, `/qfai-prototyping` works only on the UI-bearing contracts (BR-0260) that serve the business flow the work order's `target` binds (`.qfai/spec/03_contract/cli/qfai-workflow.md#work-order`); a contract serves a flow when one of its rules cites an example of one of that flow's stories. It settles the one visual decision the plan needs within the existing root `DESIGN.md` and those contracts, changes no UI contract that serves only another flow, and creates no contract. A standalone invocation still resolves every UI-bearing contract (BR-0268).                                                                                                                                                                                                                                                                                                                         | EX-0001-0211-03                                                                     |
| BR-0728 | When no UI-bearing contract serves the flow a prototype work order binds, `/qfai-prototyping` writes nothing, neither a `DESIGN.md`, a UI contract nor a surface declaration, and returns outcome `blocked` with one `debts` entry naming the missing UI surface, with `owningFlow` the bound flow and `resolvingOwner` `operator` (`.qfai/spec/03_contract/cli/qfai-workflow.md#stage-result`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0211-04                                                                     |
