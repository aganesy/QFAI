/**
 * `--spec` could not scope the two spec-owned ATDD coverage rules.
 *
 * `QFAI-ATDD-111` and `QFAI-ATDD-112` were filed against `specsRoot` itself.
 * `owningSpecNumber` returns `null` for a path that is not inside a
 * `spec-NNNN` directory, and `isPathInSpecScope` treats an unowned path as
 * belonging to every scope — so both findings survived every `--spec` filter.
 * A `/qfai-atdd` run on one spec therefore gated on obligations owned by specs
 * it never touched, and a spec with everything discharged could not close.
 *
 * These tests pin the attribution end to end: the finding names a spec
 * directory, lists the rest under `relatedFiles`, and the real scope filter
 * drops it when the scoped spec is not implicated.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { isFindingInSpecScope, resolveSpecScope } from "../../src/core/specScope.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../../src/core/atdd/scaffold.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";

type SpecSeed = { specNumber: string; usIds: string[]; tcIds: string[] };

async function seed(root: string, specs: SpecSeed[]): Promise<void> {
  for (const spec of specs) {
    const specDir = path.join(root, ".qfai", "specs", `spec-${spec.specNumber}`);
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      [
        "# 02 User stories",
        "",
        ...spec.usIds.flatMap((id) => [`## ${id}: title`, "- Parent: CAP-0001", ""]),
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...spec.tcIds.map((id) => `| ${id} | L3 | AC-0001 | EX-0001 | s | e |`),
        "",
      ].join("\n"),
      "utf-8",
    );
  }
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-scope-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const SPECS: SpecSeed[] = [
  { specNumber: "0001", usIds: ["US-0001"], tcIds: ["TC-0001"] },
  { specNumber: "0002", usIds: ["US-0001"], tcIds: ["TC-0001"] },
];

/** The scope filter `runValidate` applies, over the same roots it builds. */
async function keptUnderScope(root: string, code: string, specIds: string[]): Promise<boolean> {
  const specsRoot = path.join(root, ".qfai", "specs");
  const issues = await validateAtddCodeTraceability(root, defaultConfig);
  const finding = issues.find((entry) => entry.code === code);
  expect(finding).toBeDefined();
  const { scope } = resolveSpecScope(specIds);
  return isFindingInSpecScope(finding ?? {}, { root, specsRoot }, scope);
}

describe.each([
  ["QFAI-ATDD-111", "usToE2e"],
  ["QFAI-ATDD-112", "tcToDeclaredLayer"],
])("%s is attributed to the specs it names", (code) => {
  it("files the finding against a spec directory, not the specs root", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === code);

      expect(finding?.file).toBe(path.join(root, ".qfai", "specs", "spec-0001"));
      expect(finding?.relatedFiles).toEqual([path.join(root, ".qfai", "specs", "spec-0002")]);
    });
  });

  it("is kept when the scoped spec is one of the implicated ones", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      expect(await keptUnderScope(root, code, ["0002"])).toBe(true);
    });
  });

  it("is dropped when the scoped spec has discharged its own obligations", async () => {
    // The reported failure: `/qfai-atdd spec-0002` finished everything spec-0002
    // owns and still failed its gate on spec-0001's uncovered obligations.
    await withProject(async (root) => {
      await seed(root, [SPECS[0] as SpecSeed, { specNumber: "0002", usIds: [], tcIds: [] }]);
      expect(await keptUnderScope(root, code, ["0002"])).toBe(false);
    });
  });

  it("still reports everything when no scope is requested", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      expect(await keptUnderScope(root, code, [])).toBe(true);
    });
  });
});

