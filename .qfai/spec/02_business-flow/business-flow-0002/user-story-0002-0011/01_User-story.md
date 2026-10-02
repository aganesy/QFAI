# US-0002-0011: Discussion-pack location gate

## User Story

As a contributor opening a pull request, I want a `check-pack-locations.mjs` lane in `pnpm ci:lint` to reject a `review-*/` or `discussion-*/` directory added outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`) with an `R-PACK-LOCATION-DRIFT` finding that cites `.agents/rules/root-additions-policy.md` and proposes the correct path, so that the root-additions rule is enforced by a check rather than by reading.
