/**
 * The accessibility layer the shipped assets define: axe through Playwright,
 * WCAG 2.2 A and AA, over every UI-contract route for each role, written by
 * `implement-scaffold`, run by `verify-repo-gate` and noted by
 * `verify-qfai-gate`. QFAI itself takes no axe dependency.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assistant = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

const flat = (text: string): string => text.replace(/\s*\n\s*/g, " ");
const read = async (...parts: string[]): Promise<string> =>
  flat(await readFile(path.join(assistant, ...parts), "utf-8"));

function section(text: string, heading: string): string {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const next = rest.search(/ #{2,3} /);
  return next < 0 ? rest : rest.slice(0, next);
}

// QFAI:EX-0001-0311-02
describe("test-layers.md defines the accessibility layer", () => {
  it("adds the layer to the crosswalk with no story-tree obligation", async () => {
    const rule = await readFile(path.join(assistant, "rule", "test-layers.md"), "utf-8");
    expect(rule).toMatch(
      /^\|\s*L6\s*\|\s*Accessibility\s*\|\s*`layer-accessibility`\s*\|.*\|\s*none\s*\|$/m,
    );
    expect(rule).toContain("### L6 Accessibility");
  });

  it("states the tool, the tags, the routes, the roles, the report, the waiver and the manual checks", async () => {
    const layer = section(await read("rule", "test-layers.md"), "### L6 Accessibility");
    expect(layer).toContain("`@axe-core/playwright`");
    expect(layer).toContain("`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`");
    expect(layer).toMatch(
      /UI contracts declare a screen with a web route, one that starts with `\/`/,
    );
    expect(layer).toMatch(/every such route as each role that can reach it/);
    expect(layer).toMatch(/E2E layer's sign-in for that role/);
    expect(layer).toMatch(/Report each violation by route and rule/);
    expect(layer).toMatch(/fails the test unless the spec waives it/);
    expect(layer).toMatch(/An entry with no reason waives nothing/);
    expect(layer).toMatch(/keyboard order/);
    expect(layer).toContain("design-anti-patterns.md#states-and-accessibility");
    expect(layer).toContain("`QFAI-AXE-001`");
    expect(layer).toMatch(
      /The\s+warning reads text only: a comment or an unused import silences it/,
    );
  });
});

// QFAI:EX-0001-0311-03
describe("implement-scaffold writes the accessibility check from the shipped template", () => {
  it("installs the adopter dev dependency and writes the spec in a UI project", async () => {
    const step = await read("step", "implement-scaffold", "STEP.md");
    const setup = section(step, "## Accessibility check");
    expect(setup).toMatch(
      /Skip this section when no UI contract declares a screen whose `route` starts with `\/`/,
    );
    expect(setup).toMatch(/install it as one with the project's package manager/);
    expect(setup).toContain("references/accessibility-check.md");
    expect(setup).toMatch(/role-to-screen mapping § Per-role navigation journey uses/);
    expect(setup).toMatch(/E2E layer's sign-in for each role it names/);
    expect(setup).toMatch(/A visitor role that does not sign in is not an actor/);
    expect(setup).toMatch(
      /When the spec already exists, add to its route map each route starting with `\/` that the current flow's UI contracts declare and the map lacks/,
    );
    expect(setup).toMatch(/does not run Playwright for JavaScript or TypeScript/);
    expect(step).toMatch(/7\. Set up the accessibility check as § Accessibility check says/);
    expect(section(step, "## Gate")).toMatch(/§ Accessibility check needs no setup/);
  });

  it("ships a spec that loops over routes and roles with the WCAG 2.2 A and AA tags and waivers with reasons", async () => {
    const template = await readFile(
      path.join(assistant, "skill", "qfai-implement", "references", "accessibility-check.md"),
      "utf-8",
    );
    expect(template).toContain('import AxeBuilder from "@axe-core/playwright";');
    expect(template).toContain('["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]');
    expect(template).toContain("for (const [role, routes] of Object.entries(ROUTES_BY_ROLE))");
    expect(template).toContain("test.use({ role });");
    expect(template).toContain(
      "export function statePath(directory: string, role: string, slot: number): string {",
    );
    expect(template).toContain("for (const role of SIGNED_IN_ROLES) {");
    expect(flat(template)).toMatch(/one session per worker index and role/);
    expect(template).toContain(".withTags(WCAG_22_A_AA).analyze()");
    expect(template).toMatch(/entry\.reason\.trim\(\) !== ""/);
    expect(template).toContain("expect(open).toEqual([]);");
    expect(flat(template)).toMatch(/QFAI installs none and runs none itself/);
  });
});

// QFAI:EX-0001-0311-04
describe("the verify gates run the layer and note whether it exists", () => {
  it("runs the accessibility tests through the Test command and fails on an unwaived violation", async () => {
    const step = await read("step", "verify-repo-gate", "STEP.md");
    expect(step).toContain("7. accessibility tests (if the layer applies): `Test`");
    const gate = section(step, "### Accessibility tests");
    expect(gate).toMatch(/FAIL, naming each route, role and axe rule/);
    expect(gate).toMatch(/a violation the spec does not waive with a reason/);
    expect(gate).toMatch(/the gate stays out of `gates` with that reason/);
    expect(gate).toMatch(/is not an UNRUN lane/);
  });

  it("records the layer as present or missing in the QFAI gate", async () => {
    const step = await read("step", "verify-qfai-gate", "STEP.md");
    const note = section(step, "## Accessibility layer");
    expect(note).toContain("`QFAI-AXE-001` (`warning`)");
    expect(note).toMatch(
      /reads text only, so a file that names axe in a comment or an unused import/,
    );
    expect(note).toMatch(/a missing\s+warning alone does not make it present/);
    expect(note).toMatch(/Record the layer as present or missing\s+in the stage report/);
  });

  it("keeps keyboard order and screen-reader names in the screen review checklist", async () => {
    const checklist = section(
      await read("skill", "qfai-sdd", "references", "design-anti-patterns.md"),
      "## States and accessibility",
    );
    expect(checklist).toMatch(/Alt text, ARIA labels and keyboard navigation are missing/);
    const layer = section(await read("rule", "test-layers.md"), "### L6 Accessibility");
    expect(layer).toMatch(/The screen review checks both by hand/);
  });
});
