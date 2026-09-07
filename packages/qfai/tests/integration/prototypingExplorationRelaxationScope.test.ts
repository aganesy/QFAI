/**
 * Pins the profile boundary of the CHG-006 exploration relaxation.
 *
 * `mode.ts` scopes the medium relaxation to "the prototyping profile", but the
 * downgrade used to be applied inside `runPrototypingValidators` — the helper
 * `runFullValidators` also calls. Its trigger is a file committed to the
 * repository under test (`.qfai/evidence/prototyping/prototyping.json#mode`),
 * nothing resets it when the project leaves the prototyping stage, and the last
 * explicit mode is inherited forward. So a loop abandoned mid-exploration
 * silently downgraded four gates of `--profile verify` — the run
 * `qfai-verify/SKILL.md` calls full-scan and unweakenable — from `error` to
 * `warning`, permanently.
 *
 * The fixture is the minimum that raises `QFAI-CRIT-008` at `error`: one
 * critique evidence file whose desktop section is `verdict: PASS` and whose
 * mobile section is `verdict: REVISE`. The only edit between the exploration
 * and convergence cases is `iterations[0].mode`.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { PROTOTYPING_JSON_REL } from "../../src/core/prototyping/paths.js";
import type { PrototypingMode } from "../../src/core/prototyping/mode.js";
import type { IssueSeverity, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

const RELAXABLE_CODE = "QFAI-CRIT-008";

/** Desktop PASS + mobile REVISE => `renderCritique` raises QFAI-CRIT-008 at error. */
const CRITIQUE_EVIDENCE = [
  "# Critique 001",
  "",
  "date: 2026-08-22",
  "",
  "## Desktop viewport",
  "",
  "viewport: desktop",
  "verdict: PASS",
  "findings: none",
  "",
  "## Mobile viewport",
  "",
  "viewport: mobile",
  "verdict: REVISE",
  "findings: the primary CTA falls below the fold.",
  "",
].join("\n");

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** Project root whose only prototyping-mode input is `iterations[0].mode`. */
async function seedRoot(mode: PrototypingMode): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-exploration-scope-"));
  tempDirs.push(root);
  await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, "critique-001.md"), CRITIQUE_EVIDENCE, "utf-8");
  const protoJson = path.join(root, PROTOTYPING_JSON_REL);
  await mkdir(path.dirname(protoJson), { recursive: true });
  await writeFile(
    protoJson,
    `${JSON.stringify({ iterations: [{ index: 0, mode }] }, null, 2)}\n`,
    "utf-8",
  );
  return root;
}

/** Severity of the relaxable finding under `profile`, or undefined when absent. */
async function relaxableSeverity(
  root: string,
  profile: ValidationProfile,
): Promise<IssueSeverity | undefined> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.find((i) => i.code === RELAXABLE_CODE)?.severity;
}

describe("exploration relaxation is scoped to the profile that declares it", () => {
  it("downgrades the soft-rubric gate under the prototyping profile", async () => {
    const root = await seedRoot("exploration");
    expect(await relaxableSeverity(root, "prototyping")).toBe("warning");
  });

  it("downgrades it under saas-package, which layers on the prototyping issue set", async () => {
    const root = await seedRoot("exploration");
    expect(await relaxableSeverity(root, "saas-package")).toBe("warning");
  });

  it("keeps the declared error severity under verify and full", async () => {
    const root = await seedRoot("exploration");
    expect(await relaxableSeverity(root, "verify")).toBe("error");
    expect(await relaxableSeverity(root, "full")).toBe("error");
  });

  it("reports error in every profile under convergence (the relaxation is the only variable)", async () => {
    const root = await seedRoot("convergence");
    expect(await relaxableSeverity(root, "prototyping")).toBe("error");
    expect(await relaxableSeverity(root, "saas-package")).toBe("error");
    expect(await relaxableSeverity(root, "verify")).toBe("error");
    expect(await relaxableSeverity(root, "full")).toBe("error");
  });
});
