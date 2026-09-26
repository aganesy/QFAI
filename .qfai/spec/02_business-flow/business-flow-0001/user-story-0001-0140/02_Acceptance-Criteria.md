# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0140-01
# Parent: US-0001-0140
Scenario: `--cycle 0 --force` backup safety
  Given `.qfai/evidence/prototyping/iter-00/` is non-empty AND `qfai prototyping iterate --cycle 0` is invoked WITHOUT `--force`,
  When the command runs,
  Then iterate MUST refuse and the error MUST name the existing evidence path AND the recovery snippet `cp -r iter-00 iter-00.backup-<ISO> && qfai prototyping iterate --cycle 0 --force`.
  And when `--force` is passed, iterate MUST move existing `iter-00/` to `iter-00.backup-<ISO>/` BEFORE invoking `clearEvidenceIterDirs`; the backup MUST be byte-equivalent to the pre-move `iter-00/`.
  And On the story tree a `--cycle 0` re-seed over a `prototyping.json` that carries `specsCovered` or `frozenSpecsCovered`, or lacks `uiContractsCovered`, deletes none of the evidence under `iter-NN/spec-NNNN/`.

# AC-0001-0140-02
# Parent: US-0001-0140
Scenario: Cycle-0 reset moves the aggregate capture mirrors aside (REQ-0174)
  Given a prototyping evidence tree holding `screenshots/` or `html/` from a previous loop,
  When `qfai prototyping iterate --cycle 0` runs, with or without `--force`,
  Then both directories MUST be moved into `aggregate.backup-<ISO>/` before any iteration directory is cleared, each moved file MUST appear in `mutation-log.jsonl`, and the backups MUST be left out of the completion certificate's evidence digests and of its freshness scan.
```
