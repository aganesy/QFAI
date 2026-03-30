# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                              | Expected                                                                                                         | Notes                                   |
| ------------ | ------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| EX-0035-0001 | BR-0035-0001 | Discussion pack with `surface: web-ui` in metadata                                                 | Detection module returns `web-ui`; sidecar generation triggered                                                  | Explicit web-ui: sidecar generated      |
| EX-0035-0002 | BR-0035-0001 | Discussion pack with `surface: non-ui` in metadata                                                 | Detection module returns `non-ui`; sidecar generation skipped                                                    | Non-ui: sidecar skipped                 |
| EX-0035-0003 | BR-0035-0002 | Discussion pack with no explicit surface but web endpoint references in content                     | Heuristic fallback classifies based on content; surface type classification wins over interaction complexity       | Ambiguous web endpoint: surface type wins |
| EX-0035-0004 | BR-0035-0002 | Same discussion pack input provided twice to detection module                                       | Both invocations return identical surface type result                                                             | Determinism: same input same output     |
| EX-0035-0005 | BR-0035-0003 | Validator imports detection module and calls `detectSurfaceType(pack)`                              | Validator receives surface type enum; no inline parsing performed                                                | Shared module consumption               |
| EX-0035-0006 | BR-0035-0004 | `uixDetection.ts` after refactor                                                                    | File contains import of shared detection module; no inline `surface` field parsing                               | Duplicate removal verified              |
| EX-0035-0007 | BR-0035-0005 | Non-ui project runs full validator suite                                                            | All UI-bearing validators return n/a status; no errors or warnings produced                                      | Non-UI safety: no over-fire             |
| EX-0035-0008 | BR-0035-0006 | Prototyping SKILL.md scanned for banned phrases                                                     | Zero matches for "must run runtime checks", "UI routes reachable", "API non-404", "DB objects present"           | Banned phrase scan: clean               |
| EX-0035-0009 | BR-0035-0007 | Prototyping SKILL.md read for mode descriptions                                                     | low-cost, standard, and full-harness modes each present with obligations table                                   | Three modes documented                  |
| EX-0035-0010 | BR-0035-0008 | Non-UI project reads prototyping skill guidance                                                     | Visual-review and UI-specific steps marked as n/a                                                                | Non-UI n/a path documented              |
| EX-0035-0011 | BR-0035-0009 | User runs `qfai prototyping --mode full-harness`                                                    | CLI starts full-harness workflow (not routing guidance output)                                                    | CLI entrypoint: starts workflow         |
| EX-0035-0012 | BR-0035-0009 | User invokes `/qfai-prototyping-full-harness` skill                                                 | Skill starts full-harness workflow (not routing guidance output)                                                  | Skill entrypoint: starts workflow       |
| EX-0035-0013 | BR-0035-0010 | Full-harness iteration completes evidence collection                                                | Evidence artifacts (render evidence, test results, validator output) are present in iteration output              | Evidence obligations met                |
| EX-0035-0014 | BR-0035-0011 | Full-harness iteration invokes reviewer                                                             | Reviewer receives evidence and spec context; produces review findings that feed into next iteration              | Reviewer obligations met                |
| EX-0035-0015 | BR-0035-0013 | Full-harness reaches convergence criteria                                                           | Loop exits; final evidence, review summary, and calibration result are recorded                                  | Loop convergence exit                   |
| EX-0035-0016 | BR-0035-0012 | Full-harness iteration runs calibration checks before declaring convergence                          | Calibration verifies scoring-ready schema alignment and threshold enforcement; premature exit is prevented        | Calibration obligations met             |
