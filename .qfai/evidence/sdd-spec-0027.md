# Evidence: qfai-sdd (spec-0027)

## Objective

- `spec-0027` を latest remediation decision に合わせ、UI-bearing detection を `surface classification primary / content-signal fallback` に更新し、validator expectations を strategy 5-field と screen contract minimum schema に整合させる。

## Inputs reviewed

- `C:\Users\YusukeSenaga\Downloads\qfai_session_master_design_spec_v0.1.md`
- `.qfai/discussion/discussion-20260329195516830/**`
- `.qfai/specs/README.md`
- `.qfai/contracts/README.md`
- `.qfai/evidence/README.md`
- `.qfai/assistant/steering/review-roster.yml`
- `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`
- `.qfai/report/preflight_summary.md`

## Preflight summary path

- `.qfai/report/preflight_summary.md`

## Open questions summary

- Open: 0
- Answered: 1
- Deferred: 0
- Notes: DR-0081 を spec-0027 の validator policy へ反映。

## Decisions made

- UI-bearing detection の primary SSOT を explicit surface classification に変更。
- content signals は fallback heuristic のみに限定。
- strategy validator を 5 required fields ベースに更新。
- screen contract validator expectation を route/actor/purpose/primary_tasks/required_states/transitions/observable_outcomes に更新。

## Work performed

- Updated:
  - `.qfai/specs/spec-0027/01_Spec.md`
  - `.qfai/specs/spec-0027/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0027/04_Business-Rules.md`
  - `.qfai/specs/spec-0027/05_Examples.md`
  - `.qfai/specs/spec-0027/06_Test-Cases.md`
  - `.qfai/specs/spec-0027/09_delta.md`
  - `.qfai/specs/spec-0027/10_Plan.md`

## Commands executed + key outputs

- `npx qfai validate --fail-on error --format github 2>&1 | Tee-Object -FilePath .qfai\report\validate.log`
  - latest run: `error=167 warning=94 info=3`
  - `spec-0027` coverage output regenerated and traceability remains structurally valid

## Validate evidence paths

- `.qfai/report/validate.log`
- `.qfai/report/validate.json`
- `.qfai/report/specs-coverage/spec-0027.md`
- `.qfai/report/run-20260330073104017/`

## Work Orders Summary

| Step | Role (sub-agent) | Task title                     | Input (refs)                                  | Output (refs)                         | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------------ | --------------------------------------------- | ------------------------------------- | -------------------- |
| 1    | default          | Capability probe               | skill start                                   | subagent probe `ok`                   | PASS                 |
| 2    | worker           | shared + spec-0026..0028 draft | master spec, discussion pack, spec-0026..0028 | delegated diff design for `spec-0027` | PASS                 |
| 3    | architect        | plan finalize                  | master spec, spec-0026..0033                  | `.qfai/specs/spec-0027/10_Plan.md`    | PASS                 |
| 4    | orchestrator     | integrate spec-0027 changes    | delegated outputs, local validation           | this evidence file                    | PASS                 |

## Gaps / Open risks

- Repo-wide `qfai validate` は既存 review/evidence/ATDD/TDD blockers で FAIL のまま。
- `spec-0027` 自体の layered traceability は coverage report 上で解消したが、 downstream test annotation hard gate は未解消。

## Final status

- Status: FAIL pending reviewer
- Confirmed by: orchestrator
