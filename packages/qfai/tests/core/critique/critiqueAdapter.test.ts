// QFAI:SPEC-0029:TC-0029-0001
// QFAI:SPEC-0029:TC-0029-0002
// QFAI:SPEC-0029:TC-0029-0004
// QFAI:SPEC-0029:TC-0029-0007
// QFAI:SPEC-0029:TC-0029-0008
import { describe, expect, it, vi } from "vitest";

import type {
  CritiqueInput,
  CritiqueProvider,
  CritiqueResponse,
} from "../../../src/core/critique/types.js";
import { CritiqueAdapter } from "../../../src/core/critique/adapter.js";

describe("CritiqueAdapter", () => {
  describe("interface contract (TC-0029-0001)", () => {
    it("returns a valid CritiqueResponse from a conforming provider", async () => {
      const mockProvider: CritiqueProvider = {
        name: "test-provider",
        request: async (_input: CritiqueInput): Promise<CritiqueResponse> => ({
          scores: { quality: 7, correctness: 8 },
          dimensions: ["correctness", "quality"],
          suggestions: ["add error handling"],
        }),
      };

      const adapter = new CritiqueAdapter();
      adapter.register(mockProvider);

      const result = await adapter.requestCritique({
        output: "generated code",
        context: "spec",
        iteration: 1,
      });

      expect(result.failOpen).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.response?.scores).toEqual({ quality: 7, correctness: 8 });
      expect(result.response?.dimensions).toEqual(["correctness", "quality"]);
      expect(result.response?.suggestions).toEqual(["add error handling"]);
    });
  });

  describe("schema validation fail-open (TC-0029-0002)", () => {
    it("triggers fail-open when provider returns invalid response", async () => {
      const badProvider: CritiqueProvider = {
        name: "bad-provider",
        request: async () => ({ invalid: "no scores" }) as unknown as CritiqueResponse,
      };

      const adapter = new CritiqueAdapter();
      adapter.register(badProvider);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 1,
      });
      warnSpy.mockRestore();

      expect(result.failOpen).toBe(true);
      expect(result.response).toBeUndefined();
      expect(result.reason).toBe("invalid_response");
    });
  });

  describe("error handling fail-open (TC-0029-0004)", () => {
    it("triggers fail-open when provider throws network error", async () => {
      const failProvider: CritiqueProvider = {
        name: "fail-provider",
        request: async () => {
          throw new Error("ECONNREFUSED");
        },
      };

      const adapter = new CritiqueAdapter();
      adapter.register(failProvider);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 2,
      });
      warnSpy.mockRestore();

      expect(result.failOpen).toBe(true);
      expect(result.response).toBeUndefined();
      expect(result.reason).toBe("provider_unavailable");
    });
  });

  describe("state transition (TC-0029-0007)", () => {
    it("handles provider state change across iterations", async () => {
      let callCount = 0;
      const flakeyProvider: CritiqueProvider = {
        name: "flakey-provider",
        request: async (_input: CritiqueInput): Promise<CritiqueResponse> => {
          callCount++;
          if (callCount === 4) {
            throw new Error("temporarily unavailable");
          }
          return {
            scores: { quality: 7 },
            dimensions: ["quality"],
            suggestions: [],
          };
        },
      };

      const adapter = new CritiqueAdapter();
      adapter.register(flakeyProvider);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Iterations 1-3: available
      for (let i = 1; i <= 3; i++) {
        const result = await adapter.requestCritique({
          output: "code",
          context: "spec",
          iteration: i,
        });
        expect(result.failOpen).toBe(false);
      }

      // Iteration 4: fails
      const result4 = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 4,
      });
      expect(result4.failOpen).toBe(true);

      // Iteration 5: recovers
      const result5 = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 5,
      });
      expect(result5.failOpen).toBe(false);

      warnSpy.mockRestore();
    });
  });

  describe("fail-open logging (TC-0029-0008)", () => {
    it("logs provider name, reason, and iteration on fail-open", async () => {
      const failProvider: CritiqueProvider = {
        name: "my-provider",
        request: async () => {
          throw new Error("connection refused");
        },
      };

      const adapter = new CritiqueAdapter();
      adapter.register(failProvider);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 3,
      });

      expect(warnSpy).toHaveBeenCalledOnce();
      const logMessage = (warnSpy.mock.calls[0]?.[0] ?? "") as string;
      expect(logMessage).toContain("provider=my-provider");
      expect(logMessage).toContain("reason=provider_unavailable");
      expect(logMessage).toContain("iteration=3");

      warnSpy.mockRestore();
    });
  });

  describe("no provider registered", () => {
    it("returns fail-open when no provider is registered", async () => {
      const adapter = new CritiqueAdapter();
      const result = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 1,
      });
      expect(result.failOpen).toBe(true);
      expect(result.reason).toBe("no_provider");
    });
  });
});
