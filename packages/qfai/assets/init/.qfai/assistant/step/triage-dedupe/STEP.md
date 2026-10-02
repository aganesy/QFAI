---
name: triage-dedupe
owner: qfai-triage
purpose: "Find the item a request repeats or the one that replaced it, check that the request's premise still holds, and link the two."
requires: []
roles: [discovery-analyst, completion-reviewer]
routing-profile: default
---

# triage-dedupe

A request that repeats an existing item, or that rests on something already
changed, needs a link, not new work.

## Reads

- The request.
- The project's open and closed items, and its change history.

## Procedure

1. Search for an item that states the same problem or request, and for one
   that replaced it.
2. Compare them on what the request actually reports, not on its title. Two
   reports with the same symptom and different causes are not duplicates.
3. Check the premise: whether the behaviour, version or file the request
   relies on still exists as it describes.
4. Record the result:
   - a duplicate, linked to the item it repeats;
   - a premise that no longer holds, linked to the change that ended it;
   - neither, which leaves the request to the rest of the route.

## What it writes

- No file git tracks. Linking is recorded in the result and the report; this
  step does not edit the items it links.

## Gate

The reviewer confirms a duplicate names the item it repeats and why they are the
same, a premise found stale names the change that ended it, and no tracked file
changed.
