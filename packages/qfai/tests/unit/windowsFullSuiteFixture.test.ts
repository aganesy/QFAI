import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { namedFixture } from "../helpers/windowsFullSuiteFixture.js";

describe("Windows diagnostic fixture setup", () => {
  const bases: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const base of bases.splice(0)) rmSync(base, { recursive: true, force: true });
  });

  it("removes its temp root and rethrows when setup fails", () => {
    const base = mkdtempSync(path.join(tmpdir(), "qfai-named-fixture-base-"));
    bases.push(base);
    for (const name of ["TMPDIR", "TMP", "TEMP"]) vi.stubEnv(name, base);
    expect(tmpdir(), "the fixture root must be created inside the observed base").toBe(base);

    // An empty file name points the first write at the fixture root itself, a directory.
    expect(() => namedFixture("")).toThrow();
    expect(readdirSync(base)).toEqual([]);
  });
});
