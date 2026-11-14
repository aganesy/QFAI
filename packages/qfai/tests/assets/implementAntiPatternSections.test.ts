/**
 * The design anti-pattern list says its information-architecture and states
 * sections apply to the screens an implementation builds, and that the
 * implementer checks them before calling a screen done. The implement skill is
 * what the implementer loads, so it names both sections; otherwise the
 * implementer never reads them.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const LIST = ".qfai/assistant/skill/qfai-sdd/references/design-anti-patterns.md";
const SECTIONS = [
  ["information-architecture-and-flow", "Information architecture and flow"],
  ["states-and-accessibility", "States and accessibility"],
] as const;

describe("the implement skill points at the anti-pattern sections for built screens", () => {
  for (const root of ASSISTANT_ROOTS) {
    const tree = path.relative(repoRoot, root);

    it(`${tree}: names each section the implementer checks`, async () => {
      const skill = await readFile(path.join(root, "skill/qfai-implement/SKILL.md"), "utf-8");
      const list = await readFile(
        path.join(root, "skill/qfai-sdd/references/design-anti-patterns.md"),
        "utf-8",
      );

      for (const [anchor, heading] of SECTIONS) {
        expect(skill).toContain(`${LIST}#${anchor}`);
        expect(list).toContain(`## ${heading}`);
      }
    });
  }
});
