import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");
const HEADING = "## Browser test locators and fault injection";
const SECTION_NAME = "§ Browser test locators and fault injection";
const ANCHOR = "rule/test-layers.md#browser-test-locators-and-fault-injection";

const read = (...parts: string[]): Promise<string> =>
  readFile(path.join(ASSISTANT, ...parts), "utf-8");

/** Collapses every whitespace run to one space, so a reflow is not a regression. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

describe("a browser test survives a rebuild that keeps the behaviour", () => {
  // QFAI:AC-0001-0068-02
  // QFAI:EX-0001-0068-02
  it("the layer rule, the test-writing steps and the reviewer carry the locator and fault-injection guidance", async () => {
    const rule = await read("rule", "test-layers.md");
    const section = flat(rule.split(HEADING)[1]?.split(/^## /m)[0] ?? "");
    expect(section, "test-layers.md has no browser test section").not.toBe("");

    // Scope: every browser test, not only E2E.
    expect(section).toMatch(/every test that drives a browser/);
    // Locators: what a user perceives or a declared marker; markup is forbidden.
    expect(section).toMatch(/accessible role and name/);
    expect(section).toMatch(/label/);
    expect(section).toMatch(/visible text/);
    expect(section).toMatch(/`data-qfai`\s+marker its UI contract declares/);
    expect(section).toMatch(/Never by a class name, a CSS value or the DOM path/);
    expect(section).toMatch(/readiness marker/);
    // Style: tokens checked on their own; behaviour cases assert no CSS value.
    expect(section).toMatch(/`DESIGN\.md`/);
    expect(section).toMatch(/design tokens in a test of their own/);
    expect(section).toMatch(/behaviour case asserts no CSS value/);
    // Failure injection: a stable boundary, never the module layout.
    expect(section).toMatch(/intercept the HTTP request/);
    expect(section).toMatch(/test-only fault seam/);
    expect(section).toMatch(/production build does not carry it/);
    expect(section).toMatch(/Never reroute or replace a module file/);
    expect(section).toMatch(/never read a global such a module sets/);

    for (const step of ["implement-scaffold", "implement-acceptance", "implement-tdd"]) {
      const body = flat(await read("step", step, "STEP.md"));
      expect(body, `${step} does not point to the section`).toContain(
        `\`.qfai/assistant/rule/test-layers.md\` ${SECTION_NAME}`,
      );
      expect(body, step).toMatch(/A test that drives a browser locates elements/);
    }

    const reviewer = flat(await read("agent", "implementation-reviewer.md"));
    const line = reviewer.split("- Flag a browser test")[1]?.split(" - ")[0] ?? "";
    expect(line, "the reviewer does not flag a module-coupled browser test").not.toBe("");
    expect(line).toMatch(/reroutes or replaces an application module file/);
    expect(line).not.toMatch(/imports/);
    expect(line).toMatch(/reads a global such a module sets/);
    expect(line).toMatch(/class name, CSS value or DOM path/);
    expect(line).toMatch(/behaviour case that asserts a CSS value/);
    expect(line).toContain(`(\`.qfai/assistant/${ANCHOR}\`)`);
  });
});
