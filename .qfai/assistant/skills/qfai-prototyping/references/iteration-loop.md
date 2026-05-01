# Iteration Loop

## Phases

```
[Seed]   cycle 0:    generate one iter-00/index.html
[Loop]   cycle 1..14: capture -> review -> iterate
[Cert]   final:      handoff yaml + completion-certificate.json
```

## Per-iter artifacts

```
.qfai/prototypes/iter-NN/index.html
.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}
```

`progress.md` is one file for the whole run. The generator appends a one-line summary at each iter's end.

## Stop conditions (deterministic)

Exit codes for `qfai prototyping iterate --cycle <n+1>`:

- `0` continue
- `64` convergence: latest iter has all 4 axes `exceptional` AND `slopPatternsDetected` is empty
- `65` max-iterations: latest iter `index === 14`
- `2` input error

LLM subjective DONE declarations are forbidden.

## Best-of-history is gone

The latest iter is always accepted. Temporary regressions are allowed; leap regression is a normal path to creative breakthrough.

## Surface profile

`surface` (web/mobile/desktop/mixed) only affects the capture profile. It is neutral with respect to AI behavior.

## Contracts read

- spec set
- `.qfai/contracts/ui/*.yaml`
- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml`
- `.qfai/contracts/design/brand-design.yaml`

## Contracts produced (post-loop)

- `.qfai/contracts/design/design-system.yaml` (output contract; extracted from the final iter)
- `.qfai/contracts/design/prototype-handoff.yaml`
- `.qfai/evidence/prototyping/completion-certificate.json`
