# US-0002-0012: Shipped comment identifier guard

## User Story

As a maintainer of the QFAI package, I want `pnpm ci:lint` to fail on a source comment that carries a story-tree internal ID outside the sample band, so that the new ID shapes cannot leak into the published type declarations.
