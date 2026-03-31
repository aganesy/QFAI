# 03 Acceptance Criteria

## AC-0009-0001: Repository Analysis Completeness

Given a repository with test files, when `/qfai-configure` analyzes the project, then it identifies test frameworks, test directories, naming conventions, and package manager.

## AC-0009-0002: Glob Pattern Coverage

Given the analysis results, when glob patterns are proposed, then 3-10 include patterns cover all discovered test locations and no overly broad patterns (e.g., `**/*`) are used.

## AC-0009-0003: Config Minimal Diff

Given `qfai.config.yaml`, when configuration is updated, then only `validation.traceability.testFileGlobs` and optionally `testFileExcludeGlobs` are changed (minimal diff).

## AC-0009-0004: Steering Files Evidence-Based

Given steering templates, when they are populated, then content is derived from repository evidence only; unverifiable items are marked `TBD`.

## AC-0009-0005: Evidence Sampling Produces Matches

Given proposed glob patterns, when evidence sampling runs, then 5-15 actual test files are listed. Zero matches triggers a stop-and-ask.

## AC-0009-0006: Tool Selection Rationale Recorded

Given the configure workflow, when tool selection is made per layer, then rationale is recorded in the evidence file.

## AC-0009-0007: Minimum Runnable Path Documented

Given the project, when configuration completes, then a minimum runnable path (dev server, DB, env, commands) is documented.
