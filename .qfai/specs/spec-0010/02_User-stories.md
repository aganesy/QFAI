# 02 User Stories

## US Catalog

- US-0010-0001: Exploration Brief Authoring
- US-0010-0002: Reference Pool Authoring
- US-0010-0003: Design Anti-Goals
- US-0010-0004: Exploration Rubric
- US-0010-0005: Evaluator Calibration
- US-0010-0006: Screen Contracts
- US-0010-0007: Review Input Bundle
- US-0010-0008: No Early Winner
- US-0010-0009: DESIGN.md Draft Authoring
- US-0010-0010: Legacy Sidecar Drop
- US-0010-0011: Mock template emits anchor-form hrefs by default
- US-0010-0012: Discussion writes the active session pointer

## US-0010-0001: Exploration Brief Authoring

As a discussion facilitator, I want `30_exploration_brief.md` to define product intent, must-keep interactions, brand signals, and differentiation targets, so that prototyping starts from explicit exploration constraints.

## US-0010-0002: Reference Pool Authoring

As a designer, I want `31_reference_pool.md` to separate adopted and rejected reference signals, so that downstream remixing does not blindly follow a single template.

## US-0010-0003: Design Anti-Goals

As a reviewer, I want explicit anti-goals and recurrence prevention notes, so that bland or generic directions are easier to reject later.

## US-0010-0004: Exploration Rubric

As an evaluator, I want a rubric centered on design quality, originality, craft, and functionality, so that critique is aligned to the exploration-first harness.

## US-0010-0005: Evaluator Calibration

As a maintainer, I want examples of good critique and overly lenient critique, so that evaluation quality can be calibrated before prototyping.

## US-0010-0006: Screen Contracts

As an implementer, I want `40_screen_contracts.md` to capture screen obligations and required states, so that downstream UI contracts can be normalized deterministically.

## US-0010-0007: Review Input Bundle

As a prototyping reviewer, I want `50_review_input_bundle.md` to mention best-of-history and exploration focus, so that later iterations are not assumed to be better by default.

## US-0010-0008: No Early Winner

As a QFAI user, I want discussion to stop short of selecting the winning visual direction, so that breakthrough can still happen inside prototyping.

## US-0010-0009: DESIGN.md Draft Authoring

As a designer, I want `/qfai-discussion` to author root `DESIGN.md` so brand vision / visual identity become the single source of truth for downstream skills.

## US-0010-0010: Legacy Sidecar Drop

As a QFAI maintainer, I want `/qfai-discussion` to no longer emit legacy sidecars (`33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`) so v2.0 / UX-loop runs cannot inherit deprecated framing.

## US-0010-0011: Mock template emits anchor-form hrefs by default

As a discussion author writing HTML mocks in `03_Story-Workshop.md`, I want the `qfai-discussion` template to emit anchor-form `<a href="#<name>">` links by default and SKILL.md to instruct me accordingly, so that mocks never encode same-origin routes the prototype cannot serve and `QFAI-MOCK-010` keeps passing without relaxing the validator. (REQ-0154 / DR-0265)

## US-0010-0012: Discussion writes the active session pointer

As a QFAI user finishing a `/qfai-discussion` run, I want the skill to write `.qfai/state.json#discussion.currentId` so the just-authored pack becomes the discoverable active session for downstream skills, and I want a clear error naming the candidate dirs and the recovery command when the active pointer is missing or ambiguous. (REQ-0155 / DR-0266)
