# 10 Plan

## Implementation approach

1. `/qfai-verify` は repo gates と `qfai validate --fail-on error` を必ず実行する
2. downstream quality gate は contract-first validator 群を truth source にする
3. review artifact の `PASS` / `REVISE` と unresolved blocking findings を completion 判定に統合する
4. direct discussion-pack canonical validators は coexist してよいが、repo-root completion path の primary dependency にしない
5. verify summary は fix loop に必要な validate/review/evidence の要点を残す

## Test approach

- Unit tests: verify summary formatting, PASS/REVISE interpretation, contract-first issue grouping
- Integration tests: verify executes repo gates and validate in the correct order
- E2E tests: UI-bearing project with missing screenshot/html or missing design contract fails until corrected

## Dependencies

- Requires: `/qfai-sdd` により生成された specs/contracts
- Requires: review artifacts and validate output
- Consumed by: completion gate, PR handoff

## Risk mitigation

- historical validator wording に `full-harness` や discussion-side 用語が残る可能性
- mitigation: active path と historical vocabulary を区別し、public guidance では contract-first posture のみを説明する

## SaaS-Package Certify Scope (REQ-0166 certify side, v1.9.2)

- How: `qfai prototyping certify --scope saas-package` writes `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field enumerating each skipped gate (the ATDD / implement-class gates that the spec-0004 validate profile skips).
- How: the certify path withholds any field that would assert full DONE while scope is `saas-package`.
- How: `--upgrade-scope full` re-checks every gate named in `notes:`; it rejects with a message naming still-missing gates and upgrades the sealed certificate to full scope only once all PASS.
- How: `/qfai-prototyping` SKILL.md documents `--scope saas-package` as a SaaS-tenant delivery mode.
- Test strategy: integration test for the seal (`scope` + `notes:`, no full-DONE claim) and the `--upgrade-scope full` reject-then-allow boundary; both assert CLI shape (flags, certificate field shape).
