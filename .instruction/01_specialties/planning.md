---
category: specialties
update-frequency: occasional
dependencies: [00_universal/thinking.md, 00_universal/quality.md]
version: 1.0.0
---

# How to Make a Plan

A planning procedure for carrying out complex tasks safely.

## When to Plan

- Always make a plan for a task of three or more steps, one that spans multiple areas, or one that is high-risk.

## Template

```text
1. Goal: Purpose and completion criteria
2. Inputs: Specifications, constraints and dependencies
3. Scope: What will and will not be done
4. Steps: Split into small units of work (about 1 to 2 hours each)
5. Test policy: What is verified, and where
6. Risks and countermeasures: Unclear points and the plan to confirm them
```

## Operation

- As steps progress, update the plan and share progress, changes and next actions.
- When blocked, report immediately, and present alternatives and the decisions needed.

## Level of Plan Detail (Enough to Generate Sample Code)

- Make the plan concrete enough that the implementing agent can start without hesitation (target files and symbols, inputs and outputs, success and failure paths, and how it connects to existing flows).
- Wherever possible, include **sample code (a diff sketch)** for the main implementation points in the plan.
- Sample code **follows the existing code** (naming, division of responsibilities, types, error handling, utilities and placement conventions).
- Do not bring in generic samples or an original design when the project already has an existing pattern.

## Reuse and Sharing (Avoiding Reinventing the Wheel)

- The default is to keep the scope of impact small, but **avoiding duplicate implementations of the same kind of processing (reinventing the wheel) takes priority**.
- Always prefer existing shared utilities, types, helpers and hooks, and do not casually create similar implementations.
- When sharing is needed and widens the scope of impact, **consult the user at the planning stage**.
  - In the consultation, give the options, the scope of impact, the grounds for the quality improvement and the alternatives together, and proceed only after approval.
