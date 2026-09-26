# 02 User Stories

## US Catalog

- US-0002-0001: 15-file discussion-pack structure
- US-0002-0002: OQ-driven completion
- US-0002-0003: UI-bearing detection
- US-0002-0005: planner-first design authoring
- US-0002-0008: discussion-to-SDD handoff
- US-0002-0009: non-UI safe skip
- US-0002-0010: direct-pack validator alignment

> v1.8.9: US-0002-0004 / 0006 / 0007 (the legacy exploration-first
> sidecar / evaluator-calibration / best-of-history bundle stories)
> were retired together with REQ-0006..0011 and the
> `discussionDesignHardening` validator. Their downstream
> behaviors are owned by the post-1.8.9 prototyping spec, which
> anchors brand SSOT in root `DESIGN.md` and the
> `validateDesignContractReadiness` family. The corresponding AC /
> BR / EX / TC / TDD ledger rows are retired in their own files
> (see retirement notes there).

## US-0002-0001: 15-file discussion-pack structure

As a QFAI user, I want `/qfai-discussion` to produce the canonical 15-file discussion pack, so that requirements, sources, OQs, review input, and delta are captured in one place.

## US-0002-0002: OQ-driven completion

As a project lead, I want discussion to stop until `Disposition: open` is zero, so that unresolved ambiguity does not leak into `/qfai-sdd`.

## US-0002-0003: UI-bearing detection

As a maintainer, I want UI-bearing detection to control whether exploration-first sidecars are required, so that non-UI packs do not over-fire UI validators.

## US-0002-0005: planner-first design authoring

As a discussion facilitator, I want discussion to define exploration conditions and anti-goals without selecting a visual winner, so that prototyping remains the place where design direction is chosen.

## US-0002-0008: discussion-to-SDD handoff

As a QFAI user, I want discussion outputs to hand off cleanly into `/qfai-sdd`, so that contracts can be normalized without guessing.

## US-0002-0009: non-UI safe skip

As a non-UI project owner, I want UI sidecar requirements to be skipped safely, so that discussion completion is not blocked by irrelevant design artifacts.

## US-0002-0010: direct-pack validator alignment

As a maintainer, I want direct discussion-pack validators to check the new sidecar family and headings, so that validator behavior matches the shipped discussion template.
