# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                       | Expected                                                                                                                            | Notes                               |
| ------------ | ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| EX-0036-0001 | BR-0036-0001 | Render evidence capture invoked with available environment                  | Result: `{ status: "captured", data: { ... } }`                                                                                    | Happy path: capture success         |
| EX-0036-0002 | BR-0036-0002 | Render evidence capture invoked without browser/capture environment         | Result: `{ status: "skipped", reason: "No browser environment available", alternative: "Run capture manually with browser dev tools" }` | No environment: skipped + reason    |
| EX-0036-0003 | BR-0036-0004 | Render evidence with 3 targets: 2 succeed, 1 fails (timeout)               | Result: `{ capturedItems: [item1, item2], failedItems: [{ target: item3, reason: "Capture timeout" }] }`                           | Partial capture: mixed result       |
| EX-0036-0004 | BR-0036-0005 | Invoke render evidence CLI path after implementation                        | Output does not contain "not implemented in this slice"; actual capture logic is invoked                                            | Placeholder removal verified        |
| EX-0036-0005 | BR-0036-0006 | Browser QA smoke phase with valid URL `http://localhost:3000`               | Findings: `[{ selector: "img:not([alt])", issue: "Image missing alt text", severity: "warning", suggestion: "Add alt attribute" }]` | Happy path: smoke findings          |
| EX-0036-0006 | BR-0036-0008 | Browser QA invoked with no URL (undefined)                                  | Result: `{ type: "error", message: "URL is required for browser QA" }`                                                             | No URL: structured error            |
| EX-0036-0007 | BR-0036-0006 | Browser QA smoke + visual phases with valid URL                             | Smoke findings array (non-empty) + visual findings array (non-empty)                                                                | Both phases return findings         |
| EX-0036-0008 | BR-0036-0009 | Browser QA for non-web project (no applicable URL)                          | Result: `{ type: "error", message: "No applicable URL for browser QA; phase skipped as n/a" }`                                     | Non-web project: n/a skip           |
| EX-0036-0009 | BR-0036-0003 | Render evidence skipped due to headless environment                         | Result includes `alternative: "Use local development server with browser for manual capture"`                                       | Alternative suggestion present      |
| EX-0036-0010 | BR-0036-0007 | Browser QA visual phase with valid URL `http://localhost:3000`              | Findings: `[{ selector: ".hero-banner", issue: "Low contrast ratio between text and background", severity: "error", suggestion: "Increase contrast to meet WCAG AA (4.5:1 minimum)" }]` | Happy path: visual finding structure |
