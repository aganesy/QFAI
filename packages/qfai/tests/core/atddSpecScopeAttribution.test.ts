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

type SpecSeed = { specNumber: string; usIds: string[]; tcIds: string[]; level?: string };

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
        ...spec.tcIds.map((id) => `| ${id} | ${spec.level ?? "L3"} | AC-0001 | EX-0001 | s | e |`),
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

describe("a shared spec artifact keeps a finding repo-wide", () => {
  it("does not let one spec's path drop a duplicate that lives in _policies", async () => {
    // `QFAI-ID-001` reports a duplicate between a shared `_policies` file and a
    // `spec-0001` one. The shared file is genuinely part of the finding — the
    // duplicate is present for every spec — but with `0001` attributed, every
    // other scope dropped it, so only one spec's run ever showed it.
    await withProject(async (root) => {
      const specsRoot = path.join(root, ".qfai", "specs");
      const finding = {
        file: path.join(specsRoot, "_policies", "08_Decisions.md"),
        relatedFiles: [path.join(specsRoot, "spec-0001", "07_Decisions.md")],
      };

      const roots = { root, specsRoot };
      expect(isFindingInSpecScope(finding, roots, new Set(["0001"]))).toBe(true);
      expect(isFindingInSpecScope(finding, roots, new Set(["0002"]))).toBe(true);
    });
  });

  it("still lets an attributed finding be scoped when no shared file is named", async () => {
    // The auxiliary `tests/**` path is not a claim about ownership, so it must
    // not grant universal membership the way a `_policies` file does.
    await withProject(async (root) => {
      const specsRoot = path.join(root, ".qfai", "specs");
      const finding = {
        file: path.join(root, "tests", "integration", "typo.test.ts"),
        relatedFiles: [path.join(specsRoot, "spec-0001")],
      };

      const roots = { root, specsRoot };
      expect(isFindingInSpecScope(finding, roots, new Set(["0001"]))).toBe(true);
      expect(isFindingInSpecScope(finding, roots, new Set(["0002"]))).toBe(false);
    });
  });
});

describe("an unknown reference is attributed to both of its owners", () => {
  it("lists the test's own spec in relatedFiles, so the scope filter keeps it", async () => {
    // `narrowUnknown` keeps the finding for `--spec 0002`, and then
    // `isFindingInSpecScope` re-derives the owners from `relatedFiles` — where
    // an unowned `tests/**` path contributes nothing. Listing only the token's
    // spec undid the narrowing one layer later.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "spec-0002", "typo.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-102");
      expect(finding?.relatedFiles).toContain(path.join(root, ".qfai", "specs", "spec-0002"));

      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(true);
    });
  });
});

