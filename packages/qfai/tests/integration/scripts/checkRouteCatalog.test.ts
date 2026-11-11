// QFAI:AC-0001-0217-02
/**
 * The route catalog lane: the contract's route rows and the plans the package ships, held together.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { CONTRACT, planFaults, readPlans } from "../../../../../scripts/check-route-catalog.mjs";

// tests/integration/scripts → tests/integration → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

const contract = readFileSync(path.join(REPO_ROOT, CONTRACT), "utf8");

// QFAI:EX-0001-0217-02
it("The shipped plans, an extra plan, a missing plan, and a plan its row no longer states", () => {
  const plans = readPlans(REPO_ROOT);
  const extra = new Map([...plans, ["triage-everything", plans.get("close-no-change") ?? ""]]);
  const missing = new Map([...plans].filter(([route]) => route !== "fix-intermittent"));
  const drifted = new Map(plans);
  drifted.set(
    "fix-intermittent",
    (plans.get("fix-intermittent") ?? "").replace(
      "steps: [implement-stress-harness]",
      "steps: [implement-oracle-parity]",
    ),
  );

  expect({
    shipped: planFaults(contract, plans),
    extra: planFaults(contract, extra),
    missing: planFaults(contract, missing),
    drifted: planFaults(contract, drifted),
  }).toEqual({
    shipped: [],
    extra: ["triage-everything.yml: no route row of the catalog names it"],
    missing: ["fix-intermittent: the package ships no plan for this route row"],
    drifted: ["fix-intermittent: the plan's plan is not what its route row states"],
  });
});

// QFAI:EX-0001-0217-04
it("A plan whose stage drops what it serves while its row keeps it", () => {
  const plans = readPlans(REPO_ROOT);
  const unserved = new Map(plans);
  unserved.set(
    "resolve-conflicts",
    (plans.get("resolve-conflicts") ?? "").replace("    serves: [spec, contract]\n", ""),
  );

  expect(planFaults(contract, unserved)).toEqual([
    "resolve-conflicts: the plan's plan is not what its route row states",
  ]);
});
