/**
 * Browser QA provider registry tests — WS-B
 */
import { describe, expect, it } from "vitest";

import { ProviderRegistry } from "../../src/core/providers/registry.js";
import type { BrowserQaProvider } from "../../src/core/browserQa/types.js";

function makeQaProvider(id = "test-qa"): BrowserQaProvider {
  return {
    providerId: id,
    canRun: () => true,
    runSmoke: async () => ({ phase: "smoke", status: "executed", findings: [] }),
    runInteraction: async () => ({ phase: "interaction", status: "executed", findings: [] }),
    runVisual: async () => ({ phase: "visual", status: "executed", findings: [] }),
    runAccessibility: async () => ({ phase: "accessibility", status: "executed", findings: [] }),
  };
}

describe("ProviderRegistry QA providers", () => {
  it("registers and retrieves a QA provider", () => {
    const registry = new ProviderRegistry();
    const provider = makeQaProvider();
    registry.registerQaProvider(provider);

    expect(registry.getQaProvider("test-qa")).toBe(provider);
  });

  it("returns undefined for unregistered QA provider", () => {
    const registry = new ProviderRegistry();
    expect(registry.getQaProvider("nonexistent")).toBeUndefined();
  });

  it("throws on duplicate QA provider registration", () => {
    const registry = new ProviderRegistry();
    registry.registerQaProvider(makeQaProvider());
    expect(() => registry.registerQaProvider(makeQaProvider())).toThrow(/already registered/);
  });

  it("getFirstQaProvider returns first registered provider", () => {
    const registry = new ProviderRegistry();
    const p1 = makeQaProvider("first");
    registry.registerQaProvider(p1);
    registry.registerQaProvider(makeQaProvider("second"));

    expect(registry.getFirstQaProvider()).toBe(p1);
  });

  it("getFirstQaProvider returns undefined when empty", () => {
    const registry = new ProviderRegistry();
    expect(registry.getFirstQaProvider()).toBeUndefined();
  });
});
