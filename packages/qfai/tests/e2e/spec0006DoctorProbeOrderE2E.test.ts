/**
 * E2E acceptance skeleton for spec-0006 CHG-005 user stories:
 *   doctor playwright primary probe + deprecation window,
 *   2-group summary + skills.integrity severity downgrade.
 *
 * `it.todo` Red skeletons; implementation lands in the follow-up
 * `/qfai-implement` micro cycle.
 */
// QFAI:SPEC-0006:US-0006-0006
// QFAI:SPEC-0006:US-0006-0007

import { describe, it } from "vitest";

describe("US-0006-0006: doctor probes playwright primary, npx fallback, playwright-cli deprecation", () => {
  it.todo(
    "fresh init + `npm i -D playwright` yields zero [error] lines and `qfai doctor --profile prototyping` reports playwright as the resolved launcher",
  );
});

describe("US-0006-0007: doctor summary splits into 2 groups and downgrades skills.integrity to warning", () => {
  it.todo(
    "doctor output presents `errors blocking the active profile` and `warnings advisory of drift` groups; skills.integrity always lands in the advisory group",
  );
});
