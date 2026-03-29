// QFAI:SPEC-0028:TC-0028-0015
// QFAI:SPEC-0028:TC-0028-0016
// QFAI:SPEC-0028:TC-0028-0017
// QFAI:SPEC-0028:TC-0028-0018
import { describe, expect, it } from "vitest";

import { ProviderRegistry, type BrowserProvider } from "../../src/core/providers/index.js";

describe("ProviderRegistry", () => {
  describe("provider registration (TC-0028-0015, TC-0028-0016)", () => {
    it("registers a Playwright adapter and retrieves it", () => {
      const registry = new ProviderRegistry();
      const playwrightProvider: BrowserProvider = {
        name: "playwright",
        capabilities: ["screenshot", "viewport", "dom", "interaction"],
        captureScreenshot: async () => "/img/pw.png",
        captureViewport: async () => ({ width: 1280, height: 720 }),
        captureDom: async () => "/dom/pw.html",
        runInteraction: async () => {},
      };
      registry.register(playwrightProvider);
      expect(registry.has("playwright")).toBe(true);
      expect(registry.get("playwright")).toBe(playwrightProvider);
    });

    it("has no hard-coded Playwright reference in registry itself", () => {
      const registry = new ProviderRegistry();
      // before registration, no provider is present
      expect(registry.has("playwright")).toBe(false);
      expect(registry.get("playwright")).toBeUndefined();
    });

    it("registers a screenshot-only fallback with reduced capability", () => {
      const registry = new ProviderRegistry();
      const fallback: BrowserProvider = {
        name: "screenshot-fallback",
        capabilities: ["screenshot"],
        captureScreenshot: async () => "/img/fallback.png",
      };
      registry.register(fallback);
      expect(registry.has("screenshot-fallback")).toBe(true);
      const retrieved = registry.get("screenshot-fallback");
      expect(retrieved?.capabilities).toEqual(["screenshot"]);
      expect(retrieved?.captureViewport).toBeUndefined();
    });
  });

  describe("optional backend absent and fail-open (TC-0028-0017, TC-0028-0018)", () => {
    it("returns undefined when no backend is registered", () => {
      const registry = new ProviderRegistry();
      expect(registry.get("playwright")).toBeUndefined();
      expect(registry.has("playwright")).toBe(false);
    });

    it("getOrSkip returns skipped status when provider not registered", () => {
      const registry = new ProviderRegistry();
      const result = registry.getOrSkip("playwright");
      expect(result.status).toBe("skipped");
      expect(result.provider).toBeUndefined();
    });

    it("getOrSkip returns available status when provider is registered", () => {
      const registry = new ProviderRegistry();
      registry.register({
        name: "playwright",
        capabilities: ["screenshot"],
        captureScreenshot: async () => "/img/pw.png",
      });
      const result = registry.getOrSkip("playwright");
      expect(result.status).toBe("available");
      expect(result.provider).toBeDefined();
    });
  });

  describe("capability-method validation", () => {
    it("rejects provider declaring interaction without runInteraction", () => {
      const registry = new ProviderRegistry();
      expect(() =>
        registry.register({
          name: "bad",
          capabilities: ["interaction"],
        }),
      ).toThrow(/declares capability "interaction" but does not implement "runInteraction"/);
    });

    it("accepts provider with matching methods for all declared capabilities", () => {
      const registry = new ProviderRegistry();
      expect(() =>
        registry.register({
          name: "good",
          capabilities: ["screenshot", "interaction"],
          captureScreenshot: async () => "/img/good.png",
          runInteraction: async () => {},
        }),
      ).not.toThrow();
    });
  });
});
