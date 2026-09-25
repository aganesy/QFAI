/**
 * Integration: `qfai sdd preflight` reaches the same readiness verdict whatever state the optional
 * `prototyping.yaml` side artifact is in — present, absent, schema-invalid or legacy-only.
 */
// QFAI:SPEC-0013:TC-0013-0036
// QFAI:SPEC-0013:TC-0013-0037
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runSddPreflightCommand } from "../../src/cli/commands/sddPreflight.js";

const PACK = "discussion-20260925000000001";

const FILES = [
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

const FILLER = [
  "This body stands in for a completed discussion document in a preflight test.",
  "It is long enough to pass the minimum-content check and carries no template placeholder.",
].join("\n");

function body(file: string): string {
  if (file === "03_Story-Workshop.md") {
    return [
      "# 03 Story Workshop",
      "",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
      "",
      FILLER,
    ].join("\n");
  }
  if (file === "06_REQ.md") {
    return [
      "# 06 REQ",
      "",
      "- REQ-0001: The user can save a requirement set, because the audit needs a record of it.",
      "- REQ-0002: The system can reload a saved requirement set and check that it is consistent.",
      "",
      FILLER,
    ].join("\n");
  }
  return [`# ${file}`, "", FILLER].join("\n");
}

const VALID = [
  "prototyping:",
  "  recommended_mode: full-harness",
  "  rationale: UI validation is recommended.",
  "  allowed_modes:",
  "    - full-harness",
  "  surface: web",
  "",
].join("\n");

const SCHEMA_INVALID = [
  "prototyping:",
  "  recommended_mode: invalid-mode",
  "  rationale: ''",
  "",
].join("\n");

const LEGACY_ONLY = [
  "recommended_mode: full-harness",
  "rationale: top-level legacy valid",
  "allowed_modes:",
  "  - full-harness",
  "surface: web",
  "",
].join("\n");

type Verdict = { exit: number; status: unknown; blockers: unknown };

/** Runs the command on a fresh usable pack whose side artifact holds `artifact`, or none. */
async function preflight(artifact: string | null): Promise<Verdict> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-artifact-"));
  try {
    const packDir = path.join(root, ".qfai", "discussion", PACK);
    await mkdir(packDir, { recursive: true });
    for (const file of FILES) {
      await writeFile(path.join(packDir, file), `${body(file)}\n`, "utf-8");
    }
    if (artifact !== null) {
      await writeFile(path.join(packDir, "prototyping.yaml"), artifact, "utf-8");
    }
    const out: string[] = [];
    const exit = await runSddPreflightCommand({
      root,
      format: "json",
      write: (message) => out.push(message),
      writeErr: () => undefined,
    });
    const report: unknown = JSON.parse(out.join("\n"));
    if (typeof report !== "object" || report === null) throw new Error("no JSON report");
    return {
      exit,
      status: "status" in report ? report.status : undefined,
      blockers: "blockers" in report ? report.blockers : undefined,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const READY: Verdict = { exit: 0, status: "ready", blockers: [] };

describe("the optional side artifact does not decide preflight readiness", () => {
  it("TC-0013-0036: Missing optional side artifact leaves preflight ready", async () => {
    expect(await preflight(VALID)).toEqual(READY);
    expect(await preflight(null)).toEqual(READY);
  });

  it("TC-0013-0037: Invalid or legacy optional side artifact leaves preflight ready", async () => {
    expect(await preflight(SCHEMA_INVALID)).toEqual(READY);
    expect(await preflight(LEGACY_ONLY)).toEqual(READY);
  });
});
