# Distributed Surface — This Repository

Read with `distributed-surface.md`, which states the principle. This file names
the surface, the identifier shapes, and the guards, for this repository only.

## The surface

The paths listed in `packages/qfai/package.json#files` — today `dist/`,
`assets/`, `README.md` and `LICENSE`.

Only the post-build guard reads `files`. The other two scan targets of their
own, so a path added to `files` is not covered by them until they are extended:

- the pre-build lint scans `src/**/*.ts` comments and `assets/init/**`;
- the smoke test scans the tree `qfai init` writes, which is only what init
  copies out of `assets/`.

When in doubt, ask whether the file is copied into a user's project. If it is,
the identifier does not belong in it.

## The shapes that must not appear

| Kind                         | Shape                               | Example                  |
| ---------------------------- | ----------------------------------- | ------------------------ |
| Internal spec ID             | `spec-0010` and above               | `spec-0011`, `spec-0042` |
| Internal capability ID       | `CAP-0010` and above                | `CAP-0013`               |
| Internal decision ID         | `DEC-NNNN-NNNN`                     | `DEC-0001-0042`          |
| Internal design-rationale ID | `DR-NNNN`                           | `DR-0007`                |
| Internal open-question ID    | `OQ-NNNN-NNNN`                      | `OQ-0012-0006`           |
| Internal change ID           | `CHG-NNN`                           | `CHG-003`                |
| Retired trace prefix         | `QFAI-PROT2-NNN`                    |                          |
| Private version marker       | `vN.M`, `vN.M.P`, `v1.x`            | `v2.0`, `v3.0`           |
| Private schema marker        | `"schemaVersion"`, `schemaVersion:` |                          |

### Three exceptions

- `spec-0001` to `spec-0009` are the sample spec IDs `qfai init` generates, and
  may appear.
- `version` in `package.json` is the released version and is not a private
  marker.
- The version in the **file name** of
  `.qfai/assistant/process/migrations/v<MAJOR>.<MINOR>.<PATCH>[-*].md` stands.
  `qfai init --upgrade-assistant-tree` writes one memo per upgrade and other
  documents cite it by name, so it cannot be renamed. The guards neutralise that
  one basename shape before scanning. A memo's body, the spec and trace IDs
  inside it, and any other name — `notes-v2.0-draft.md`, `drafts-v2.0/` — are
  still scanned.

## The version a shipped file may name

The version of this project a shipped file presents as current is
`packages/qfai/package.json#version`. Do not mint a `schemaVersion` or a private
`vN.M` beside it. Express a breaking change by raising the npm minor or major.

A version that belongs to something else is not covered by the rule — a
dependency, a runtime such as Node.js, a protocol, or a past release a migration
note is about. The post-build guard cannot tell those apart yet: it matches every
`vN.M` and `vN.M.P` as a deliberately broad backstop, because the surface holds
no such reference today. When one has to ship, narrow that matcher to a
project-qualified form rather than rewording the reference; the guard's own
comment names the form.

## Four guards

| Layer            | Implementation                                                      | What it reads                                                                                   |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pre-build lint   | `packages/qfai/scripts/lint-shipping.ts` (`src-comment`)            | Comment lines in `src/**/*.ts`, closing the route by which tsup carries them into `dist/*.d.ts` |
| Post-build guard | `packages/qfai/scripts/check-no-internal-version-leakage.sh`        | The contents and the file names under the paths `files` points at                               |
| Smoke test       | `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts` | The contents and file names of the tree `qfai init` writes into a temporary directory           |
| This file        | —                                                                   | Agreement among contributors                                                                    |

- The pre-build lint reads only lines that open with a comment marker. A
  trailing `//` or an inline `/* */` is the post-build guard's to catch.
- The post-build guard and the smoke test report a file-name hit as
  `leaked in a FILE NAME`, separately from a content hit.
- The smoke test also scans extensionless text files such as `.gitkeep`, by a
  basename allowlist.
- The three implementations hold the same pattern set. Changing one means
  changing the other two and this file in the same change.

Where each runs:

| Layer            | Job and step                                                                         |
| ---------------- | ------------------------------------------------------------------------------------ |
| Pre-build lint   | The lint job's `pnpm ci:lint`, as `lint:shipping`                                    |
| Post-build guard | A dedicated step in the lint job and in the build job, after the build in the latter |
| Smoke test       | The test job                                                                         |

The post-build guard is deliberately outside `pnpm ci:lint`: called from there
it would read a `dist/` from before the build, which is what the pre-build lint
already covers at a different grain.

## Where internal IDs are fine

- `.qfai/specs/`, `.qfai/discussion/`, `.qfai/contracts/`
- `CHANGELOG.md`
- `packages/qfai/docs/`
- Commit messages, and pull request and issue bodies
- Test code under `packages/qfai/tests/`, which does not ship.

Not in `packages/qfai/src/**`, comment or not. tsup carries a doc comment into
`dist/*.d.ts`, and a string literal into the bundle, and the post-build guard
scans both.
