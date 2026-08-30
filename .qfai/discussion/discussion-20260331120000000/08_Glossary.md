# 08 Glossary

## Purpose

Domain terminology definitions for QFAI v1.7.11. All terms are scoped to the QFAI framework and its specification-driven development model.

## Terms

### canonical model

The 3-layer evaluation model (invariant / trend-derived / product-specific) that is the target architecture for the v1.7 series. This model replaces the legacy 4-axis model and serves as the single source of truth for evaluation structure.

### 3-layer evaluation

Evaluation approach consisting of three layers: invariant axes (stable quality attributes), trend-derived axes (axes informed by current design trends with freshness tracking), and product-specific axes (axes specific to the individual project). Replaces the former fixed 4-axis model.

### 4-axis model (legacy)

The former fixed evaluation model using usability, consistency, accessibility, and delight as its four axes. Deprecated in favor of the 3-layer evaluation model. Existing projects using this model receive migration guidance rather than hard failures.

### UI-bearing

A project surface type classification indicating that the project has a user interface. Includes `web-ui`, `mobile-ui`, `desktop-ui`, and `mixed` surface types. UI-bearing projects require UI/UX sidecar artifacts to be generated alongside the main discussion pack.

### non-ui

A project surface type classification for projects without a graphical user interface. Includes `cli`, `api`, and `library` surface types. Non-ui projects are exempt from UI/UX sidecar requirements and must not be penalized by UI-bearing validation rules.

### sidecar

The set of UI/UX artifact files (stored in the `uiux/` directory) generated alongside the main discussion pack for UI-bearing projects. Includes design taste interview results, trend scans, anchor screen specifications, and screen contracts.

### truth-path

The production code path through which a validator or capability is actually invoked and enforced during a real `qfai validate` run. Distinguished from mere module existence: a feature is only "implemented" if it has an active truth-path.

### completion release

A release focused on finishing previously designed but incompletely integrated work. No new features are introduced; the scope is limited to completing, correcting, and integrating existing designs. QFAI v1.7.11 is a completion release.

### convergence

The process of aligning all repository layers (source code, tests, specs, steering, documentation, assets) to speak the same architectural truth. Convergence eliminates drift between what the code does, what the specs say, and what the docs claim.

### strong schema

A structured YAML or object format with required fields, type constraints, and validation rules. Replaces weak free-text formats where important metadata was captured as unstructured prose. Strong schemas enable automated validation and consistency checking.

### production path

The code execution path invoked during actual `qfai validate` runs. Distinguished from test-only paths or module-level exports that exist but are never called in production. A capability is only "real" if it has a production path.

### render evidence

The capture of HTML, DOM, or screenshot artifacts during prototyping for verification purposes. Render evidence proves that a UI component or screen actually renders as specified, rather than merely existing as code.

### phase runner

An individual execution unit within browser QA validation. Each phase runner handles one aspect of quality assessment: smoke testing, visual regression, interaction testing, or accessibility auditing.

### migration check

A validator that detects legacy artifacts (e.g., 4-axis model configurations) and provides upgrade guidance. The migration check emits warnings with remediation steps before any hard-fail, ensuring a non-destructive transition path for existing projects.

### design taste interview

A structured interview for capturing design preferences in UI-bearing projects. The interview collects aesthetic preferences, brand alignment, interaction style, and visual hierarchy priorities to inform design decisions.

### trend scan

Research and reference analysis for current design trends, with freshness and confidence tracking. Trend scans feed the trend-derived layer of the 3-layer evaluation model and include metadata about when the research was conducted and how confident the findings are.

### aggregate scoring

The combined evaluation score computed from all three layers (invariant, trend-derived, product-specific) plus any dynamic overrides. Aggregate scoring produces the final quality assessment for a project.

### anchor screen

The primary screen selected for detailed design specification in UI-bearing projects. The anchor screen serves as the reference implementation from which design patterns, component usage, and interaction models are derived.

### screen contract

A behavior-level specification for a screen, including states (loading, empty, error, populated), transitions (user actions and their effects), and outcomes (expected results of completing a workflow on that screen). Screen contracts are part of the UI/UX sidecar.
