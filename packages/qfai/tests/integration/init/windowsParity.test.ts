/**
 * Integration: init and upgrade give the same result on a CRLF checkout as on Linux.
 *
 * CRLF comes from the fixture, never from `core.autocrlf`.
 */
// QFAI:SPEC-0003:TC-0003-0061
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_MARKER } from "../../../src/core/gitignore.js";
import { initQuietly, isIgnored, withInstall } from "./upgradeStates.js";

async function toCrlf(file: string): Promise<void> {
  const text = await readFile(file, "utf-8");
  await writeFile(file, text.replace(/\r?\n/g, "\r\n"), "utf-8");
}

describe("windows parity", () => {
  it("TC-0003-0061: The previous managed block in a CRLF .gitignore", async () => {
    await withInstall(["older-gitignore"], async (root) => {
      const file = path.join(root, ".gitignore");
      await toCrlf(file);
      await initQuietly(root);

      const lines = (await readFile(file, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
      expect(lines.filter((line) => line === QFAI_GITIGNORE_MARKER)).toHaveLength(1);
      const duplicated = lines.filter((line, index) => lines.indexOf(line) !== index);
      expect(duplicated, "no block line is duplicated").toEqual([]);
      expect(isIgnored(root, ".qfai/runs/x")).toBe(true);
      expect(isIgnored(root, ".qfai/evidence/workflow/x/summary.json")).toBe(false);
    });
  });
});
