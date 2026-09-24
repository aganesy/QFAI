# Iteration Loop

## Phases

```text
[Freeze] cycle 0:    cache the lock-anchored sha256(DESIGN.md) into prototyping.json
[Seed]   cycle 0:    generate one iter-00/index.html under DESIGN.md tokens
[Loop]   cycle 1..9:  reviewer operates Playwright -> review -> iterate (DESIGN.md hash held)
[Cert]   final:      handoff yaml + completion-certificate.json
```

## Per-iter artifacts

```text
.qfai/prototype/iter-NN/index.html
.qfai/evidence/prototyping/iter-NN/review.json
.qfai/evidence/prototyping/iter-NN/CON-UI-NNNN/<screen>.review.json
.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, <screen>.signals.json} (--capture only)
```

The per-screen review path is mandatory from cycle 0 onward: the reviewer writes one
payload per `(UI contract, screen)` pair alongside the per-cycle `review.json`
summary (schema: `references/review-payload-schema.md`, aggregation
rule: `references/reviewer-prompt.md`). `npx qfai prototyping certify`
rejects the run (exit `64`) when a declared pair has no payload, so a
run that only writes the flat summary cannot be certified — that holds
for a single-contract run as much as for a multi-contract one.

The default cycle has no capture pass. The reviewer operates Playwright live
and writes the mandatory review payload. `iterate --capture` adds the PNG,
HTML, and signal artifacts through the CLI; it does not assign a fixed third
capture sub-agent.

`iterate` only seeds `prototyping.json#iterations[]`. After each review, the
orchestrator writes the reviewed record. Copy the summary's four ordinal
scores, critique, findings, directive, and reviewer identity. Validate its
`evidenceRefs[]` `{kind, path}` entries before copying to the persisted array:
each declared screen must have exactly one entry per required kind, with no
unexpected screen, duplicate screen/kind pair, or duplicate path. Check that
every cited artifact exists and store paths relative to
`.qfai/evidence/prototyping/`. Without `--capture`, store `[]`;
with it, require screenshot and HTML entries for every screen. The closed
`CON-UI-NNNN/<screen>.review.json` payload has no `evidenceRefs` key. The pure
`buildEvidenceRefs()` helper does not perform this write for the CLI.

`progress.md` is one file for the whole run. The generator appends a
one-line summary at each iter's end.

## Stop conditions (deterministic)

Exit codes for `npx qfai prototyping iterate --cycle <n+1>`:

- `0` — continue.
- `64` — convergence: all four per-cycle ordinal scores are `exceptional`,
  and `designMdViolations`, `layoutAntiPatternsDetected` and
  `blockingFindings` are empty for every declared `(UI contract, screen)`
  payload.
- `65` — max-iterations: latest iter `index === 9`.
- `2` — input error, including:
  - root `DESIGN.md` missing or unparseable;
  - `<contractsDir>/design/DESIGN.md.lock.yaml` missing;
  - `sha256(DESIGN.md)` mismatch with the lock.

LLM subjective DONE declarations are forbidden.

## Best-of-history is gone

The latest iter is always accepted. Temporary regressions are allowed;
leap regression is a normal path to creative breakthrough on the IA /
flow axes.

## Surface profile

`surface` (web/mobile/desktop/mixed) only affects the capture profile.
It is neutral with respect to AI behavior.

## Contracts read

- UI-bearing contract set under `<contractsDir>/ui/`
- root `DESIGN.md`
- `<contractsDir>/design/DESIGN.md.lock.yaml`

## Contracts produced (post-loop)

- `<contractsDir>/design/design-system.yaml` — deterministic mirror of
  DESIGN.md tokens. No HTML extraction. See `handoff.md`.
- `<contractsDir>/design/prototype-handoff.yaml`
- `.qfai/evidence/prototyping/completion-certificate.json` (records
  `designMdPath` + `designMdSha256`)

## Frozen brand identity

The single source of truth for the frozen DESIGN.md sha256 is
`<contractsDir>/design/DESIGN.md.lock.yaml#designMdSha256`. At cycle 0
the loop reads the lock, hashes the live `DESIGN.md`, and refuses to
proceed unless the two match; the lock value is then cached into
`prototyping.json` so subsequent cycles can re-verify the
`live === lock === cache` invariant cheaply. Any of the three
diverging exits with `2`. To change brand identity mid-project, edit
`DESIGN.md`, rerun `/qfai-sdd`'s `03_contract` step to refreeze the lock, and
start `/qfai-prototyping` from cycle 0.

## Sealed loop

A loop is **sealed** once `prototyping.json` records
`stopReason: "converged"` together with an `acceptedIterationIndex`.
That is the converged state — the only one `--check-convergence` reports as
converged and the only one `npx qfai prototyping certify` will seal. On a sealed
loop `npx qfai prototyping iterate --cycle N` refuses with exit `2` for any `N`
greater than the accepted index, and writes nothing — no `iter-NN/` directory
is created. That refusal is deliberate: such a directory is stale by
construction, and the stale-iteration-directory check in
`npx qfai prototyping certify` hard-fails on it.

`license-verify-fail` and `input-error` do **not** seal the loop. They are
states you are expected to fix and retry, so the same cycle can be re-run and
the fix verified.

`max-iterations` does not seal the loop either, but it is **not** retryable in
the same way: the recorded `iter-09` remains the last iteration, so
`shouldStop()` returns `max-iterations` again and every `--cycle N >= 1` exits
`65` before any path is assigned. Its only recovery is the cycle-0 reset
below.

Two paths remain open on a sealed loop:

- **Seal it** — run `npx qfai prototyping certify`. This is the normal
  next step after convergence.
- **Start over** — run `npx qfai prototyping iterate --cycle 0
--target-url <url> --force`. Cycle 0 is a hard reset and is never
  refused by the sealed-loop guard; it also deletes stale `iter-NN`
  directories and moves the aggregate `screenshots/` and `html/`
  directories to `aggregate.backup-<ISO>`, so a restarted loop holds no
  review or optional capture evidence until those stages run again. `--force` is required,
  not optional: a converged loop
  always has an `iter-00`, and the cycle-0 destructive-rerun gate
  refuses to overwrite it without the flag. With it, the **evidence**
  `iter-00` is moved to `iter-00.backup-<ISO>` before the reset, so the
  prior loop's records are recoverable. The authoring tree is not part of
  that: `.qfai/prototype/iter-00/index.html` is overwritten by the new
  cycle-0 generation with no backup, so copy that directory aside first
  where the prior prototype still matters.

Re-running the accepted cycle itself (`--cycle <acceptedIterationIndex>`)
is not refused by the sealed-loop guard — that would be a redo of recorded
work, not an extension past the seal — but it does not re-run the cycle
either: the convergence gate reads the same recorded iteration, reports
`converged` and exits `64` without assigning paths or writing
anything. Treat it as a state read, and prefer
`npx qfai prototyping iterate --check-convergence`, which reports the recorded
`stopReason` / `acceptedIterationIndex` without the exit-code ambiguity.

If an `iter-NN` directory was created that should not have been, delete
it before running certify; there is no reserved quarantine name.
