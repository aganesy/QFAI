# specs/
A **spec pack** lives under `specs/spec-XXXX/` and contains:
- `spec.md`          : SDD spec (source of truth for behavior)
- `delta.md`         : impact / migration / verification plan
- `scenario.feature` : Gherkin scenarios (ATDD skeleton)

Create/update spec packs with `/qfai-spec`.

Note: After `qfai init`, this folder contains only this README. Spec packs (`spec-XXXX/`) are created by running `/qfai-spec`.
