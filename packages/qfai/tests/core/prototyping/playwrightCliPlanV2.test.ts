import { describe, expect, it } from "vitest";

import type { CanonicalScreenContract } from "../../../src/core/contracts/screenContracts.js";
import {
  buildCandidatePlaywrightCliCommandPlan,
  buildCandidatePlaywrightCliCommandPlans,
} from "../../../src/core/prototyping/playwrightCliPlan.js";

function makeScreen(overrides: Partial<CanonicalScreenContract> = {}): CanonicalScreenContract {
  return {
    name: "Home",
    screenId: "home",
    route: "/",
    primaryTasks: ["Open primary CTA"],
    sourceRef: ".qfai/contracts/ui/ui-0001-home.yaml#home",
    ...overrides,
  };
}

describe("spec-0018 candidate Playwright CLI plan", () => {
  it("prefixes target URLs and artifact paths with candidate/round info", () => {
    const plan = buildCandidatePlaywrightCliCommandPlan({
      targetUrl: "http://localhost:3000",
      round: "r5",
      candidateId: "c2",
      screen: makeScreen(),
    });

    expect(plan.candidateRoute).toBe("/prototype/c2/");
    expect(plan.targetUrl).toBe("http://localhost:3000/prototype/c2/");

    const outputPaths = plan.commands
      .filter((command) => command.outputPath !== undefined)
      .map((command) => command.outputPath);

    expect(outputPaths).toEqual([
      ".qfai/evidence/prototyping/rounds/r5/candidates/c2/home.snapshot.txt",
      ".qfai/evidence/prototyping/rounds/r5/candidates/c2/home.png",
      ".qfai/evidence/prototyping/rounds/r5/candidates/c2/home.html",
    ]);
  });

  it("builds a flattened plan set for all candidates and screens", () => {
    const plans = buildCandidatePlaywrightCliCommandPlans({
      targetUrl: "http://localhost:3000",
      round: "r3",
      candidateIds: ["c1", "c3"],
      screens: [makeScreen(), makeScreen({ screenId: "orders", route: "/orders" })],
    });

    expect(plans).toHaveLength(4);
    expect(plans[0]?.candidateId).toBe("c1");
    expect(plans[3]?.screenId).toBe("orders");
  });
});
