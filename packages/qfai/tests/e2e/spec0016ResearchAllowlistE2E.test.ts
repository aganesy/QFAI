/**
 * E2E: the domain allowlist the shipped web-research skill declares (spec-0016).
 *
 * The story is about what a project may reach, and the artifact that settles it
 * is the skill `qfai init` writes into the project. This drives init and reads
 * the file the adopter ends up with, not the template beside it.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

let projectRoot = "";
let researchSkill = "";

beforeAll(async () => {
  projectRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-research-"));
  await captureStdout(() => runInit({ dir: projectRoot, force: false, dryRun: false, yes: true }));
  researchSkill = await readFile(
    path.join(projectRoot, ".qfai", "assistant", "skills", "web-research", "SKILL.md"),
    "utf-8",
  );
});

afterAll(async () => {
  if (projectRoot) {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

// QFAI:BF-0001
describe("E2E: the research pipeline fetches only allowlisted domains (US-0016-0005)", () => {
  it("declares the allowlist in the project's own configuration file", () => {
    expect(researchSkill).toContain("`qfai.config.yaml` under `webResearch.allowlist`");
  });

  it("defaults to deny, so an unlisted domain is not reachable by omission", () => {
    expect(researchSkill).toContain("default-deny");
    expect(researchSkill).toContain("Only domains listed in the project allowlist may be fetched");
  });

  it("holds the allowlist across a redirect chain", () => {
    // A single-hop check is the hole: an allowlisted host that redirects
    // elsewhere would otherwise fetch the destination the list excludes.
    expect(researchSkill).toContain(
      "Redirect chains are followed only while all hops remain on allowlisted domains",
    );
  });

  it("keeps the skip switch away from the allowlist", () => {
    // Matched across a line break, because the sentence is wrapped prose and a
    // reflow would otherwise read as the rule being gone.
    expect(researchSkill).toMatch(
      /domain allowlist enforcement and sanitization\s+cannot be bypassed/,
    );
  });
});
