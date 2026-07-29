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

Exit codes for `npx --no-install qfai prototyping iterate --cycle <n+1>`:

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
