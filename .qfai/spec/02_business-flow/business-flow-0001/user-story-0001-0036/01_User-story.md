# US-0001-0036: assistantPaths.ts SSOT module

## User Story

As a maintainer, I want every assistant-tree path string that init, validate and the skill bodies read to come from the one module `packages/qfai/src/core/paths/assistantPaths.ts`, so that no hard-coded path literal can drift from the rest.

## Non-goals

- Redesigning the existing `qfai.config.yaml#paths.*` fields.
