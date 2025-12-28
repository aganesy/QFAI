import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectSpecFiles } from "../../src/core/discovery.js";

describe("collectSpecFiles", () => {
  it("filters spec files by naming rules", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discovery-"));
    const specRoot = path.join(root, "qfai", "spec");
    const candidates = [
      "spec.md",
      "spec-0001-sample.md",
      "SPEC-0002-SAMPLE.md",
      "nested/spec-0003-nested.md",
      "spec-001-sample.md",
      "spec-00001-sample.md",
      "spec-0001.md",
      "spec-0001-.md",
      "spec-0001-sample.txt",
    ];

    for (const file of candidates) {
      const fullPath = path.join(specRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    const found = await collectSpecFiles(specRoot);
    const relative = found
      .map((file) => toPosix(path.relative(specRoot, file)))
      .sort();

    expect(relative).toEqual(
      [
        "SPEC-0002-SAMPLE.md",
        "nested/spec-0003-nested.md",
        "spec-0001-sample.md",
        "spec.md",
      ].sort(),
    );
  });
});

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
