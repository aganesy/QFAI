# evidence

## Purpose

Evidence files record what was actually executed and observed.
`packages/qfai` treats prototyping as a Playwright CLI + AI evaluator harness with unified obligations across all modes (spec-0012).

## Prototyping artifacts

Round-scoped artifacts (for each round `<rN>`):

- `.qfai/evidence/prototyping/rounds/<rN>/command-plans.json` — candidate-aware Playwright CLI command plans
- `.qfai/evidence/prototyping/rounds/<rN>/review-bundle.json` — evaluator input bundle
- `.qfai/evidence/prototyping/rounds/<rN>/evaluator-reviews/<candidate-id>.json` — evaluator output per candidate
- `.qfai/evidence/prototyping/rounds/<rN>/harvest.json` — harvest template for `r5|r3|r2`
- `.qfai/evidence/prototyping/rounds/<rN>/narrow-decision.json` — survivor decision for `r5|r3|r2`
- `.qfai/evidence/prototyping/rounds/<rN>/absorption-plan.json` — absorption plan for `r3|r2|r1`
- `.qfai/evidence/prototyping/rounds/<rN>/reimplementation.json` — reimplementation record for `r3|r2|r1`
- `.qfai/evidence/prototyping/rounds/<rN>/candidates/<candidate-id>/<screen-id>.png` — screenshot per declared screen
- `.qfai/evidence/prototyping/rounds/<rN>/candidates/<candidate-id>/<screen-id>.html` — HTML snapshot per declared screen
- `.qfai/evidence/prototyping/rounds/<rN>/candidates/<candidate-id>/<screen-id>.snapshot.txt` — accessibility snapshot per declared screen
- `.qfai/evidence/prototyping/rounds/<rN>/candidates/<candidate-id>/<screen-id>.commands.json` — executed command log per declared screen

Cross-round rollups:

- `.qfai/evidence/prototyping.json` — `rounds[]` / `polishCycles[]` rollup with best-of-history / breakthrough / reviewer gate sections
- `.qfai/evidence/prototyping.md` — reviewer-readable summary
- `.qfai/evidence/breakthrough.json` — breakthrough decisions

Canonical latest paths (mirror the newest accepted winner/polish state):

- `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
- `.qfai/evidence/prototyping/html/<screen-id>.html`

## Execution contract

Supported prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
`cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.

Browser tool: `playwright-cli` (the only supported value per spec-0012).

## Obligation matrix (spec-0012)

Mode invariant: every row below is identical except for the `maxCycles` column. `maxCycles` is the only mode-dependent field.

| surface / mode         | specs    | runtimeGate | uiFidelity | playwright evidence | reviewBundle | evaluatorReview | bestOfHistory | breakthrough | reviewerGate | maxCycles |
| ---------------------- | -------- | ----------- | ---------- | ------------------- | ------------ | --------------- | ------------- | ------------ | ------------ | --------- |
| web / low-cost         | required | required    | required   | required            | required     | required        | required      | required     | required     | 1         |
| web / standard         | required | required    | required   | required            | required     | required        | required      | required     | required     | 3         |
| web / full-harness     | required | required    | required   | required            | required     | required        | required      | required     | required     | 20        |
| mobile / low-cost      | required | required    | required   | required            | required     | required        | required      | required     | required     | 1         |
| mobile / standard      | required | required    | required   | required            | required     | required        | required      | required     | required     | 3         |
| mobile / full-harness  | required | required    | required   | required            | required     | required        | required      | required     | required     | 20        |
| desktop / low-cost     | required | required    | required   | required            | required     | required        | required      | required     | required     | 1         |
| desktop / standard     | required | required    | required   | required            | required     | required        | required      | required     | required     | 3         |
| desktop / full-harness | required | required    | required   | required            | required     | required        | required      | required     | required     | 20        |
| mixed / low-cost       | required | required    | required   | required            | required     | required        | required      | required     | required     | 1         |
| mixed / standard       | required | required    | required   | required            | required     | required        | required      | required     | required     | 3         |
| mixed / full-harness   | required | required    | required   | required            | required     | required        | required      | required     | required     | 20        |

Choosing a lower mode buys fewer cycles, not a weaker gate.

## Truthfulness rules

- `mode.effective` must be one of `low-cost`, `standard`, `full-harness`.
- `maxCycles` must match `PROTOTYPING_MAX_CYCLES[mode]` or `QFAI-PROT-MODE-001` is raised.
- Browser tool must be `playwright-cli`.
- `uiFidelity.mode` must be `interactive` (captured via the Playwright CLI command plans).
- Evidence capture is performed by the AI evaluator sub-agent via the Playwright CLI command plans generated by QFAI.
- Canonical screen contracts in `.qfai/contracts/ui/*.yaml` are mandatory.
- evaluator review `evidenceRefs[]` entries must contain concrete artifact refs that point to existing files; placeholders (`""`, `"tbd"`, `"TBD"`) are rejected.
- Canonical latest paths must mirror the newest accepted winner/polish artifacts.
- `mockPaths` is a negative-only ledger. Allowed values are `fail|finding` only.

## Prototyping completion gate (spec-0012)

Completion requires all of the following for every mode:

- all 4 per-screen artifacts present for every declared screen in the completion round / polish cycle
- at least one `polish` cycle completed after winner selection
- `bestOfHistory` present
- `breakthrough` present
- independent reviewer gate returned `PASS`
- every reviewer sub-agent scored every evaluation axis at `100/100`
- `qfai validate --profile prototyping --fail-on error` passes

If the polish-cycle budget is exhausted before the gate is satisfied, the run does not complete and returns `REVISE`.

## Prohibited patterns

- `browserProvider` or `renderProvider` config keys (rejected per spec-0012)
- `playwright-mcp` as standard browser tool
- Node Playwright direct invocation for evidence capture
- Mode differences other than `maxCycles`
- `cli` prototyping execution
- self-reference such as `prototyping.json#/runtimeGate`
- synthetic refs such as `specs: ...`
- synthetic `mockPaths.status="pass"`
- hardcoded calibration pack version
