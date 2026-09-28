# US-0001-0121: Stock-photo source provenance

## User Story

As a downstream `/qfai-implement` consumer, I want every image slot filled from an allowlisted free stock-photo source and recorded as `{url, license, attribution, source}` in `prototyping.json#imageSources[]`, so that legal and compliance review can verify provenance without re-reading the prototype HTML.
