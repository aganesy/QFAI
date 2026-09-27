# Skeleton Evidence

The Skeleton phase's record, one section per declared entrypoint, written
before the first row is selected.

`.qfai/assistant/catalog/structure.md#key-packages--entrypoints` declares the
entrypoints; this repository has one.

## `qfai`

- Skeleton verdict: applicable — the repository ships a runnable entrypoint,
  `packages/qfai/dist/cli/index.mjs`, and the package declares it as the `qfai`
  bin.
- Skeleton entrypoint: `node packages/qfai/dist/cli/index.mjs`
- Skeleton US: `US-0003-0001` — workspace initialization. It is the first
  command an adopter runs, it runs before the project has a configuration for
  anything else to read, and every other command reads the tree it writes.
- Skeleton command: `node scripts/smoke-qfai-cli.mjs`
- Skeleton script: `scripts/smoke-qfai-cli.mjs@82f30997dc88e617531e5f59f86fd8b7c1793a134564853019366e590a639c1d`
- Skeleton result:

  ```text
  $ node scripts/smoke-qfai-cli.mjs
  smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned 325 path(s)
  exit=0
  ```

  The script starts the built CLI over stdio in a directory it creates outside
  this repository, and asserts two strings the dry-run plan carries: the count
  line `would write:` and `qfai.config.yaml`. Both are properties of the
  initialization surface. Measured against the same build, `--help` produces
  neither and an unknown command produces neither, so the assertion is not
  satisfied by a process that merely started.

  The directory is outside this repository on purpose. Run inside it, the CLI
  resolves git configuration to this repository's own and the plan reports a
  change to it rather than to the project being initialized.

- Skeleton gatekeeper: PASS — the run above is the command and its real output,
  the assertion discriminates, and the script exits non-zero on any failure
  including a failure to start.
- Skeleton debt: none. The smoke asserts reachability only. What `init` writes,
  and whether it writes it correctly, belongs to `US-0003-0001`'s own test
  cases; asserting it here would be the predicate the phase forbids.
- Skeleton cycles: 1 of 3

### Re-run — `/qfai-atdd` stage gate P1a, 2026-09-23T19:33:24.738Z

The latest recorded result above exits 0, so this invocation re-runs the
recorded command, and this run's exit status decides.

- Skeleton command: `node scripts/smoke-qfai-cli.mjs`, resolved from the
  `Smoke` entry of `catalog/tech.md#standard-commands-copy-paste`. It matches
  the recorded command.
- Skeleton script: `scripts/smoke-qfai-cli.mjs@82f30997dc88e617531e5f59f86fd8b7c1793a134564853019366e590a639c1d`,
  recomputed before the run. It matches the recorded hash.
- Skeleton result:

  ```text
  $ node scripts/smoke-qfai-cli.mjs
  smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned 325 path(s)
  exit=0
  ```

  Environment: Node.js v24.18.0 on Windows 11. `packages/qfai/dist/` was rebuilt
  with `tsup` (the package's `build` script) immediately before the run. The
  build read commit `45587f6b2`, with no uncommitted change under
  `packages/qfai/` or `scripts/`. After the run, no `qfai-skeleton-*` directory
  remained in the OS temporary directory.

- Skeleton gatekeeper: the PASS above stands. The command and the script hash
  both match the judged run, so no fresh judgement is required.
- Skeleton debt: none. The skeleton was not changed.
- Skeleton cycles: 0 of 3. The skeleton was not changed, and this run is the
  re-run the evidence rule requires.
- Outcome: proven for this invocation. `Phase: Red` may start for `qfai`.

### Re-run — `/qfai-implement` spec-0013, run started 2026-09-25T02:45:32.177Z

The latest recorded result above exits 0, so this invocation re-runs the
recorded command, and this run's exit status decides.

- Skeleton command: `node scripts/smoke-qfai-cli.mjs`, resolved from the
  `Smoke` entry of `catalog/tech.md#standard-commands-copy-paste`. It matches
  the recorded command.
- Skeleton script: `scripts/smoke-qfai-cli.mjs@82f30997dc88e617531e5f59f86fd8b7c1793a134564853019366e590a639c1d`,
  recomputed before the run. It matches the recorded hash.
- Skeleton result:

  ```text
  $ node scripts/smoke-qfai-cli.mjs
  smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned 322 path(s)
  exit=0
  ```

  Run at 2026-09-25T02:46:35.768Z. Environment: Node.js v24.18.0 on Windows 11.
  `packages/qfai/dist/` was rebuilt with `tsup` immediately before the run, from
  commit `1e09c3067`, with no uncommitted change under `packages/qfai/` or
  `scripts/`. The tree address before and after the run was
  `working-tree+71d85ec583954570142d6d9a1d20d6c8b45ac6fa67fb4e51a895030d09bcfd3b`.
  No `qfai-skeleton-*` directory remained in the OS temporary directory.
  The plan names 322 paths where the earlier runs named 325. The script does
  not assert the count.

- Skeleton gatekeeper: the PASS above stands. The command and the script hash
  both match the judged run, so no fresh judgement is required.
- Skeleton debt: none. The skeleton was not changed.
- Skeleton cycles: 0 of 3. The skeleton was not changed, and this run is the
  re-run the evidence rule requires.
- Outcome: proven for this invocation. `Phase: Red` may start for `qfai`.

### Re-run for the current implementation invocation

- Revision: `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd` (HEAD at the run).
- Runtime: Node.js `v24.18.0`.
- Skeleton command: `node scripts/smoke-qfai-cli.mjs`
- Skeleton script: `scripts/smoke-qfai-cli.mjs@82f30997dc88e617531e5f59f86fd8b7c1793a134564853019366e590a639c1d`
  (SHA-256 rechecked before the run; unchanged from the previous record).
- Skeleton result:

  ```text
  $ node scripts/smoke-qfai-cli.mjs
  smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned 325 path(s)
  exit=0
  ```

- Skeleton gatekeeper: PASS — an independent `qa-gatekeeper` re-ran the command with exit 0, matched the recorded script digest, and confirmed the stdio response identifies the initialization surface.
