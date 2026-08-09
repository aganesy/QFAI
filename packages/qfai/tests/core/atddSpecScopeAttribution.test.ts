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

describe("a forbidden TC placement is scoped too", () => {
  it("drops a sibling spec's misplaced annotation from a scoped run", async () => {
    // `narrowToScope` narrowed `missing.us` / `missing.tc` only, and the
    // forbidden findings are filed against a `tests/**` path that `specsRoot`
    // does not own — so spec-0001's half-finished annotation failed a
    // `--spec 0002` gate spec-0002 had fully discharged.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const apiTest = path.join(root, "tests", "api", "misplaced.test.ts");
      await mkdir(path.dirname(apiTest), { recursive: true });
      await writeFile(
        apiTest,
        ["// QFAI:SPEC-0001:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const unscoped = await validateAtddCodeTraceability(root, defaultConfig);
      expect(unscoped.map((entry) => entry.code)).toContain("QFAI-ATDD-121");

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      expect(scoped.map((entry) => entry.code)).not.toContain("QFAI-ATDD-121");
    });
  });

  it("keeps it, attributed, when the scoped spec owns the misplacement", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      const apiTest = path.join(root, "tests", "api", "misplaced.test.ts");
      await mkdir(path.dirname(apiTest), { recursive: true });
      await writeFile(
        apiTest,
        ["// QFAI:SPEC-0001:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const finding = (await validateAtddCodeTraceability(root, defaultConfig)).find(
        (entry) => entry.code === "QFAI-ATDD-121",
      );
      // `file` stays the test path — that is what the operator edits.
      expect(finding?.file).toContain(path.join("tests", "api"));
      expect(finding?.relatedFiles).toEqual([path.join(root, ".qfai", "specs", "spec-0001")]);

      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0001"]))).toBe(true);
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(false);
    });
  });
});

describe("an unknown US/TC reference is scoped by the spec its token names", () => {
  it("drops a sibling spec's typo from a scoped run", async () => {
    // `narrowToScope` left `result.unknown` whole, and `QFAI-ATDD-101` / `-102`
    // are filed against the test file carrying the typo — a path no spec owns
    // — so a sibling's `QFAI:SPEC-0001:TC-9999` failed `--spec 0002`.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const unscoped = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = unscoped.find((entry) => entry.code === "QFAI-ATDD-102");
      expect(finding).toBeDefined();
      expect(finding?.relatedFiles).toEqual([path.join(root, ".qfai", "specs", "spec-0001")]);

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      expect(scoped.map((entry) => entry.code)).not.toContain("QFAI-ATDD-102");
    });
  });

  it("keeps a typo in the spec segment inside the owning spec's own tests", async () => {
    // The token is the thing that was mistyped, so attributing the finding to
    // it alone hands the report to a spec that has nothing to do with the
    // file. `qfai atdd scaffold` writes `tests/integration/spec-NNNN/**`, so
    // the directory names the real owner: the completion gate of the spec that
    // owns the file has to see its own broken annotation.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "spec-0002", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      expect(scoped.map((entry) => entry.code)).toContain("QFAI-ATDD-102");

      // The spec the token names still owns it too — both gates report it,
      // which is what makes either one able to catch it.
      const other = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0001"]),
      });
      expect(other.map((entry) => entry.code)).toContain("QFAI-ATDD-102");
    });
  });

  it("keeps an unknown contract reference repo-wide", async () => {
    // A `CON-API-*` token names no spec, so there is nothing to attribute it
    // to — the same documented limit `QFAI-ATDD-113` has.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "api", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:CON-API-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      expect(scoped.map((entry) => entry.code)).toContain("QFAI-ATDD-103");
    });
  });
});

