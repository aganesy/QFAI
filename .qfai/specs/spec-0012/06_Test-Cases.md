# 06 Test Cases

## Active v1.7.16+ Cases

### TC-0012-0285

- Delegation Scope Table lists the 4 required categories and valid roles.

### TC-0012-0286

- Invalid delegation role is surfaced as a violation.

### TC-0012-0287

- `executionPlan` validator requires the 4 named fields when the legacy slice is exercised.

### TC-0012-0288

- Missing `executionPlan` in the legacy validation slice produces an error.

### TC-0012-0289

- Iteration gate rejects a single-iteration converged state.

### TC-0012-0290

- Missing `scoringTrace[].screenshotDir` in the legacy validation slice produces an error.

### TC-0012-0291

- `capture-screenshots.js` exists and fails closed instead of generating fake PNG evidence.

### TC-0012-0292

- Skill documents canonical screenshot and HTML evidence paths.

### TC-0012-0293

- Skill documents the 5-step iteration cycle.

### TC-0012-0294

- Delegation map validator accepts only declared roles/categories.

### TC-0012-0295

- Invalid delegation map entries are surfaced as findings.

### TC-0012-0296

- Evaluator input protocol names screenshots, HTML snapshots, axisDefs, previousScore, and designSystemChecklist.

### TC-0012-0297

- Reviewer guidance detects missing evaluator inputs.

### TC-0012-0298

- Visual Quality Structural Checklist enumerates 6 categories.

### TC-0012-0299

- Legacy Lighthouse gate passes when web evidence is present.

### TC-0012-0300

- Legacy Lighthouse gate errors when required web evidence is absent.

### TC-0012-0301

- designSystemCompliance above threshold passes when `12_design_system.md` exists.

### TC-0012-0302

- designSystemCompliance below threshold surfaces a finding when `12_design_system.md` exists.

### TC-0012-0303

- designSystemCompliance is skipped when `12_design_system.md` is absent.

### TC-0012-0304

- Calibration overrides apply when provided.

### TC-0012-0305

- Defaults are preserved when calibration overrides are absent.

## Legacy Coverage Continuity

- `TC-0012-0001..TC-0012-0284` remain reserved traceability IDs for existing implementation/test slices.
- Their pre-runtime-removal narratives are superseded by the current skill-first execution model.
