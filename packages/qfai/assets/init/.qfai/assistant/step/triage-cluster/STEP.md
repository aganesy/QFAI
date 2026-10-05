---
name: triage-cluster
owner: qfai-triage
purpose: "Group automated reports by the signature of their failure, and separate the groups caused by an environment from those caused by the product."
requires: []
roles: [devops-ci-engineer, frontend-engineer, backend-engineer]
routing-profile: default
---

# triage-cluster

Automated reports, such as crash reports a service collects, arrive many at a
time and mostly repeat. This step turns them into a few groups.

## Reads

- The reports: their stack traces, messages, versions and environments.
- The project's code, to tell whether a frame is the product's own.

## Procedure

1. Derive a signature for each report from the frames and message that identify
   the failure, not from the details that vary between runs.
2. Group the reports by signature, and count each group.
3. Mark each group as an environment cause, such as an unsupported platform or
   a misconfigured host, or a product cause, citing what decides it.
4. Hand each product-cause group to `triage-close` as a follow-up defect
   report. Fix nothing here.

## What it writes

- No file git tracks. A record it writes that git ignores is named in
  `artifactRefs`, not in `changedFiles`.
- The groups, their counts and their cause, in the result.

## Gate

The reviewer confirms every report falls in exactly one group, each cause cites
what decides it, each product-cause group is a follow-up, and no tracked file
changed.
