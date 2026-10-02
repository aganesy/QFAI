# `npx qfai prototyping iterate` flags

The flag reference for the sub-command. When it and `npx qfai --help`
disagree, the help text wins and this page is stale.

`--cycle <n>` is required on every call. `--target-url` is required at cycle 0
once at least one UI-bearing UI contract resolves. Every other flag is opt-in
and defaults off. A cycle 0 that resets the loop moves the aggregate
`screenshots/` and `html/` to `aggregate.backup-<ISO>` whether or not a flag is
passed.

## Capture and serving

- `--capture` — enable PNG / HTML capture per screen each cycle through the
  default Playwright runner (dynamic `import("playwright")`; Playwright is an
  optional dependency). Use it for durable pixel and DOM evidence; skip it for
  fast prose-only cycles.
- `--auto-serve` — start an in-process `node:http` server rooted at the
  prototype tree for the cycle. SIGINT teardown takes at most 2 s. `EADDRINUSE`
  on a port another process owns exits `2`; no foreign process is killed. Use it
  when no external dev server is running. Routing is SPA-style: a document
  request (GET or HEAD with `text/html` in `Accept`) that matches no file on
  disk is served `index.html`, so client-side and parameterized contract routes
  (`/overview`, `/pairs/:instrument`) resolve instead of returning 404.
  Sub-resource requests (`.css`, `.png`, `fetch()`) still return 404 when the
  file is missing, and the path-traversal 403 guard runs first.
- `--target-url <url>` — base URL the capture and review steps drive. Required
  at cycle 0 whenever at least one UI-bearing UI contract resolves; the
  zero-UI cycle-0 no-op exits `0` before this gate, so a project with no UI
  surface needs no URL. Also required at cycle >= 1 whenever `--capture` is
  set and a screen `url` is route-relative.

## Reading and re-seeding the loop

- `--check-convergence` — read-only peek of `prototyping.json`. Exits `0` when
  converged (`stopReason === "converged"` with `acceptedIterationIndex` set),
  and `2` otherwise. No writes, no Playwright launch. Use it at cycle 9 before
  recovery.
- `--force` — **required**, not optional, to re-run cycle 0 once an `iter-00`
  exists: the destructive-rerun gate refuses to overwrite it otherwise. It backs
  `iter-00` up to `iter-00.backup-<ISO>` and clears stale `iter-NN`
  directories. Detail:
  `references/iteration-loop.md#sealed-loop`.
- `--dry-run` — plan the cycle and write nothing. It reports what a real run
  would create, move or overwrite — including the `iter-00` backup `--force`
  would take — and exits without touching the tree. Use it to read a
  destructive cycle-0 re-seed before authorizing it.

## Scope and license

- `--primary-ui-contract <UI-NNNN>` — pins the primary contract without
  narrowing the covered set. It accepts the full ID only; no input is
  normalized. Use it when the automatically selected primary differs from the
  intended one. It takes precedence over
  `qfai.config.yaml#prototyping.primaryUiContract`.
- `--license-patch <file>` — apply an add-only patch to the license allowlist.
  Usable at **any** cycle, not only cycle 0: broaden the catalog mid-loop
  instead of discarding progress with `--cycle 0 --force`. The frozen catalog
  stays byte-equal to the shipped default and the patch is appended to the
  audit ledger, from which the effective allowlist is rebuilt on every cycle.
  Audit and back up the ledger too — the frozen catalog alone omits every added
  permission. A patch covers sources and tiers only: it never pins
  `sourceHosts`, and a `--cycle 0 --force` re-seed does not revoke earlier
  rows. Never hand-edit the frozen catalog; that is a drift exit `2`.
  Recovery: `.qfai/assistant/step/prototyping-recover/STEP.md`.

## Seeding and posture

- `--emit-skeletons` — cycle 0 only: write one placeholder HTML file per
  declared screen as a seed aid, not an alternative output shape. Ignored at
  cycle >= 1. Detail:
  `references/generator-prompt.md`.
- `--skeleton-mode <placeholder|full|stub>` — output mode for
  `--emit-skeletons` (default `placeholder`). No effect without it.
- `--mode <convergence|exploration>` — loop posture, default `convergence`.
  `exploration` relaxes the soft-rubric gates to warning, so it changes which
  gates block. It takes effect only at cycle 0: the resolved posture is recorded
  once on the seed iteration, and passing the flag at cycle >= 1 only echoes the
  resolved value — it neither switches the loop into exploration nor clears a
  recorded one. `npx qfai prototyping certify` exits `2` on any loop that
  contains an exploration iteration, and the only way back is a fresh
  `--cycle 0 --force` re-seed. Never use it to clear a failing gate on a loop
  you intend to certify.
