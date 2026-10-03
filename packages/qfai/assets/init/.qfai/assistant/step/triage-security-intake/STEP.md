---
name: triage-security-intake
owner: qfai-triage
purpose: "Take a vulnerability report in privately, set its severity, and hold back anything that would publish it before the fix is ready."
requires: []
roles: [solution-architect, completion-reviewer]
routing-profile: default
---

# triage-security-intake

A report of an exploitable weakness is handled before anything else, and out
of public view.

## Reads

- The report, and any proof of concept it carries.
- The code and the released versions the weakness may reach.

## Procedure

1. Keep the report private. Nothing about it goes into a tracked file, a public
   item, a commit message or a pull request.
2. Confirm what an attacker can do, under what conditions, and which released
   versions are affected.
3. Set the severity, with the reason for it.
4. Name what must wait until the fix is ready to disclose: a public item, a
   release note, a commit that describes the weakness.

Setting the severity is this step's decision point. Where the run stops there
for the operator, put the severity and its reason to them before recording it.

## What it writes

- No file git tracks. The intake record goes in a file git ignores, named in
  `artifactRefs`.
- The severity, the affected versions and what is held back, in the result.

## Gate

The reviewer confirms the severity names its reason, the affected versions are
stated, nothing about the report reached a tracked or public place, and no
tracked file changed.
