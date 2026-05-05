# discussion

## Purpose

`discussion/` stores the unified discussion pack that merges interview outputs (discuss) and requirement intake (require). Discussion packs use 15 required markdown files. UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.

This directory does not directly update `specs/`; it prepares decisions, requirements, open questions, and rationale as inputs for `/qfai-sdd`.

Generated discussion packs (`discussion-YYYYMMDDhhmmssSSS/`) are not version-controlled by default. Only `README.md` is tracked in Git. Ignore rules are managed in the project root `.gitignore` by `qfai init`. Historic discussion packs that were previously committed should be referenced via Git history only.

## Required structure

```text
discussion/
├── README.md
└── discussion-YYYYMMDDhhmmssSSS/
    ├── 01_Context.md
    ├── 02_Inception-Deck.md
    ├── 03_Story-Workshop.md
    ├── 04_Sources.md
    ├── 05_Scope.md
    ├── 06_REQ.md
    ├── 07_NFR.md
    ├── 08_Glossary.md
    ├── 09_Constraints.md
    ├── 10_Policy.md
    ├── 11_OQ-Register.md
    ├── 12_OQ-Resolution-Log.md
    ├── 13_Deferred.md
    ├── 14_Review-Request.md
    ├── 99_delta.md
    └── prototyping.yaml  # optional recommendation artifact for UI-bearing packs
```

## File responsibilities

- `01_Context.md` – Background, purpose, stakeholders, assumptions, and issues.
- `02_Inception-Deck.md` – Inception Deck (10 questions) for ambiguity removal and alignment.
- `03_Story-Workshop.md` – Story workshop with user stories, user flows, and Mermaid diagrams.
- `04_Sources.md` – Source registry, trend scan, competitive reference registry, and traceability. This is the canonical location for trend translation, competitive analysis, and source-to-requirement traceability (`SRC-XXXX` IDs).
- `05_Scope.md` – Scope, out-of-scope, constraints, and success criteria.
- `06_REQ.md` – Functional requirements list (`REQ-0001` format).
- `07_NFR.md` – Non-functional requirements list (`NFR-0001` format).
- `08_Glossary.md` – Glossary and term definitions.
- `09_Constraints.md` – Constraints (technical, operational, legal, budget, deadline).
- `10_Policy.md` – Policies (security, compliance, etc.).
- `11_OQ-Register.md` – OQ register with mandatory columns.
- `12_OQ-Resolution-Log.md` – OQ resolution log (append-only timeline).
- `13_Deferred.md` – Deferred OQ details with mandatory metadata.
- `14_Review-Request.md` – Review request for review artifact generation.
- `99_delta.md` – Change history (adopted, rejected, drift, recurrence prevention).

## UI/UX canonical family

For UI-bearing packs, the canonical exploration-first source-of-truth is:

- `04_Sources.md` for trend translation and competitive reference registry
- `uiux/30_exploration_brief.md`
- `uiux/31_reference_pool.md`
- `uiux/32_design_anti_goals.md`
- `uiux/33_exploration_rubric.md`
- `uiux/34_evaluator_calibration.md`
- `uiux/40_screen_contracts.md`

Discussion must not choose a single winner or finalize a design system. Those are downstream prototyping outputs.

## OQ Register rules

`11_OQ-Register.md` must include these mandatory columns:

| Column              | Description                                          |
| ------------------- | ---------------------------------------------------- |
| OQ-ID               | `OQ-0001` format                                     |
| Title               | Short descriptive title                              |
| Gate                | `discussion`, `sdd`, `atdd`, `tdd`, or `ops`         |
| Disposition         | `open`, `resolved`, `deferred`, or `rejected`        |
| Owner               | `user`, `agent`, or `team`                           |
| Rationale           | Required for `deferred` and `rejected`               |
| Options             | At least two alternatives and one recommended option |
| Recommendation      | Explicitly stated recommended option                 |
| Next-Decision-Point | Required for `deferred`                              |
| Due                 | Target date or milestone                             |
| Evidence            | Reference to conversation log, source, or artifact   |

