# US-0002-0012: Shipped comment identifier guard

## User Story

As a maintainer of the QFAI package, I want `pnpm ci:lint` to fail on a source comment that carries a story-tree internal ID outside the sample band, or a requirement or test-design ID of any number, so that neither the new ID shapes nor references to this repository's own documents leak into the published type declarations.
