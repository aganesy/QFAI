/**
 * TC-0013-0036 / TC-0013-0037 — an optional side artifact does not decide the
 * SDD preflight.
 *
 * - TC-0013-0036 (normal): a pack whose required markdown is complete and whose
 *   `prototyping.yaml` is absent is ready.
 * - TC-0013-0037 (error): the same pack is still ready when `prototyping.yaml`
 *   is present with an invalid schema, or in the legacy format with no
 *   `prototyping` namespace.
 *
 * Each case reads the whole result, not `status` alone. A gap never blocks, so
 * a preflight that listed the side artifact as a gap would still answer
 * `ready`; with the markdown complete, the only result that does not depend on
 * the side artifact is `ready` with no blocker and no gap.
 */
// QFAI:SPEC-0013:TC-0013-0036
// QFAI:SPEC-0013:TC-0013-0037

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight, type SddPreflightResult } from "../../src/core/preflight/sddPreflight.js";

// The pack's required markdown, listed here rather than imported from the
// product: a case built from the product's own list would follow any file the
// product started to require, and could no longer notice it.
const REQUIRED_MARKDOWN = [
  "01_Context.md",
  "02_Inception-Deck.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "10_Policy.md",
  "11_OQ-Register.md",
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

const PACK_NAME = "discussion-20260301090000000";

function markdownFor(fileName: (typeof REQUIRED_MARKDOWN)[number]): string {
  const body = [
    `# ${fileName}`,
    "",
    "This file belongs to a discussion pack used by the side artifact preflight cases.",
    "It carries enough prose to meet the minimum content check on its own.",
  ];
  if (fileName === "03_Story-Workshop.md") {
    body.push("", "```mermaid", "flowchart LR", "  User --> System", "```");
  }
  if (fileName === "06_REQ.md") {
    body.push("", "- REQ-0001: The user can save a requirement set for a later audit.");
  }
  return `${body.join("\n")}\n`;
}

/**
 * Runs the preflight over a pack whose required markdown is complete. The
 * side artifact is written only when `sideArtifact` is given.
 */
async function preflightWithSideArtifact(sideArtifact: string | null): Promise<SddPreflightResult> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-side-artifact-preflight-"));
  try {
    const packDir = path.join(root, ".qfai", "discussion", PACK_NAME);
    await mkdir(packDir, { recursive: true });
    for (const fileName of REQUIRED_MARKDOWN) {
      await writeFile(path.join(packDir, fileName), markdownFor(fileName), "utf-8");
    }
    if (sideArtifact !== null) {
      await writeFile(path.join(packDir, "prototyping.yaml"), sideArtifact, "utf-8");
    }
    return await runSddPreflight(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function expectReadyWithNoBlockerAndNoGap(result: SddPreflightResult): void {
  expect(result.status).toBe("ready");
  expect(result.selectedInputPath).toContain(PACK_NAME);
  expect(result.blockers).toEqual([]);
  expect(result.packGaps).toEqual([]);
}

describe("AC-0013-0028: an optional side artifact does not block the preflight", () => {
  it("TC-0013-0036: a complete pack with no side artifact is ready with no blocker and no gap", async () => {
    const result = await preflightWithSideArtifact(null);

    expectReadyWithNoBlockerAndNoGap(result);
  });

  it("TC-0013-0037: a side artifact with an invalid schema leaves the preflight ready with no blocker and no gap", async () => {
    const result = await preflightWithSideArtifact(
      ["prototyping:", "  recommended_mode: invalid-mode", "  rationale: ''", ""].join("\n"),
    );

    expectReadyWithNoBlockerAndNoGap(result);
  });

  it("TC-0013-0037: a side artifact in the legacy format leaves the preflight ready with no blocker and no gap", async () => {
    const result = await preflightWithSideArtifact(
      [
        "recommended_mode: full-harness",
        "rationale: top-level keys with no prototyping namespace",
        "allowed_modes:",
        "  - full-harness",
        "surface: web",
        "",
      ].join("\n"),
    );

    expectReadyWithNoBlockerAndNoGap(result);
  });
});
