---
name: prototyping-recover
owner: qfai-prototyping
purpose: "Recover a prototyping loop that stopped on lock drift, a license failure, an exhausted budget or a retired UI contract."
requires: []
roles: [orchestrator, product-experience-architect, devops-ci-engineer, completion-reviewer]
routing-profile: default
---

# prototyping-recover

Runs on demand, when a `prototyping-loop` exit or a product decision calls for
it. Each section below is one recovery; run the one the exit names, then return
to the loop.

## Reads

- `.qfai/evidence/prototyping/prototyping.json`.
- `.qfai/assistant/skill/qfai-prototyping/references/iteration-loop.md#sealed-loop`.
- `.qfai/assistant/skill/qfai-prototyping/references/iterate-flags.md`.

## Writes

Only what the chosen recovery names below. Every cycle-0 reset is destructive:
ask before running it, naming what it moves and what it deletes.

## Continuing or resetting a converged loop

Only `stopReason: "converged"` + `acceptedIterationIndex` seals a loop;
`iterate --cycle N` then refuses with exit `2` past the accepted index, writing
nothing. `license-verify-fail` / `input-error` do NOT seal — fix the cause and
re-run the same cycle. `max-iterations` does not seal either, but iter-09 still
stops every `--cycle N >= 1` at exit `65`. Recovery for both is the cycle-0
reset; re-running the accepted cycle is reported by the convergence gate (exit
`64`) and writes nothing, so it is a state read, not a rerun. The reset command,
the `--force` requirement and the `certify` alternative are in
`.qfai/assistant/skill/qfai-prototyping/references/iteration-loop.md#sealed-loop`.

## Lock drift

Exit `2` on lock drift covers a `DESIGN.md` hash that no longer matches the
lock, and `frozenSurfaceUnion` / `frozenLicenseCatalog` drift on cycle ≥ 1.

To change `DESIGN.md`, edit it, refreeze the lock through the `common-design-md` step of
`/qfai-sdd`, and re-run prototyping from cycle 0. Which side of a drift or
conflict wins is the user's decision: ask it, and under a no-question mode stop
and report the drift.

## Scope reduction: `prototyping rescope`

The drift rule is symmetric, and scope **reduction** is not. When a product
decision retires a screen while the loop is open, the frozen union still names
it — and editing that union by hand is the exit-2 drift the rule exists to
catch. `rescope` is the operation that applies such a decision without
discarding the loop:

```bash
npx qfai prototyping rescope --remove CON-UI-0001 --reason "<decision that retired it>"
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
`frozenSurfaceUnion` names a UI contract that no longer resolves, so the state is
visible before the next `iterate` rather than at it. Three ways out:

- **rescope** — the decision was real; apply it and keep every recorded
  iteration;
- **restore** the retired spec's UI-bearing marker — the decision was not meant
  to remove this surface; or
- **reset** deliberately from cycle 0
  (`npx qfai prototyping iterate --cycle 0 --target-url <url> --force`), which
  moves `iter-00` to `iter-00.backup-<ISO>` and discards every cycle of review
  already paid for. Still available, still destructive.

`iterate` itself only hard-stops when **every** UI-bearing UI contract has
disappeared. A partial reduction passes that check, which is why the finding
exists.

## License-verify hard-stop (exit 66)

`npx qfai prototyping iterate` exits `66` when an `imageSources[]` entry on
`prototyping.json` violates the **effective** license catalog: the immutable
`frozenLicenseCatalog` baseline unioned with every `licensePatchAudit[]` row.
The verifier rejects five distinct error codes:

- `license-not-allowlisted` — `source` not in `allowedSources`
- `license-tier-unknown` — `license` not in `licenseTiers[source]`
- `license-non-https-url` — `url` is not HTTPS
- `license-host-mismatch` — URL host not in `sourceHosts[source]`
- `license-missing-attribution` — `attribution` empty / whitespace

Recovery path (no in-loop retry — the verifier is fail-closed):

1. Inspect `prototyping.json#frozenLicenseCatalog` **and**
   `prototyping.json#licensePatchAudit[]`: the effective `allowedSources` /
   `licenseTiers` is the baseline plus every audit row, so the frozen field
   alone omits every permission a `--license-patch` already added.
   `sourceHosts` is the exception — an audit row persists no hosts, so the
   effective `sourceHosts` stays exactly the baseline and a patch-added source
   carries **no** host binding. The verifier skips the host check for a source
   with no `sourceHosts` entry, so any HTTPS host passes under that source name;
   host pinning for an added source is not available.
2. Edit the offending `imageSources[]` entry to use an allowlisted source,
   known tier, HTTPS URL, matching host and non-empty attribution. **Do not**
   edit `frozenLicenseCatalog` mid-loop (a separate exit-2 lock-drift class).
3. To broaden the allowlist, apply an add-only `--license-patch` at the current
   cycle — no cycle-0 restart. Deletions and modifications inside a patch file
   are rejected outright. Revoking an already-applied permission is a manual
   step: `--cycle 0 --force` re-seeds the loop but does **not** clear
   `licensePatchAudit[]`, so every prior row is unioned back in from cycle 1.
   Delete (or archive elsewhere) the offending rows from
   `prototyping.json#licensePatchAudit[]` yourself as part of the re-seed — that
   array is not covered by the lock-drift gate, unlike `frozenLicenseCatalog`.

## Cycle 9 budget exhaustion

If convergence is not reached at iter-09, certify rejects the run; the handoff
artifacts and `validate` / `/qfai-verify` can still execute for inspection, but
`npx qfai prototyping certify --check` exits non-zero and prevents DONE.

Use `npx qfai prototyping iterate --cycle 9 --check-convergence` for a
read-only peek of `prototyping.json` before refreezing: exit `0` confirms
convergence (no recovery needed), exit `2` confirms the run did not converge.
Recovery: review `DESIGN.md`, the pivot strategy in
`.qfai/assistant/skill/qfai-prototyping/references/reviewer-prompt.md`, and the
latest `review.json` findings, then ask for and run
`npx qfai prototyping iterate --cycle 0 --target-url <url> --force` to
refreeze. Do not seal a certificate against an unconverged iter-09.

A reset after a rejected prototype counts against the same ten-cycle budget as
the cycles before it (`prototyping-loop` § U). When it is spent, stop and
escalate rather than resetting again.

## Gate

The step passes when the cause the exit named is fixed and the loop can re-run:
`npx qfai prototyping iterate --check-convergence` or the next `iterate` call no
longer returns the same refusal. A reset the user declined ends the run instead,
with nothing deleted.
