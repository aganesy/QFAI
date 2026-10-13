// QFAI:AC-0001-0236-04

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../../helpers/graphReuse.js";
import { prepareCodeAnalysis } from "../../../../src/core/graph/codePreparation.js";
import { exploreGraph } from "../../../../src/core/graph/query.js";

describe("AC-0001-0236-04", () => {
  it("excludes unusable candidates and prepares local analysis without copying unsafe cached inputs", async () => {
    for (const damage of ["missing", "partial", "corrupt", "incompatible", "unsafe"]) {
      const fixture = await completedCodeSnapshotFixture();
      try {
        const metadata = path.join(fixture.candidate, "completed.json");
        const source = await readFile(path.join(fixture.root, "checkout.ts"));
        if (damage === "missing") await rm(fixture.candidate, { recursive: true });
        if (damage === "partial") await rm(metadata);
        if (damage === "corrupt") await writeFile(metadata, "{broken");
        if (damage === "incompatible") {
          const value: Record<string, unknown> = JSON.parse(await readFile(metadata, "utf8"));
          await writeFile(metadata, JSON.stringify({ ...value, engineVersion: "other-engine" }));
        }
        if (damage === "unsafe")
          await writeFile(path.join(fixture.candidate, "analysis", ".env"), "Cached secret input");
        const run = localCodeGenerationProcess(fixture);
        expect(
          await prepareCodeAnalysis(fixture.root, run, fixture.environment),
          damage,
        ).toMatchObject({ status: "prepared", source: "generated" });
        expect(await readFile(path.join(fixture.analysis, "checkout.ts"))).toEqual(source);
        await expect(readFile(path.join(fixture.analysis, ".env"))).rejects.toMatchObject({
          code: "ENOENT",
        });
        expect(
          (await exploreGraph(fixture.root, { domain: "code", question: "checkout" }, run)).status,
        ).toBe("answered");
        expect(await readFile(path.join(fixture.root, "checkout.ts"))).toEqual(source);
        if (damage === "unsafe")
          expect(await readFile(path.join(fixture.candidate, "analysis", ".env"), "utf8")).toBe(
            "Cached secret input",
          );
      } finally {
        await fixture.dispose();
      }
    }
  });
});
