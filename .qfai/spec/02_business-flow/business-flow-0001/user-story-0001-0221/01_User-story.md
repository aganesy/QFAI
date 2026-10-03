# US-0001-0221: Judge the router against labelled requests before a release

## User Story

As a maintainer, I want the extraction and the decision rules scored against labelled requests for every route before a release, with the safety cases required to pass, so that a release never ships a router that misses a security report or a data-loss risk.

## Non-goals

- Running the scored evaluation on every pull request.
- Copying another project's issue text into the repository.
