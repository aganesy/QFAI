# Retired user stories

Source: `.qfai/specs/spec-0013/02_User-stories.md`

## US-0013-0002

Catalog line (verbatim):

- US-0013-0002: Contract-First Phase

Section (verbatim):

## US-0013-0002: Contract-First Phase

As a QFAI user, I want contracts created/updated before spec slices, so that spec artifacts reference concrete contract definitions.


## US-0013-0004

Catalog line (verbatim):

- US-0013-0004: Batch Mode Processing

Section (verbatim):

## US-0013-0004: Batch Mode Processing

As a QFAI user, I want no-argument invocation to process all capabilities from `_policies/03_Capabilities.md`, so that multi-spec projects are handled in one run.


## US-0013-0007

Catalog line (verbatim):

- US-0013-0007: Delta Phase with Rejected Guardrails

Section (verbatim):

## US-0013-0007: Delta Phase with Rejected Guardrails

As a QFAI user, I want `09_delta.md` to include adoption/rejection rationale with DO NOT and Temptation sections, so that rejected options are guarded against reintroduction.


## US-0013-0013

Catalog line (verbatim):

- US-0013-0013: Auto-populate `surface_type: ui-bearing` frontmatter

Section (verbatim):

## US-0013-0013: Auto-populate `surface_type: ui-bearing` frontmatter

As a QFAI user running `/qfai-sdd`, I want the skill to set `surface_type: ui-bearing` frontmatter for every spec that has a `.qfai/contracts/ui/<spec>-*.yaml` companion and `qfai sdd lint` to warn (`D-SURFACE-TYPE-MISSING`) when the companion exists but the frontmatter is missing, so that UI-bearing specs are no longer hand-patched while `resolveAllUiBearingSpecs()` keeps requiring the frontmatter as the strict signal. (REQ-0163)


