/**
 * Integration: `qfai validate --report` zero-stale-references at HEAD
 * (TC-0015-0032, AC-0015-0021).
 *
 * When the shipped reference docs + each affected SKILL.md carry no
 * pre-implementation tokens, `validateStaleReferences` reports zero
 * issues.
 */
// QFAI:SPEC-0015:TC-0015-0032

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateStaleReferences } from "../../src/core/validators/staleReferences.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-zero-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeSkillRef(skillId: string, refName: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skillId, "references");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, refName), body, "utf-8");
}

describe("TC-0015-0032: validateStaleReferences emits zero issues when refs are rewritten", () => {
  it("returns an empty issue list when no stale token appears in any reference doc", async () => {
    await writeSkillRef("qfai-prototyping", "iteration-loop.md", "# Loop\nUses handoff.yaml.\n");
    await writeSkillRef(
      "qfai-prototyping",
      "handoff.md",
      "# Handoff\nCanonical schema lives in core/schemas/handoff.ts.\n",
    );
    const issues = await validateStaleReferences(root, {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("returns an empty list when the skills directory is absent (fresh project)", async () => {
    const issues = await validateStaleReferences(root, {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    expect(issues).toEqual([]);
  });
});
