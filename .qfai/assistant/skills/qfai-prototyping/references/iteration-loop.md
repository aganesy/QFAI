# Iteration Loop

## Phases

```
[Freeze] cycle 0:    cache the lock-anchored sha256(DESIGN.md) into prototyping.json
[Seed]   cycle 0:    generate one iter-00/index.html under DESIGN.md tokens
[Loop]   cycle 1..14: capture -> review -> iterate (DESIGN.md hash held)
[Cert]   final:      handoff yaml + completion-certificate.json
```

## Per-iter artifacts

```
.qfai/prototypes/iter-NN/index.html
.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}
```

`progress.md` is one file for the whole run. The generator appends a
one-line summary at each iter's end.

## Stop conditions (deterministic)

Exit codes for `qfai prototyping iterate --cycle <n+1>`:

- `0` — continue.
- `64` — convergence: latest iter has all 4 UX axes
  (`informationArchitecture`, `navigationFlow`, `usability`,
  `functionality`) at `exceptional` AND `layoutAntiPatternsDetected`
  is empty AND `designMdViolations` is empty.
- `65` — max-iterations: latest iter `index === 14`.
- `2` — input error, including:
  - root `DESIGN.md` missing or unparseable;
  - `.qfai/contracts/design/DESIGN.md.lock.yaml` missing;
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

- spec set
- `.qfai/contracts/ui/*.yaml`
- root `DESIGN.md`
- `.qfai/contracts/design/DESIGN.md.lock.yaml`

## Contracts produced (post-loop)

- `.qfai/contracts/design/design-system.yaml` — deterministic mirror of
  DESIGN.md tokens. No HTML extraction. See `handoff.md`.
- `.qfai/contracts/design/prototype-handoff.yaml`
- `.qfai/evidence/prototyping/completion-certificate.json` (records
  `designMdPath` + `designMdSha256`)

## Frozen brand identity

The single source of truth for the frozen DESIGN.md sha256 is
`.qfai/contracts/design/DESIGN.md.lock.yaml#designMdSha256`. At cycle 0
the loop reads the lock, hashes the live `DESIGN.md`, and refuses to
proceed unless the two match; the lock value is then cached into
`prototyping.json` so subsequent cycles can re-verify the
`live === lock === cache` invariant cheaply. Any of the three
diverging exits with `2`. To change brand identity mid-project, edit
`DESIGN.md`, rerun `/qfai-sdd` Phase 0 to refreeze the lock, and
start `/qfai-prototyping` from cycle 0.

## Sealed loop

A loop is **sealed** once `prototyping.json` records
`stopReason: "axes-exceptional"` together with an `acceptedIterationIndex`.
That is the converged state — the only one `--check-convergence` reports as
converged and the only one `qfai prototyping certify` will seal. On a sealed
loop `qfai prototyping iterate --cycle N` refuses with exit `2` for any `N`
greater than the accepted index, and writes nothing — no `iter-NN/` directory
is created. That refusal is deliberate: such a directory is stale by
construction, and the stale-iteration-directory check in
`qfai prototyping certify` hard-fails on it.

The other terminal stop reasons — `license-verify-fail`, `input-error`,
`max-iterations` — do **not** seal the loop. They are states you are expected
to fix and retry, so the same cycle can be re-run and the fix verified.

Two paths remain open on a sealed loop:

- **Seal it** — run `qfai prototyping certify`. This is the normal
  next step after convergence.
- **Start over** — run `qfai prototyping iterate --cycle 0
--target-url <url> --force`. Cycle 0 is a hard reset and is never
  refused by the sealed-loop guard; it also deletes stale `iter-NN`
  directories. `--force` is required, not optional: a converged loop
  always has an `iter-00`, and the cycle-0 destructive-rerun gate
  refuses to overwrite it without the flag. With it, `iter-00` is moved
  to `iter-00.backup-<ISO>` before the reset, so the prior loop is
  recoverable.

Re-running the accepted cycle itself (`--cycle <acceptedIterationIndex>`)
is also permitted — that is a redo of recorded work, not an extension
past the seal. Use `qfai prototyping iterate --check-convergence` to
read the recorded `stopReason` / `acceptedIterationIndex` first.

If an `iter-NN` directory was created that should not have been, delete
it before running certify; there is no reserved quarantine name.
