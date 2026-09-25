# Iteration Loop

## Contents

- Phases
- Per-iter artifacts
- Stop conditions (deterministic)
- Best-of-history is gone
- Surface profile
- Contracts read
- Contracts produced (post-loop)
- Frozen brand identity
- Sealed loop
- Scope reduction: `prototyping rescope`
- License-verify hard-stop (exit 66)

## Phases

```text
[Freeze] cycle 0:    cache the lock-anchored sha256(DESIGN.md) into prototyping.json
[Seed]   cycle 0:    generate one iter-00/index.html under DESIGN.md tokens
[Loop]   cycle 1..9:  capture -> review -> iterate (DESIGN.md hash held)
[Cert]   final:      handoff yaml + completion-certificate.json
```

## Per-iter artifacts

```text
.qfai/prototypes/iter-NN/index.html
.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, <screen>.signals.json, review.json}
.qfai/evidence/prototyping/iter-NN/<spec-id>/<screen>.review.json
```

The last path is mandatory from cycle 0 onward: the reviewer writes one
payload per `(spec, screen)` pair alongside the per-cycle `review.json`
summary (schema: `references/review-payload-schema.md`, aggregation
rule: `references/reviewer-prompt.md`). `npx qfai prototyping certify`
rejects the run (exit `64`) when a declared pair has no payload, so a
run that only writes the flat summary cannot be certified — that holds
for a single-spec run as much as for a multi-spec one.

`progress.md` is one file for the whole run. The generator appends a
one-line summary at each iter's end.

## Stop conditions (deterministic)

Exit codes for `npx qfai prototyping iterate --cycle <n+1>`:

- `0` — continue.
- `64` — convergence: on the latest iter, `designMdViolations`,
  `layoutAntiPatternsDetected` and `blockingFindings` are all empty.
  Nothing the reviewer left open, and nothing a scan found.
- `65` — max-iterations: latest iter `index === 9`.
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
  evidence until it captures again. `--force` is required,
  not optional: a converged loop
  always has an `iter-00`, and the cycle-0 destructive-rerun gate
  refuses to overwrite it without the flag. With it, the **evidence**
  `iter-00` is moved to `iter-00.backup-<ISO>` before the reset, so the
  prior loop's records are recoverable. The authoring tree is not part of
  that: `.qfai/prototypes/iter-00/index.html` is overwritten by the new
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

## Scope reduction: `prototyping rescope`

The drift rule above is symmetric, and scope **reduction** is not. When a
product decision retires a screen while the loop is open, the frozen union
still names it — and editing that union by hand is the exit-2 drift the rule
exists to catch. `rescope` is the operation that applies such a decision
without discarding the loop:

```bash
npx qfai prototyping rescope --remove 0011 --reason DELTA-022
```

It drops the surface from `frozenSurfaceUnion`, prunes it from any captured
`iterate-plan.json#screens`, records `{surface, reason, cycle, at}` in
`prototyping.json#rescopeLog`, and **leaves the loop at its current cycle**.
`--remove` is repeatable; `--reason` is required and should cite the recorded
delta or decision that retired the surface. `--dry-run` reports without
writing.

**Order matters.** Retire the surface upstream first — the spec, its UI
contract and its route — then run `rescope`. It refuses a surface that still
resolves as UI-bearing, because dropping one that still exists is exactly the
drift the frozen union detects. It also refuses a sealed loop (`stopReason`
set): a completed loop's scope is history.

**It never rewrites a critique.** What a reviewer saw at cycle N is a
historical fact, so affected `iter-NN/review.json` files get a
`retiredSurfaces` annotation and their `proseCritique` is left exactly as
written. A reader can then tell a stale claim from a wrong one.

`npx qfai validate --profile prototyping` reports `QFAI-PROT-011` as soon as
`frozenSurfaceUnion` names a spec that no longer resolves, so the state is
visible before the next `iterate` rather than at it. Three ways out:

- **rescope** — the decision was real; apply it and keep every recorded
  iteration;
- **restore** the retired spec's UI-bearing marker — the decision was not meant
  to remove this surface; or
- **reset** deliberately from cycle 0
  (`npx qfai prototyping iterate --cycle 0 --target-url <url> --force`), which
  moves `iter-00` to `iter-00.backup-<ISO>` and discards every cycle of review
  already paid for. Still available, still destructive.

`iterate` itself only hard-stops when **every** UI-bearing spec has
disappeared. A partial reduction passes that check, which is why the finding
exists.

## License-verify hard-stop (exit 66)

`npx qfai prototyping iterate` exits `66` when an `imageSources[]` entry on
`prototyping.json` violates the **effective** license catalog: the
immutable `frozenLicenseCatalog` baseline unioned with every
`licensePatchAudit[]` row. The verifier rejects five distinct error
codes:

- `license-not-allowlisted` — `source` not in `allowedSources`
- `license-tier-unknown` — `license` not in `licenseTiers[source]`
- `license-non-https-url` — `url` is not HTTPS
- `license-host-mismatch` — URL host not in `sourceHosts[source]`
- `license-missing-attribution` — `attribution` empty / whitespace

Recovery path (no in-loop retry — the verifier is fail-closed):

1. Inspect `prototyping.json#frozenLicenseCatalog` **and**
   `prototyping.json#licensePatchAudit[]`: the effective
   `allowedSources` / `licenseTiers` is the baseline plus every audit
   row, so the frozen field alone omits every permission a
   `--license-patch` already added. `sourceHosts` is the exception —
   an audit row persists no hosts, so the effective `sourceHosts` stays
   exactly the baseline and a patch-added source carries **no** host
   binding. The verifier skips the host check for a source with no
   `sourceHosts` entry, so any HTTPS host passes under that source
   name; host pinning for an added source is not available today.
2. Edit the offending `imageSources[]` entry to use an allowlisted
   source / known tier / HTTPS URL / matching host / non-empty
   attribution. **Do not** edit `frozenLicenseCatalog` mid-loop
   (separate exit-2 lock-drift class).
3. To broaden the allowlist, apply an add-only `--license-patch` at the
   current cycle — no cycle-0 restart. Deletions / modifications inside
   a patch file are rejected outright. Revoking an already-applied
   permission is a manual step: `--cycle 0 --force` re-seeds the loop
   but does **not** clear `licensePatchAudit[]`, so every prior row is
   unioned back in from cycle 1. Delete (or archive elsewhere) the
   offending rows from `prototyping.json#licensePatchAudit[]` yourself
   as part of the re-seed — that array is not covered by the lock-drift
   gate, unlike `frozenLicenseCatalog`.
