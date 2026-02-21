# CI Minimum: Integrate `qfai validate`

This document defines the minimum CI integration for v1.4.26 hard gates.

## Goal

- Fail CI when traceability coverage holes exist.
- Keep validator evidence as CI artifacts for fast diagnosis.

## Minimum gate command

```bash
qfai validate --fail-on error --format github
```

- `--fail-on error`: exits with code 1 when any error exists.
- `--format github`: emits GitHub-friendly annotations.

## Recommended evidence artifacts

- `.qfai/report/validate.json`
- `.qfai/report/validate.log` (stdout piped via `tee`)
- `.qfai/report/run-*/**`
- `.qfai/report/specs-coverage/spec-*.md`
- `.qfai/report/report.md` (optional)

## GitHub Actions minimum pattern

```yaml
- name: Run qfai validate gate (fail on error)
  shell: bash
  run: |
    set -euo pipefail
    qfai validate --fail-on error --format github | tee .qfai/report/validate.log

- name: Run qfai report (optional)
  if: always()
  shell: bash
  run: |
    set -euo pipefail
    qfai report --run-validate || true

- name: Upload qfai artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: qfai-report
    path: |
      .qfai/report/validate.json
      .qfai/report/validate.log
      .qfai/report/report.md
      .qfai/report/run-*/
      .qfai/report/specs-coverage/spec-*.md
```

## Notes for this repository

- The package CI already builds and validates a pack sandbox under `tmp/pack/sandbox/out`.
- Workflow steps can run the CLI with:
  - `node packages/qfai/dist/cli/index.mjs validate --root tmp/pack/sandbox/out --fail-on error --format github`
  - `node packages/qfai/dist/cli/index.mjs report --root tmp/pack/sandbox/out --run-validate`