describe("a scoped run reports only the scoped spec's ids", () => {
  it("narrows the message and refs, not just whether the finding survives", async () => {
    // `isFindingInSpecScope` can drop a finding but cannot edit one, so a
    // scoped run kept these (correctly — the requested spec is implicated)
    // while the message, `refs` and GitHub annotation still listed every other
    // spec's missing obligations.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const issues = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });

      for (const code of ["QFAI-ATDD-111", "QFAI-ATDD-112"]) {
        const finding = issues.find((entry) => entry.code === code);
        expect(finding?.refs?.every((ref) => ref.includes("SPEC-0002"))).toBe(true);
        expect(finding?.message).not.toContain("SPEC-0001");
      }
    });
  });

  it("leaves an unscoped run untouched", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      const finding = (await validateAtddCodeTraceability(root, defaultConfig)).find(
        (entry) => entry.code === "QFAI-ATDD-112",
      );
      expect(finding?.refs).toHaveLength(2);
    });
  });
});

describe("an attributed finding is not rescued by a repo-level path", () => {
  it("scopes D-SCAFFOLD-PLACEHOLDER by its owning spec", async () => {
    // The skeleton's `file` is `tests/integration/spec-0001/…`, outside
    // `specsRoot` and therefore unowned. `isFindingInSpecScope` used to keep a
    // finding when *any* path was in scope, and an unowned path is in every
    // scope — so the added `relatedFiles` attribution changed nothing and
    // spec-0001's escalated placeholder still failed `--spec 0002`.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "spec-0001", "TC-0001-0001.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        [
          `// ${SCAFFOLD_PLACEHOLDER_MARKER}`,
          "it('TC-0001-0001', () => {",
          "  // TODO: implement assertion for TC-0001-0001",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const finding = (await validateScaffoldPlaceholder(root, defaultConfig)).find(
        (entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER",
      );
      expect(finding).toBeDefined();

      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(false);
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0001"]))).toBe(true);
      expect(isFindingInSpecScope(finding ?? {}, roots, undefined)).toBe(true);
    });
  });

  it("keeps a finding no spec owns at all", async () => {
    // The rule is "attributed findings are judged by their owners", not
    // "unowned findings are dropped" — `QFAI-ATDD-113` against
    // `.qfai/contracts/**` must still fail every scoped gate.
    const roots = { root: "/repo", specsRoot: "/repo/.qfai/specs" };
    expect(
      isFindingInSpecScope(
        { file: "/repo/.qfai/contracts/api/CON-API-0001.yaml" },
        roots,
        new Set(["0002"]),
      ),
    ).toBe(true);
  });
});

describe("a scoped run does not mutate a sibling spec's escalation counter", () => {
  it("skips out-of-scope skeletons before the counter advances", async () => {
    // Three `--spec 0002` gates used to push spec-0001 to the default
    // threshold, so its next run opened at `error` without ever being
    // validated.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "spec-0001", "TC-0001-0001.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        [
          `// ${SCAFFOLD_PLACEHOLDER_MARKER}`,
          "it('TC-0001-0001', () => {",
          "  // TODO: implement assertion for TC-0001-0001",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      for (let pass = 0; pass < 4; pass += 1) {
        const issues = await validateScaffoldPlaceholder(root, defaultConfig, {
          specScope: new Set(["0002"]),
        });
        expect(issues.filter((entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER")).toEqual([]);
      }

      // The counter never moved, so spec-0001's own first run is still a
      // warning with a fresh window.
      const finding = (await validateScaffoldPlaceholder(root, defaultConfig)).find(
        (entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER",
      );
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("(1/3 validate cycles observed)");
    });
  });
});

describe("the shared traceability report stays repo-wide", () => {
  it("writes every spec's obligations under a --spec run", async () => {
    // `.qfai/report/atdd-traceability/summary.{json,md}` has no scope in its
    // path, so writing the narrowed set there overwrote the repo-wide audit
    // artifact with a partial one.
    await withProject(async (root) => {
      await seed(root, SPECS);
      await validateAtddCodeTraceability(root, defaultConfig, { specScope: new Set(["0002"]) });

      const summary = JSON.parse(
        await readFile(
          path.join(root, ".qfai", "report", "atdd-traceability", "summary.json"),
          "utf-8",
        ),
      ) as { missing: { tc: string[] } };
      expect(summary.missing.tc).toEqual(
        expect.arrayContaining(["SPEC-0001:TC-0001", "SPEC-0002:TC-0001"]),
      );
    });
  });
});
