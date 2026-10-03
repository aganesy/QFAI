---
name: verify-advisory
owner: qfai-verify
purpose: "Prepare the security advisory, the CVE request and the coordinated disclosure for a fixed vulnerability, without publishing any of them."
requires: [common-evidence-record]
roles: [orchestrator, doc-steward]
routing-profile: default
---

# verify-advisory

A fixed vulnerability still needs its users told, at a time agreed with the
reporter. This step prepares that and publishes nothing.

## Reads

- What `triage-security-intake` recorded: the severity, the affected versions,
  the reporter and any embargo.
- The diagnosis and the fix.
- The project's security policy, where it has one.

## Writes

Only a git-ignored record under `.qfai/evidence/`, holding:

- the advisory draft: a summary, the affected versions, the fixed release,
  the severity and how it was scored, the impact, any workaround, and the
  credit;
- the fields a CVE request needs;
- the disclosure plan: who is told, when, and when the embargo ends.

No tracked file, commit message or public text of this run names the
vulnerability before the disclosure date.

## Procedure

1. Draft the advisory from the intake record and the fix.
2. Leave the fixed release as the release the user names. Choosing a version
   is not this step's.
3. Hand the draft to the release point. Publishing the advisory, requesting a
   CVE and telling anyone are each the operator's, at that point.

## Gate

- The draft carries every part listed under Writes.
- Nothing was published, requested or sent.
- The completion reviewer checked the draft against the intake record and the
  fix.
