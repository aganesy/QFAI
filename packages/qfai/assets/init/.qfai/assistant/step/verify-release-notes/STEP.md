---
name: verify-release-notes
owner: qfai-verify
purpose: "Draft the release notes for a release from the changes it contains."
requires: []
roles: [orchestrator, doc-steward]
routing-profile: default
---

# verify-release-notes

Drafts what a user reads about a release. It releases nothing.

## Reads

- The changelog's unreleased section, where the project keeps a changelog.
- The changes merged since the last release, from the history.
- The format the project's earlier release notes use.
- The version the user named, if any.

## Writes

Only the release-notes files the work order's scope names, or, invoked by
name, the file the request names.

## Procedure

1. Collect every change a user sees since the last release.
2. Group them by what a user does, in the project's format. Put breaking
   changes first, each with its migration step.
3. Credit the contributors the changes name.
4. Use the version the user named. Where none is named, the draft carries no
   version, and the report says the version is the user's to name.

Creating a tag, publishing, changing the version field and renaming the
changelog's unreleased section each need the user's own instruction, as
`.agents/rules/version-discipline.md` says.

## Gate

- Every change a user sees since the last release appears in the draft.
- Every breaking change names its migration step.
- Only the named files were written, and no tag, publication or version edit
  was made.
