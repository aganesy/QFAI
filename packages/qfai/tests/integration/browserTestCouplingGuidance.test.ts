import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");
const HEADING = "## Browser test locators and fault injection";
const ANCHOR = "rule/test-layers.md#browser-test-locators-and-fault-injection";

const read = (...parts: string[]): Promise<string> =>
  readFile(path.join(ASSISTANT, ...parts), "utf-8");

/** Collapses every whitespace run to one space, so a reflow is not a regression. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

describe("a browser test survives a rebuild that keeps the behaviour", () => {
  // QFAI:AC-0001-0068-02
  // QFAI:EX-0001-0068-02
  it("the layer rule, the acceptance step and the reviewer carry the locator and fault-injection guidance", async () => {
    const rule = await read("rule", "test-layers.md");
    const section = flat(rule.split(HEADING)[1]?.split(/^## /m)[0] ?? "");
    expect(section, "test-layers.md has no browser test section").not.toBe("");
    expect(section).toContain("This applies to every test that drives a browser, at any layer.");
    expect(section).toContain(
      "by its accessible role and name, or by a `data-qfai` marker its UI contract declares. " +
        "Never by a class name, a CSS value or the DOM path.",
    );
    expect(section).toContain(
      "Check the design tokens against the project's `DESIGN.md` in a test of their own. " +
        "A behaviour case asserts no CSS value.",
    );
    expect(section).toContain("intercept the HTTP request at the network");
    expect(section).toContain("a test-only fault seam the application exposes on purpose");
    expect(section).toContain(
      "Never reroute or replace a module file the page loads, and never read a global such a module sets.",
    );

    const step = flat(await read("step", "implement-acceptance", "STEP.md"));
    expect(step, "implement-acceptance does not point to the section").toContain(
      "A browser test locates elements and injects failures as " +
        "`.qfai/assistant/rule/test-layers.md` § Browser test locators and fault injection says.",
    );

    const reviewer = flat(await read("agent", "implementation-reviewer.md"));
    expect(reviewer, "the reviewer does not flag a module-coupled browser test").toContain(
      "Flag a browser test that imports or reroutes an application module, reads a global such a " +
        "module sets, or locates an element by class name, CSS value or DOM path " +
        `(\`.qfai/assistant/${ANCHOR}\`)`,
    );
  });
});