describe("a reference to a spec that does not exist stays repo-wide", () => {
  it("survives a scoped run, because no per-spec gate could own it", async () => {
    // `QFAI:SPEC-9999:TC-0001` in this spec's own tests is the ordinary
    // fat-finger. Treating it as an out-of-scope sibling dropped it from
    // `--spec 0002` — and `--spec 9999` is rejected by `QFAI-SCOPE-002`, so no
    // legitimate per-spec run would ever report it.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-9999:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      for (const specScope of [new Set(["0001"]), new Set(["0002"])]) {
        const issues = await validateAtddCodeTraceability(root, defaultConfig, { specScope });
        const finding = issues.find((entry) => entry.code === "QFAI-ATDD-102");
        expect(finding).toBeDefined();
        // Surviving `narrowToScope` is not enough. `runValidate` applies
        // `isFindingInSpecScope` afterwards, and attributing the finding to a
        // `.qfai/specs/spec-9999` that does not exist gives it an owner of
        // `9999` — which that filter then drops from every real scope, undoing
        // the repo-wide treatment this test is about. The assertion has to run
        // the whole path, not just the validator's return.
        expect(finding?.relatedFiles ?? []).toEqual([]);
        expect(isFindingInSpecScope(finding ?? {}, roots, specScope)).toBe(true);
      }
    });
  });

  it("still scopes a typo that names a spec that does exist", async () => {
    // The narrowing is not abandoned: a sibling's own unknown reference is
    // still that sibling's to fix.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "sibling.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = (
        await validateAtddCodeTraceability(root, defaultConfig, { specScope: new Set(["0002"]) })
      ).map((entry) => entry.code);
      expect(scoped).not.toContain("QFAI-ATDD-102");
    });
  });
});

describe("existence is a directory question, not an id question", () => {
  it("scopes a typo naming a sibling whose catalogues are still empty", async () => {
    // `collectSpecRefs` only keys `specUsIds` / `specTcIds` when the spec
    // declares at least one id, so a spec created moments ago read as
    // nonexistent — and its typo was kept repo-wide, failing the very gate
    // separation this PR exists for.
    await withProject(async (root) => {
      await seed(root, [SPECS[0] as SpecSeed]);
      const emptySpec = path.join(root, ".qfai", "specs", "spec-0002");
      await mkdir(emptySpec, { recursive: true });
      for (const name of ["01_Spec.md", "02_User-stories.md", "06_Test-Cases.md"]) {
        await writeFile(path.join(emptySpec, name), "# empty\n", "utf-8");
      }
      const testFile = path.join(root, "tests", "integration", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0002:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = (
        await validateAtddCodeTraceability(root, defaultConfig, { specScope: new Set(["0001"]) })
      ).map((entry) => entry.code);
      expect(scoped).not.toContain("QFAI-ATDD-102");
    });
  });

  it("keeps a scaffold under a spec directory no pack has in every scope", async () => {
    // `tests/integration/spec-9999/` is the mistyped scaffold. Treating it as
    // an out-of-scope sibling removed the placeholder from every valid scoped
    // gate, because `--spec 9999` is itself rejected by `QFAI-SCOPE-002`.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "spec-9999", "TC-9999-0001.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        [
          `// ${SCAFFOLD_PLACEHOLDER_MARKER}`,
          "it('TC-9999-0001', () => {",
          "  // TODO: implement assertion for TC-9999-0001",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateScaffoldPlaceholder(root, defaultConfig, {
        specScope: new Set(["0001"]),
      });
      const finding = issues.find((entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER");
      expect(finding).toBeDefined();
      // Surviving the scan is not enough — `runValidate` applies
      // `isFindingInSpecScope` afterwards, and naming a `.qfai/specs/spec-9999`
      // that does not exist gives the finding an owner of `9999`, which that
      // filter drops from every real scope. The assertion has to run the whole
      // path, not just the validator's return.
      expect(finding?.relatedFiles ?? []).toEqual([]);
      expect(
        isFindingInSpecScope(
          finding ?? {},
          { root, specsRoot: path.join(root, ".qfai", "specs") },
          new Set(["0001"]),
        ),
      ).toBe(true);
    });
  });
});
