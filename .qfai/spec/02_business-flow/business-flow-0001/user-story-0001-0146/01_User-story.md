# US-0001-0146: Prototyping mutation log

## User Story

As a maintainer auditing evidence churn, I want `iterate` and `certify` to append a `{ ts, caller, path, action, priorSize, newSize }` line to the git-ignored `.qfai/evidence/prototyping/mutation-log.jsonl` for every delete, overwrite or move under `iter-NN/`, including each file moved by `--cycle 0 --force`, so that lost iteration evidence can be traced and a code path that mutates `iter-NN/` without logging is reported as `R-EVIDENCE-MUTATION-UNLOGGED`.
