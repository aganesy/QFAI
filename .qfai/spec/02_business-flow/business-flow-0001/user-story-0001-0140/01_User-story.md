# US-0001-0140: Recoverable cycle-zero restart

## User Story

As an operator, I want `qfai prototyping iterate --cycle 0` to refuse a destructive re-run unless `--force` is passed, to move an existing `iter-00/` to `iter-00.backup-<ISO>/` before clearing it, and to move the aggregate `screenshots/` and `html/` directories into `aggregate.backup-<ISO>/` on every cycle-0 run, so that a mistaken re-seed stays recoverable and a restarted loop holds no capture from the previous loop.
