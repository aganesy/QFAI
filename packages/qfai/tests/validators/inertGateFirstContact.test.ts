/**
 * What a gate that cannot evaluate yet is holding back.
 *
 * Several checks report nothing until a prerequisite exists, so a repository at
 * `error=0` can do exactly what a warning asks and land on a larger error count
 * in one step. The warning that asks for the prerequisite is the only place a
 * reader can learn the size of that step, so it names the rules that start.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

async function withPack<T>(files: Record<string, string>, fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-research-first-contact-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the undeclared-dependency warning names what it is holding back", () => {
  // `QFAI-CONTRACT-033` compares an index row's `Depends On` cell with the
  // contract file's declaration. A blank cell it reports on its own, but a cell
  // reading `-` is compared — and while the file declares nothing, the two
  // agree. So a row that says "no dependencies" is unmeasured, not agreed, and
  // says nothing until the file declares something. Both rules promote at the
  // same release, which is what puts them on one deadline.
  const CONTRACT = [
    "openapi: 3.0.0",
    "info:",
    "  title: Orders",
    "# QFAI-CONTRACT-ID: API-0001",
    "",
  ].join("\n");

  const undeclared = async (): Promise<string> =>
    withPack({ ".qfai/spec/03_contract/api/orders.yaml": CONTRACT }, async (root) => {
      const issues = await validateContracts(root, defaultConfig);
      return issues.find((item) => item.code === "QFAI-CONTRACT-015")?.message ?? "";
    });

  it("names the rule that has nothing to compare until this one is answered", async () => {
    expect(await undeclared()).toContain("QFAI-CONTRACT-033");
  });

  it("says a `-` row is unmeasured rather than agreed", async () => {
    // The distinction the reader needs: the row looks answered and is not.
    expect(await undeclared()).toContain("unmeasured rather than agreed");
  });
});