- Before discussion completion, `Disposition: open` count must be zero.
- `deferred` is allowed only when all mandatory metadata is complete.

## Deferred rules

`13_Deferred.md` must include these mandatory columns:

| Column          | Description                                        |
| --------------- | -------------------------------------------------- |
| OQ-ID           | `OQ-0001` format                                   |
| Title           | Short descriptive title                            |
| Gate            | `discussion`, `sdd`, `atdd`, `tdd`, or `ops`       |
| Deferred-Reason | Why deferral is justified                          |
| Deferred-Until  | Milestone, date, or trigger                        |
| Owner           | `user`, `agent`, or `team`                         |
| Due             | Target resolution date                             |
| Severity        | `high`, `medium`, or `low`                         |
| Impact          | Impact on spec/tests/implementation/operations     |
| Mitigation      | Temporary workaround or risk reduction             |
| Evidence        | Reference to conversation log, source, or artifact |

- Every deferred item must have all columns populated.
- `Deferred-Until` must define when and by what signal re-evaluation happens.
- If there are no deferred items, keep the table header and add a single `0 items` row instead of replacing the section with plain text.

## Rules

- Run interviews and requirement capture in a single pass until `Disposition: open` is zero in `11_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete in `13_Deferred.md`.
- Discussion outputs are logs and rationale. Do not duplicate spec SSOT from `.qfai/specs/**`.
- `03_Story-Workshop.md` must include at least one Mermaid diagram in ` ```mermaid ` fences.
- If diagrams are written elsewhere, use ` ```mermaid ` fences only (do not use ` ```text ` or language-less fences).
- Use timestamp directory naming for new outputs: `discussion-YYYYMMDDhhmmssSSS`.
- `14_Review-Request.md` must reference routing SSOT: `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.

## prototyping.yaml (Optional Recommendation Artifact)

UI-bearing discussion packs (`ui_bearing: true`) may include a `prototyping.yaml` file to record a recommended prototyping mode. Non-UI discussion packs (`ui_bearing: false`) typically omit `prototyping.yaml`.

### Canonical namespaced schema (when present)

The three modes (`low-cost`, `standard`, `full-harness`) share the same evidence obligations and validator gates; the only mode-dependent value is `maxCycles` (1 / 3 / 20). Choose `recommended_mode` based on the project's iteration budget, and list every mode the project allows under `allowed_modes`.

```yaml
prototyping:
  recommended_mode: standard
  rationale: Standard mode (maxCycles=3) matches our review cadence.
  allowed_modes:
    - low-cost
    - standard
    - full-harness
  surface: web
```

### Field reference

If you create this artifact, populate all 4 fields.

| Field              | Required | Description                                                                |
| ------------------ | -------- | -------------------------------------------------------------------------- |
| `recommended_mode` | yes      | One of `low-cost`, `standard`, `full-harness`                              |
| `rationale`        | yes      | Non-empty string explaining the recommendation                             |
| `allowed_modes`    | yes      | Unique non-empty array drawn from `low-cost` / `standard` / `full-harness` |
| `surface`          | yes      | `web`, `mobile`, `desktop`, or `mixed`                                     |

### Current behavior

- Current discussion-pack readiness does not block on missing `prototyping.yaml`.
- When `prototyping.yaml` is present, prefer the canonical namespaced schema under the `prototyping:` key.
- `recommended_mode` MUST be included in `allowed_modes`.
- Mode invariant (spec-0012 REQ-0012-0036): the three modes share obligations except for `maxCycles` (1 for `low-cost`, 3 for `standard`, 20 for `full-harness`). Picking a different mode does not relax any other gate.

## Suggested naming

- `discussion-20260303120000000`
- Keep generated names immutable once referenced by downstream work.
