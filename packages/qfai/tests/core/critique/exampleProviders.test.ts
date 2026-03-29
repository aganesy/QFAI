// QFAI:SPEC-0029:TC-0029-0006
import { describe, expect, it } from "vitest";

import { EchoProvider } from "../../../src/core/critique/echoProvider.js";
import { FileProvider } from "../../../src/core/critique/fileProvider.js";
import type { CritiqueProvider } from "../../../src/core/critique/types.js";

describe("ExampleProviders", () => {
  describe("distribution check (TC-0029-0006)", () => {
    it("provides at least 2 example providers conforming to interface", () => {
      const providers: CritiqueProvider[] = [
        new EchoProvider(),
        new FileProvider({ critiquePath: "nonexistent.json" }),
      ];

      expect(providers.length).toBeGreaterThanOrEqual(2);

      for (const provider of providers) {
        expect(provider.name).toBeTruthy();
        expect(typeof provider.request).toBe("function");
      }
    });

    it("EchoProvider returns a valid critique response", async () => {
      const provider = new EchoProvider();
      const response = await provider.request({
        output: "test code",
        context: "spec",
        iteration: 1,
      });

      expect(response.scores).toBeDefined();
      expect(response.dimensions).toBeInstanceOf(Array);
      expect(response.suggestions).toBeInstanceOf(Array);
    });
  });
});
