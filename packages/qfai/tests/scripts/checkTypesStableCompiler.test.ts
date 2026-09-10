/**
 * The stable type gate has to be the stable compiler, and this is what says so.
 *
 * Two packages here ship a `tsc` — `typescript`, and `typescript-future`, an
 * alias for the next major. One wins the bin name, and the alias did, so a lane
 * spelled `tsc -b` graded every run against a release candidate: the declared
 * range was checked by nothing and the forward-looking lane was a duplicate of
 * this one. Neither said which compiler it had used, which is why it stood.
 *
 * Reached through the decision rather than by running a compiler. A case that
 * shelled out would assert against whichever `tsc` this checkout happens to
 * have resolved, which is the thing under test.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Guard = {
  declaredMajor: (range: unknown) => string | null;
  reportedMajor: (versionOutput: unknown) => string | null;
  compilerMismatch: (declaredRange: unknown, versionOutput: unknown) => string | null;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a
 * drive letter, which an import specifier reads as a scheme.
 */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-types.mjs")).href;
  return (await import(url)) as Guard;
}

const STABLE = "Version 5.9.3\n";
const FUTURE = "Version 6.0.1-rc\n";

describe("declaredMajor", () => {
  it.each([
    ["^5.6.3", "5"],
    ["~5.6.3", "5"],
    ["5.6.3", "5"],
    ["^10.0.0", "10"],
  ])("reads %s as major %s", async (range, expected) => {
    const { declaredMajor } = await load();

    expect(declaredMajor(range)).toBe(expected);
  });

  // A range this cannot read is reported rather than guessed at: a wrong
  // reading here re-opens the hole silently, which is how it stood before.
  it.each([[">=5.6.3 <7"], ["latest"], ["npm:typescript@6.0.3"], [""], [undefined]])(
    "refuses to read %s",
    async (range) => {
      const { declaredMajor } = await load();

      expect(declaredMajor(range)).toBeNull();
    },
  );
});

describe("reportedMajor", () => {
  it("reads a release version", async () => {
    const { reportedMajor } = await load();

    expect(reportedMajor(STABLE)).toBe("5");
  });

  // The alias reports a prerelease, and that is exactly the output this guard
  // exists to catch, so it has to be readable rather than rejected as noise.
  it("reads a release candidate", async () => {
    const { reportedMajor } = await load();

    expect(reportedMajor(FUTURE)).toBe("6");
  });

  it("returns null for output that is not a version line", async () => {
    const { reportedMajor } = await load();

    expect(reportedMajor("command not found")).toBeNull();
  });
});

describe("compilerMismatch", () => {
  it("passes when the compiler is the declared major", async () => {
    const { compilerMismatch } = await load();

    expect(compilerMismatch("^5.6.3", STABLE)).toBeNull();
  });

  // The defect itself: the bin name resolved to the alias, so the stable lane
  // ran the next major against a package declaring the previous one.
  it("reports the alias winning the bin name", async () => {
    const { compilerMismatch } = await load();

    const reason = compilerMismatch("^5.6.3", FUTURE);

    expect(reason).toContain("6.x");
    expect(reason).toContain("5.x");
  });

  it("reports a declared range it cannot read, rather than passing", async () => {
    const { compilerMismatch } = await load();

    expect(compilerMismatch(">=5.6.3 <7", STABLE)).toContain("single major");
  });

  it("reports unreadable compiler output, rather than passing", async () => {
    const { compilerMismatch } = await load();

    expect(compilerMismatch("^5.6.3", "command not found")).toContain("not a version line");
  });
});

describe("the lanes this repository declares", () => {
  // The two lanes exist to disagree. Holding the declarations apart is what
  // keeps a future bump from quietly making them the same compiler again.
  it("declares a stable compiler and a future one, and they are different majors", async () => {
    const { declaredMajor } = await load();
    const manifest = (await import(pathToFileURL(path.join(repoRoot, "package.json")).href, {
      with: { type: "json" },
    })) as { default: { devDependencies: Record<string, string> } };
    const deps = manifest.default.devDependencies;

    const stable = declaredMajor(deps["typescript"]);
    const future = declaredMajor(
      String(deps["typescript-future"]).replace(/^npm:typescript@/u, ""),
    );

    expect(stable, "devDependencies.typescript must be a single-major range").not.toBeNull();
    expect(future, "typescript-future must alias a pinned version").not.toBeNull();
    expect(future).not.toBe(stable);
  });
});
