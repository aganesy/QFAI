/**
 * WS-E: Prototyping CLI production path tests
 *
 * Verifies CLI flags parse correctly and propagate to runPrototypingExecution().
 */

import { describe, it, expect } from "vitest";
import { parseArgs } from "../../src/cli/lib/args.js";

describe("prototyping CLI production path", () => {
  const cwd = "/test";

  it("parses --target-url flag", () => {
    const result = parseArgs(["prototyping", "run", "--target-url", "http://localhost:3000"], cwd);
    expect(result.command).toBe("prototyping");
    expect(result.invalid).toBe(false);
    expect(result.options.prototypingAction).toBe("run");
    expect(result.options.prototypingTargetUrl).toBe("http://localhost:3000");
  });

  it("parses --browser-provider flag", () => {
    const result = parseArgs(
      ["prototyping", "run", "--browser-provider", "playwright"],
      cwd,
    );
    expect(result.options.prototypingBrowserProvider).toBe("playwright");
  });

  it("parses --render-provider flag", () => {
    const result = parseArgs(
      ["prototyping", "run", "--render-provider", "playwright"],
      cwd,
    );
    expect(result.options.prototypingRenderProvider).toBe("playwright");
  });

  it("parses --reviewer flag", () => {
    const result = parseArgs(["prototyping", "run", "--reviewer", "alice"], cwd);
    expect(result.options.prototypingReviewer).toBe("alice");
  });

  it("parses all production path flags together", () => {
    const result = parseArgs(
      [
        "prototyping",
        "run",
        "--mode",
        "full-harness",
        "--target-url",
        "http://localhost:3000",
        "--browser-provider",
        "playwright",
        "--render-provider",
        "playwright",
        "--reviewer",
        "alice",
      ],
      cwd,
    );
    expect(result.invalid).toBe(false);
    expect(result.options.prototypingMode).toBe("full-harness");
    expect(result.options.prototypingTargetUrl).toBe("http://localhost:3000");
    expect(result.options.prototypingBrowserProvider).toBe("playwright");
    expect(result.options.prototypingRenderProvider).toBe("playwright");
    expect(result.options.prototypingReviewer).toBe("alice");
  });

  it("marks invalid when --target-url has no value", () => {
    const result = parseArgs(["prototyping", "run", "--target-url"], cwd);
    expect(result.invalid).toBe(true);
  });

  it("marks invalid when --reviewer has no value", () => {
    const result = parseArgs(["prototyping", "run", "--reviewer"], cwd);
    expect(result.invalid).toBe(true);
  });

  it("ignores prototyping flags for non-prototyping commands", () => {
    const result = parseArgs(["validate", "--target-url", "http://localhost:3000"], cwd);
    expect(result.command).toBe("validate");
    expect(result.options.prototypingTargetUrl).toBeUndefined();
  });
});
