/**
 * The local twin of `testTypeCheckEnumeration.test.ts`, which `pnpm check-types` runs before the compiler.
 *
 * That Vitest suite runs only in CI, so a suite missing from `tsconfig.tests.json` passed every
 * local check and failed one CI round after the push. The guard program reports the same omission
 * from the type gate. These cases hold its decision, and hold its reading of the TypeScript
 * allowlist to the list the Vitest suite imports, so the two cannot disagree about what is
 * recorded as uncovered.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { TYPE_CHECK_UNENUMERATED } from "./typeCheckEnumeration.allowlist.js";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

type Problems = (input: {
  suites: string[];
  include: string[];
  allowlist: string[];
  exists: (rel: string) => boolean;
}) => string[];

type Guard = {
  parseInclude: (text: string) => string[];
  parseAllowlist: (text: string) => string[];
  enumerationProblems: Problems;
};

/** A `file:` URL rather than the path: a Windows drive letter reads as a scheme. */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-test-enumeration.mjs")).href;
  return (await import(url)) as Guard;
}

describe("check-test-enumeration", () => {
  it("reports a suite that is in neither the include list nor the allowlist", async () => {
    const { enumerationProblems } = await load();

    const problems = enumerationProblems({
      suites: ["tests/a.test.ts", "tests/b.test.ts", "tests/new.test.ts"],
      include: ["tests/a.test.ts"],
      allowlist: ["tests/b.test.ts"],
      exists: () => true,
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("tests/new.test.ts is in neither");
  });

  it("reports an include entry with no file and an allowlist entry that is covered or gone", async () => {
    const { enumerationProblems } = await load();

    const problems = enumerationProblems({
      suites: ["tests/a.test.ts"],
      include: ["tests/a.test.ts", "tests/renamed.test.ts"],
      allowlist: ["tests/a.test.ts", "tests/deleted.test.ts"],
      exists: (rel) => rel !== "tests/renamed.test.ts",
    });

    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).toContain("names tests/renamed.test.ts");
    expect(problems.join("\n")).toContain("records tests/a.test.ts as uncovered");
    expect(problems.join("\n")).toContain("records tests/deleted.test.ts as uncovered");
  });

  it("passes a tree whose every suite is accounted for", async () => {
    const { enumerationProblems } = await load();

    expect(
      enumerationProblems({
        suites: ["tests/a.test.ts", "tests/b.test.ts"],
        include: ["tests/a.test.ts", "tests/helpers/x.ts"],
        allowlist: ["tests/b.test.ts"],
        exists: () => true,
      }),
    ).toEqual([]);
  });

  it("reads the include list through line comments", async () => {
    const { parseInclude } = await load();

    expect(
      parseInclude('{\n  // why\n  "include": [\n    // a note\n    "tests/a.test.ts"\n  ]\n}'),
    ).toEqual(["tests/a.test.ts"]);
  });

  it("reads the real allowlist as the list the Vitest suite imports", async () => {
    const { parseAllowlist } = await load();
    const text = readFileSync(
      path.join(packageRoot, "tests", "scripts", "typeCheckEnumeration.allowlist.ts"),
      "utf-8",
    );

    expect(parseAllowlist(text)).toEqual([...TYPE_CHECK_UNENUMERATED]);
  });

  it("runs before the compiler in the root check-types script", () => {
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf-8"),
    );
    const scripts =
      manifest !== null && typeof manifest === "object" && "scripts" in manifest
        ? manifest.scripts
        : undefined;
    const body =
      scripts !== null && typeof scripts === "object" && "check-types" in scripts
        ? String(scripts["check-types"])
        : "";

    expect(body.indexOf("node ./scripts/check-test-enumeration.mjs")).toBeGreaterThanOrEqual(0);
    expect(body.indexOf("node ./scripts/check-test-enumeration.mjs")).toBeLessThan(
      body.indexOf("tsc -b"),
    );
  });
});
