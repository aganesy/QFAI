// QFAI:SPEC-0029:TC-0029-0003
// QFAI:SPEC-0029:TC-0029-0005
import { describe, expect, it, vi } from "vitest";

import { GenericCommandProvider } from "../../../src/core/critique/genericCommandProvider.js";
import { CritiqueAdapter } from "../../../src/core/critique/adapter.js";

describe("GenericCommandProvider", () => {
  describe("command sanitization (TC-0029-0003)", () => {
    it("strips control characters from arguments", () => {
      const provider = new GenericCommandProvider({
        name: "test-cmd",
        command: "echo",
        args: ["${output}"],
      });

      const sanitized = provider.sanitizeArg("hello\x00world\x7ftest");
      expect(sanitized).toBe("helloworldtest");
    });

    it("preserves code-like characters that are safe with execFile", () => {
      const provider = new GenericCommandProvider({
        name: "test-cmd",
        command: "echo",
        args: ["${output}"],
      });

      const sanitized = provider.sanitizeArg('function foo() { return "bar"; }');
      expect(sanitized).toBe('function foo() { return "bar"; }');
    });

    it("preserves safe characters", () => {
      const provider = new GenericCommandProvider({
        name: "test-cmd",
        command: "echo",
        args: ["${output}"],
      });

      const sanitized = provider.sanitizeArg("hello world 123 test-value");
      expect(sanitized).toBe("hello world 123 test-value");
    });
  });

  describe("timeout enforcement (TC-0029-0005)", () => {
    it("rejects when provider exceeds configured timeout", async () => {
      const provider = new GenericCommandProvider({
        name: "slow-cmd",
        command: "node",
        args: ["-e", "setTimeout(() => {}, 60000)"],
        timeoutMs: 500,
      });

      // Provider rejects on timeout; adapter wraps with fail-open
      const adapter = new CritiqueAdapter({ timeoutMs: 5_000 });
      adapter.register(provider);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await adapter.requestCritique({
        output: "code",
        context: "spec",
        iteration: 1,
      });
      warnSpy.mockRestore();

      expect(result.failOpen).toBe(true);
      expect(result.reason).toBe("provider_unavailable");
    }, 10_000);
  });
});
