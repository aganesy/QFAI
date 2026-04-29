# Prototype Workspace

## Purpose

`.qfai/prototypes/` contains disposable prototype source files for visual exploration.
These files are not production implementation and must not be treated as the target app architecture.

## Layout

Use this structure unless a local run needs a short-lived helper file:

```text
.qfai/prototypes/
  rounds/
    r5/candidates/<candidate-id>/index.html
    r3/candidates/<candidate-id>/index.html
    r2/candidates/<candidate-id>/index.html
    r1/candidates/<candidate-id>/index.html
  winner/index.html
  assets/
```

## Authoring Rules

- Prefer one self-contained `index.html` per candidate with embedded CSS and minimal JavaScript.
- Use relative links or hash routes to model screen transitions.
- Represent required states: default, loading, empty, error, and success when applicable.
- Keep fake data visibly realistic enough for visual review, but do not encode production data models.
- Do not import the product app's source modules, routing, stores, API clients, or build system.
- If static HTML cannot represent the design decision, record why before using React or a project-specific stack.

## Serving Rules

- Serve `.qfai/prototypes/` from a local HTTP URL before running capture.
- Pass that URL to `qfai prototyping round-start --target-url <url>`.
- Capture evidence only from the served prototype, never from a file path opened manually.

## Handoff

After winner selection, mirror the accepted state to:

- `.qfai/prototypes/winner/index.html`
- `.qfai/contracts/design/prototype-handoff.yaml`

The handoff must say what implementation must preserve, may adapt, and must not copy.
