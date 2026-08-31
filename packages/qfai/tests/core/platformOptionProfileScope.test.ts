/**
 * `--platform` parses on every `validate` run, but only four of the eight
 * profiles forward it to `detectPlatform`. On `discussion`, `sdd`, `atdd` and
 * `tdd` the value was accepted and discarded in silence: `QFAI-PLATFORM-001`
 * cannot fire there, so a stale or misspelled platform in a CI matrix produced
 * byte-identical legs with nothing in the output naming the cause.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";
import type { ValidationProfile } from "../../src/core/types.js";

const UNUSED = "QFAI-PLATFORM-003";
const UNKNOWN = "QFAI-PLATFORM-001";

// tests/core/<this file> -> packages/qfai -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Scratch trees go under the repository-root `tmp/`, not `os.tmpdir()`:
 * `tmp/` is the sole sanctioned staging area in this repository
 * (`.agents/rules/temporary-files.md`), and removing the tree in `finally`
 * does not license writing it somewhere the rule forbids in the first place —
 * a killed process skips the `finally` and leaves the residue outside the
 * git-ignored area. The directory is absent from a fresh clone, so create it
 * first.
 */
async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const scratchRoot = path.join(repoRoot, "tmp");
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(path.join(scratchRoot, "qfai-platform-scope-"));
  try {
    // Enough of a surface that init counts as having run here; the findings the
    // profiles raise about the rest of the tree are irrelevant to this test.
    await mkdir(path.join(root, ".qfai", "assistant", "skills"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "assistant", "README.md"),
      [
        "# QFAI assistant tree",
        "",
        "## Canonical entrypoint",
        "",
        "- .qfai/assistant/skills/",
        "",
      ].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function codesFor(root: string, profile: ValidationProfile, platform?: string) {
  // `exactOptionalPropertyTypes` is on, so an omitted `--platform` has to be an
  // ABSENT property rather than one holding `undefined`; spreading is what keeps
  // the "no platform given" case expressible without widening the option type.
  const result = await validateProject(root, undefined, {
    profile,
    ...(platform === undefined ? {} : { platform }),
  });
  return result.issues.map((found) => found.code);
}

describe("--platform on a profile that never reads it", () => {
  const discarding: ValidationProfile[] = ["discussion", "sdd", "atdd", "tdd"];

  it.each(discarding)("reports the unused option on `%s`", async (profile) => {
    await withProject(async (root) => {
      const codes = await codesFor(root, profile, "totally-bogus");
      expect(codes).toContain(UNUSED);
    });
  });

  it("stays silent when no --platform was given", async () => {
    await withProject(async (root) => {
      const codes = await codesFor(root, "sdd");
      expect(codes).not.toContain(UNUSED);
    });
  });

  it("names the value and the profile so the operator can act on it", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, {
        profile: "atdd",
        platform: "totally-bogus",
      });
      const finding = result.issues.find((found) => found.code === UNUSED);
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("totally-bogus");
      expect(finding?.message).toContain("atdd");
    });
  });

  it("leaves the profiles that do consume it to `QFAI-PLATFORM-001`", async () => {
    await withProject(async (root) => {
      const codes = await codesFor(root, "prototyping", "totally-bogus");
      expect(codes).toContain(UNKNOWN);
      expect(codes).not.toContain(UNUSED);
    });
  });
});
