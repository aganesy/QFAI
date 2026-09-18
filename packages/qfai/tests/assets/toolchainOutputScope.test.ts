import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const ARTICLE = "packages/qfai/assets/init/.qfai/assistant/constitution/constitution.md";
const SHIPPED_RULE = "packages/qfai/assets/init/root/.agents/rules/temporary-files.md";

/** Every text that says where a temporary file goes. This repository reads the shipped rule. */
const SOURCES = [ARTICLE, ".qfai/assistant/constitution/constitution.md", SHIPPED_RULE];

/** Collapses whitespace runs so a prose reflow is not a failure. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, rel), "utf-8"));

describe("toolchain output stays where the tooling writes it", () => {
  for (const source of SOURCES) {
    it(`${source}: leaves toolchain output out of tmp/`, async () => {
      const text = await read(source);
      expect(text).toContain("never redirect them to `tmp/`");
      // Wording that would put `dist/` under `tmp/` again.
      expect(text).not.toContain("intermediate build artifacts");
      expect(text).not.toContain("intermediate build output");
      expect(text).not.toContain("`tmp/build/`");
    });
  }

  it("Article XI names the same toolchain output the shipped rule does", async () => {
    const article = await read(ARTICLE);
    const rule = await read(SHIPPED_RULE);
    for (const output of [
      "`dist/`",
      "`build/`",
      "`.next/`",
      "`target/`",
      "coverage reports",
      "package tarballs",
    ]) {
      expect(rule, output).toContain(output);
      expect(article, output).toContain(output);
    }
  });
});
