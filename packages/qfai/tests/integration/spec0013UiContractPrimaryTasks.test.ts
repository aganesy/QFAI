/**
 * Integration acceptance skeleton for spec-0013 CHG-005 test cases.
 *
 * `it.todo` Red skeletons; implementation lands during the follow-up
 * `/qfai-implement` TDD micro cycle.
 */
// QFAI:SPEC-0013:TC-0013-0025
// QFAI:SPEC-0013:TC-0013-0026
// QFAI:SPEC-0013:TC-0013-0027

import { describe, it } from "vitest";

describe("TC-0013-0025: shipped ui-spec.yaml carries primary_tasks: [] slot per screen", () => {
  it.todo(
    "template parses with every screens[] entry exposing a primary_tasks: [] slot, and requirements-analyst guide instructs ≥ 1 primary_task per screen",
  );
});

describe("TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty", () => {
  it.todo(
    "validate lane FAILS at severity error naming the offending file path, screen id, and rule token; /qfai-prototyping preflight refuses to proceed",
  );
});

describe("TC-0013-0027: QFAI-AUD-001 aligned lane passes when primary_tasks is non-empty", () => {
  it.todo(
    "lane passes silently when every screen has ≥ 1 primary_task; pre-existing slot-less UI contracts treated under deprecation-window semantics",
  );
});
