/**
 * The bottom two layers of `US -> AC -> BR -> EX -> TC` had no ID validation.
 *
 * `ids.ts` — the registry the layered spec-pack validators consume — had no `EX`
 * and no `TC` entry, while the v1421 templates `qfai init` ships write exactly
 * those two kinds. The two format gates for those files still passed the
 * pre-v1421 Gherkin vocabulary (`["SPEC","SC","AC"]` and `["CASE","SC"]`), which
 * matches nothing in a v1421 file, and `validateLayeredNamespace`'s `prefix` was
 * a closed union without them.
 *
 * So `E_ID_INVALID_FORMAT` could not fire on a malformed `TC-1`, and
 * `QFAI-SPACK-101` could not fire on a cross-spec `TC-0007-0001` pasted into
 * another spec.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { extractIds } from "../../src/core/ids.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

async function withSpec<T>(
  files: Partial<Record<"examples" | "testCases", string>>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-extc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n\n- Status: active\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["04_Business-Rules.md", "# BR\n"],
      ["05_Examples.md", files.examples ?? "# EX\n"],
      ["06_Test-Cases.md", files.testCases ?? "# TC\n"],
      ["07_Decisions.md", "# DR\n"],
      ["08_Open-questions.md", "# OQ\n"],
      ["09_delta.md", "# delta\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = async (root: string): Promise<string[]> =>
  (await validateSpecPacks(root, defaultConfig)).map((i) => i.code);

describe("the registry knows the two kinds the templates write", () => {
  it("extracts EX and TC in the composite form AC and BR use", () => {
    expect(extractIds("see EX-0001-0002 and TC-0001-0003", "EX")).toEqual(["EX-0001-0002"]);
    expect(extractIds("see EX-0001-0002 and TC-0001-0003", "TC")).toEqual(["TC-0001-0003"]);
  });

  it("does not accept the truncated form", () => {
    // `TC-1` is precisely what `E_ID_INVALID_FORMAT` could not report.
    expect(extractIds("TC-1", "TC")).toEqual([]);
  });
});

describe("E_ID_INVALID_FORMAT reaches 05_Examples.md and 06_Test-Cases.md", () => {
  it("reports a malformed EX id", async () => {
    await withSpec({ examples: "# EX\n\n## EX-99\n\n- BR-Ref: BR-0001-0001\n" }, async (root) => {
      expect(await codes(root)).toContain("E_ID_INVALID_FORMAT");
    });
  });

  it("reports a malformed TC id", async () => {
    await withSpec({ testCases: "# TC\n\n## TC-1\n\n- EX-Ref: EX-0001-0001\n" }, async (root) => {
      expect(await codes(root)).toContain("E_ID_INVALID_FORMAT");
    });
  });

  it("accepts the well-formed composite ids", async () => {
    await withSpec(
      {
        examples: "# EX\n\n## EX-0001-0001\n\n- BR-Ref: BR-0001-0001\n",
        testCases: "# TC\n\n## TC-0001-0001\n\n- EX-Ref: EX-0001-0001\n- AC-Refs: AC-0001-0001\n",
      },
      async (root) => {
        expect(await codes(root)).not.toContain("E_ID_INVALID_FORMAT");
      },
    );
  });
});

describe("QFAI-SPACK-101 reaches a cross-spec EX/TC id", () => {
  it("reports a TC id belonging to another spec", async () => {
    // Pasting `TC-0007-0001` into spec-0001 is the failure this rule exists for,
    // and it was unreachable for `TC` because the prefix was not in the union.
    await withSpec(
      { testCases: "# TC\n\n## TC-0007-0001\n\n- EX-Ref: EX-0001-0001\n" },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-SPACK-101");
      },
    );
  });

  it("reports a cross-spec EX id", async () => {
    await withSpec({ examples: "# EX\n\n## EX-0007-0001\n" }, async (root) => {
      expect(await codes(root)).toContain("QFAI-SPACK-101");
    });
  });

  it("accepts an id in this spec's own namespace", async () => {
    await withSpec({ testCases: "# TC\n\n## TC-0001-0001\n" }, async (root) => {
      expect(await codes(root)).not.toContain("QFAI-SPACK-101");
    });
  });

  it("names the supported cross-spec citation form in its remedy", async () => {
    // The old remedy said "fix the IDs to match this spec", which is the one
    // thing the author cannot do — the ID belongs to another spec. Layered
    // specs share entities, so citing the owner is a real need, and the only
    // form that passes is the owner's CONTRACT id. That was discoverable only
    // by tripping the validator repeatedly (#1101).
    await withSpec({ testCases: "# TC\n\n## TC-0007-0001\n" }, async (root) => {
      const found = (await validateSpecPacks(root, defaultConfig)).find(
        (i) => i.code === "QFAI-SPACK-101",
      );
      expect(found).toBeDefined();
      expect(found?.suggested_action).toContain("contract id");
      expect(found?.suggested_action).toContain("CON-DB-*");
      // And the file boundary, which was the issue's other open question: five
      // files are checked and `09_delta.md` is not one of them.
      expect(found?.suggested_action).toContain("09_delta.md");
    });
  });
});
