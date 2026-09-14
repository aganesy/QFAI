import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd";
const TEMPLATE = `${SKILL}/templates/specs/spec/06_Test-Cases.md`;
const HEADING = "### A failure observed in use";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Collapses whitespace runs so a prose reflow is not a failure. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** The text from `heading` up to the next heading of any level. */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const next = rest.search(/^#{1,6} /m);
  return next < 0 ? rest : rest.slice(0, next);
};

describe("an observed failure has one home, a test-case row", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the test-case template says which row carries it`, async () => {
      const template = await read(tree, TEMPLATE);
      // The scenario selects its Type from the legend, not from the incident's origin.
      expect(template.indexOf("### Type column values")).toBeGreaterThan(-1);
      expect(template.indexOf(HEADING)).toBeGreaterThan(template.indexOf("### Type column values"));
      const body = flat(section(template, HEADING));
      expect(body).toContain("Reuse a row when its behavior, boundary, oracle and layer all match");
      expect(body).toContain(
        "Add a new `TC-*` row only for a distinct behavior, boundary, oracle or layer",
      );
      expect(body).toContain(
        "`Type` follows the scenario in the legend above, not the observation's origin",
      );
      expect(body).toContain("`AC-Refs` or `EX-Ref` names the behavior that failed.");
      expect(body).toContain("`Notes` says where it was seen");
      expect(body).toContain("The coverage depth checklist scores test-case rows");
    });

    it(`${tree}: no other spec template claims to hold it`, async () => {
      const templates = await fg("**/*.md", {
        cwd: path.join(repoRoot, tree, `${SKILL}/templates/specs`),
      });
      const claiming: string[] = [];
      for (const rel of templates) {
        const text = await read(tree, `${SKILL}/templates/specs/${rel}`);
        if (/failure observed in use/i.test(text)) claiming.push(rel);
      }
      expect(claiming).toEqual(["spec/06_Test-Cases.md"]);
    });

    it(`${tree}: the skill sends the author to that section`, async () => {
      const skill = flat(await read(tree, `${SKILL}/SKILL.md`));
      expect(skill).toContain(
        "Record a failure observed in use in its matching test-case row, as the template's _A failure observed in use_ says.",
      );
    });
  }
});