describe("a forbidden reference is owned by the tests that hold it", () => {
  it("keeps a misplaced annotation inside the owning spec's own scope", async () => {
    // The unknown-reference path already treats a file under
    // `tests/integration/spec-0002/**` as `0002`'s. Attributing a forbidden
    // placement to the token alone meant the gate of the spec whose tests hold
    // the misplacement never saw it, and only an unrelated spec's run did.
    await withProject(async (root) => {
      await seed(root, SPECS);
      // `TC-0001` declares no `Level`, so its home is `tests/integration/**`
      // and this reference from `tests/api/**` is a forbidden placement.
      const testFile = path.join(root, "tests", "api", "spec-0002", "misplaced.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      const finding = scoped.find((entry) => entry.code === "QFAI-ATDD-121");
      expect(finding).toBeDefined();
      // Through the final filter, not just the validator return value:
      // `isFindingInSpecScope` re-derives the owners from `relatedFiles`, so a
      // test that stops at the return value passes while `qfai validate --spec`
      // still drops the finding.
      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(true);
    });
  });

  it("does not read a spec number from an ancestor of the checkout", async () => {
    // `entry.file` is absolute, so scanning every segment made a checkout that
    // happens to live under a directory called `spec-0002` claim every test in
    // it — dropping repo-wide findings from one scope and leaking siblings into
    // another. Only `<layer>/spec-NNNN/**` counts.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "flat.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-9999:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      // `9999` names no spec pack, so this stays repo-wide whatever the
      // checkout's own path segments happen to be called.
      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0001"]),
      });
      expect(scoped.map((entry) => entry.code)).toContain("QFAI-ATDD-102");
    });
  });

  it("does not read a spec number from above the configured tests root", async () => {
    // The checkout itself lives under a directory pair spelled exactly like
    // the canonical layout. `entry.file` is absolute, so a flat
    // `tests/integration/a.test.ts` inside it was attributed to `0002` — the
    // repo-wide finding vanished from `--spec 0001` and appeared in `0002`'s
    // run instead. The random temp root the ancestor test uses cannot build
    // this shape, so it is built explicitly here.
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-ancestor-"));
    const root = path.join(base, "integration", "spec-0002", "repo");
    try {
      await mkdir(root, { recursive: true });
      await seed(root, SPECS);
      const testFile = path.join(root, "tests", "integration", "flat.test.ts");
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-9999:TC-0001", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      // `9999` names no spec pack, so this stays repo-wide — including in a
      // run scoped to the very number the checkout's ancestor happens to spell.
      for (const scope of ["0001", "0002"]) {
        const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
          specScope: new Set([scope]),
        });
        expect(scoped.map((entry) => entry.code)).toContain("QFAI-ATDD-102");
      }
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("does not list a sibling spec's excluded TCs in a scoped run", async () => {
    // `QFAI-ATDD-117` names the excluded ids, and it was filed at `specsRoot` —
    // which belongs to every scope — so a `--spec 0002` run reported
    // spec-0001's L1/L2 TCs whether or not spec-0002 had any of its own.
    await withProject(async (root) => {
      await seed(root, [
        { specNumber: "0001", usIds: ["US-0001"], tcIds: ["TC-0001"], level: "L1" },
        { specNumber: "0002", usIds: ["US-0001"], tcIds: ["TC-0001"] },
      ]);

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      const found = scoped.find((entry) => entry.code === "QFAI-ATDD-117");
      expect(found?.message ?? "").not.toContain("SPEC-0001");
      expect(found?.refs ?? []).not.toContain("SPEC-0001:TC-0001");
    });
  });

  it("does not read a spec number from a fixture below the owning directory", async () => {
    // `tests/integration/spec-0002/fixtures/api/spec-0001/**` — the inner pair
    // is spelled exactly like the layout, so scanning from the end returned
    // `0001` and the file's own gate stopped seeing its findings again. The
    // owner is the second segment from the tests root, or there is none.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(
        root,
        "tests",
        "integration",
        "spec-0002",
        "fixtures",
        "api",
        "spec-0001",
        "a.test.ts",
      );
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      const finding = scoped.find((entry) => entry.code === "QFAI-ATDD-102");
      expect(finding).toBeDefined();
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(true);
    });
  });

  it("keeps looking outwards past a spec-named directory that is not the owner", async () => {
    // `tests/integration/spec-0002/fixtures/spec-0001/**`: the innermost
    // `spec-NNNN` is a fixture named after the spec it stands in for, and
    // stopping there returned `null` — losing `0002`, the gate that owns the
    // file, so `--spec 0002` never saw the unknown reference in its own tests.
    await withProject(async (root) => {
      await seed(root, SPECS);
      const testFile = path.join(
        root,
        "tests",
        "integration",
        "spec-0002",
        "fixtures",
        "spec-0001",
        "a.test.ts",
      );
      await mkdir(path.dirname(testFile), { recursive: true });
      await writeFile(
        testFile,
        ["// QFAI:SPEC-0001:TC-9999", "it('x', () => {});", ""].join("\n"),
        "utf-8",
      );

      const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
        specScope: new Set(["0002"]),
      });
      const finding = scoped.find((entry) => entry.code === "QFAI-ATDD-102");
      expect(finding).toBeDefined();
      const roots = { root, specsRoot: path.join(root, ".qfai", "specs") };
      expect(isFindingInSpecScope(finding ?? {}, roots, new Set(["0002"]))).toBe(true);
    });
  });
});
