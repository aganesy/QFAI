/**
 * Unit tests for Playwright CLI command plan builder (spec-0017 REQ-0006).
 *
 * QFAI:SPEC-0017:TC-0017-0005 — deterministic plan
 * QFAI:SPEC-0017:TC-0017-0006 — canonical command structure
 * QFAI:SPEC-0017:TC-0017-0007 — output paths under iterations/<cycle>/ (legacy V1 slice; V2 round flow under .qfai/evidence/prototyping/rounds/)
 */
import { describe, expect, it } from "vitest";

import type { CanonicalScreenContract } from "../../../src/core/contracts/screenContracts.js";
import { buildPlaywrightCliCommandPlan } from "../../../src/core/prototyping/playwrightCliPlan.js";

function makeScreen(overrides: Partial<CanonicalScreenContract> = {}): CanonicalScreenContract {
  return {
    name: "Order List",
    screenId: "order-list",
    route: "/orders",
    primaryTasks: [
      "Verify order row renders with status badge",
      "Click first row to open detail drawer",
    ],
    sourceRef: ".qfai/contracts/ui/ui-0001-order.yaml#order-list",
    ...overrides,
  };
}

describe("spec-0017 buildPlaywrightCliCommandPlan", () => {
  // TC-0017-0005 — deterministic plan
  it("returns byte-identical command plans for the same input (REQ-0006, BR-0017-0003)", () => {
    const screen = makeScreen();
    const a = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen,
    });
    const b = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen,
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  // TC-0017-0006 — canonical command structure
  it("emits goto → snapshot → interaction* → screenshot → html in that order", () => {
    const screen = makeScreen();
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen,
    });

    const purposes = plan.commands.map((command) => command.purpose);
    expect(purposes).toEqual([
      "goto",
      "snapshot",
      "interaction",
      "interaction",
      "screenshot",
      "html",
    ]);
  });

  it("derives interaction commands from primaryTasks (one per task) with NL notes (DEC-0017-0008)", () => {
    const screen = makeScreen();
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 2,
      screen,
    });

    const interactions = plan.commands.filter((command) => command.purpose === "interaction");
    expect(interactions).toHaveLength(screen.primaryTasks.length);
    expect(interactions.map((command) => command.note)).toEqual(screen.primaryTasks);
    for (const command of interactions) {
      expect(command.command).toMatch(/^#\s*evaluator:/);
      expect(command.outputPath).toBeUndefined();
    }
  });

  it("emits no interaction commands when screen has no primaryTasks", () => {
    const screen = makeScreen({ primaryTasks: [] });
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen,
    });

    const purposes = plan.commands.map((command) => command.purpose);
    expect(purposes).toEqual(["goto", "snapshot", "screenshot", "html"]);
  });

  // TC-0017-0007 — output paths under iterations/<cycle>/<screen-id>.*
  it("assigns output paths under .qfai/evidence/prototyping/iterations/<cycle>/ (REQ-0005)", () => {
    const screen = makeScreen();
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 3,
      screen,
    });

    const base = `.qfai/evidence/prototyping/iterations/3`;
    const outputPaths = plan.commands
      .filter((command) => command.outputPath !== undefined)
      .map((command) => command.outputPath);

    expect(outputPaths).toEqual([
      `${base}/order-list.snapshot.txt`,
      `${base}/order-list.png`,
      `${base}/order-list.html`,
    ]);
  });

  it("emits structured logical command metadata for non-interaction steps", () => {
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen: makeScreen(),
    });

    const executableCommands = plan.commands.filter((command) => command.purpose !== "interaction");
    for (const command of executableCommands) {
      expect(command.toolId).toBe("playwright-cli");
      expect(Array.isArray(command.args)).toBe(true);
      expect(command.args?.length).toBeGreaterThan(0);
    }

    const html = plan.commands.find((command) => command.purpose === "html");
    expect(html?.stdoutPath).toBe(".qfai/evidence/prototyping/iterations/1/order-list.html");
    expect(html?.command).not.toContain(">");
  });

  it("uses Playwright CLI filename flags instead of shell save/redirection conventions", () => {
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen: makeScreen(),
    });

    const snapshot = plan.commands.find((command) => command.purpose === "snapshot");
    const screenshot = plan.commands.find((command) => command.purpose === "screenshot");
    expect(snapshot?.command).toContain(
      '--filename=".qfai/evidence/prototyping/iterations/1/order-list.snapshot.txt"',
    );
    expect(screenshot?.command).toContain(
      '--filename=".qfai/evidence/prototyping/iterations/1/order-list.png"',
    );
  });

  it("resolves targetUrl + route into an absolute URL used in goto", () => {
    const screen = makeScreen();
    const plan = buildPlaywrightCliCommandPlan({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      screen,
    });

    expect(plan.targetUrl).toBe("http://localhost:5173/orders");
    const goto = plan.commands.find((command) => command.purpose === "goto");
    expect(goto?.command).toBe(`playwright-cli goto "http://localhost:5173/orders"`);
  });

  it("rejects non-positive cycle numbers", () => {
    expect(() =>
      buildPlaywrightCliCommandPlan({
        targetUrl: "http://localhost:5173",
        cycle: 0,
        screen: makeScreen(),
      }),
    ).toThrow(/cycle must be a positive integer/);

    expect(() =>
      buildPlaywrightCliCommandPlan({
        targetUrl: "http://localhost:5173",
        cycle: -1,
        screen: makeScreen(),
      }),
    ).toThrow(/cycle must be a positive integer/);
  });
});
