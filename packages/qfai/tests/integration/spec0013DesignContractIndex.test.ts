import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateSddDesignContractReadiness } from "../../src/core/validators/designContractReadiness.js";

const INDEX_CHECKER = fileURLToPath(
  new URL("../../scripts/check-design-contract-index.mjs", import.meta.url),
);

function runIndexCheck(indexPath?: string) {
  return spawnSync(process.execPath, [INDEX_CHECKER, ...(indexPath ? [indexPath] : [])], {
    encoding: "utf8",
  });
}

const DESIGN_INDEX = [
  "# Contract Index",
  "",
  "## Active Contract Sets",
  "",
  "### Design Contracts",
  "",
  "| Short ID | Entity | Declared ID | File | Purpose |",
  "| -------- | ------ | ----------- | ---- | ------- |",
  "| DCON-001 | Exploration Brief | exploration-brief | `.qfai/contracts/design/exploration-brief.yaml` | REMOVED, history only |",
  "| DCON-002 | Evaluation Rubric | evaluation-rubric | `.qfai/contracts/design/evaluation-rubric.yaml` | DEPRECATED, history only |",
  "| DCON-005 | Design System | design-system | `.qfai/contracts/design/design-system.yaml` | active |",
  "| DCON-008 | Prototype Handoff | prototype-handoff | `.qfai/contracts/design/prototype-handoff.yaml` | active |",
  "| DCON-030 | DESIGN.md | design-md | `DESIGN.md` | active |",
  "| DCON-031 | DESIGN.md Lock | design-md-lock | `.qfai/contracts/design/DESIGN.md.lock.yaml` | active |",
  "| DCON-032 | Design System Mirror | design-system-mirror | (validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md) | active |",
  "",
].join("\n");

async function runFixture(source: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-index-"));
  try {
    const indexPath = path.join(root, "05_Contracts.md");
    await writeFile(indexPath, source);
    return runIndexCheck(indexPath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("spec-0013 Phase 0 design contract gates", () => {
  // QFAI:SPEC-0013:TC-0013-0022
  it("TC-0013-0022: missing DESIGN.md is an error in the SDD design validator", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-design-"));
    try {
      const uiDir = path.join(root, ".qfai", "contracts", "ui");
      await mkdir(uiDir, { recursive: true });
      await writeFile(
        path.join(uiDir, "ui-0001-dashboard.yaml"),
        "screens:\n  - id: dashboard\n    route: /dashboard\n",
      );

      const issues = await validateSddDesignContractReadiness(root, defaultConfig);
      expect(issues).toContainEqual(
        expect.objectContaining({ code: "QFAI-DCON-030", severity: "error", file: "DESIGN.md" }),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0013:TC-0013-0024
  it("TC-0013-0024: current active design contract index matches the five-entry snapshot", async () => {
    expect(runIndexCheck().status).toBe(0);
    expect((await runFixture(DESIGN_INDEX)).status).toBe(0);
  });

  // QFAI:SPEC-0013:TC-0013-0024
  it("TC-0013-0024: an extra active design contract row produces a contract-index finding", async () => {
    const extra = await runFixture(
      DESIGN_INDEX.replace(
        "| DCON-032 |",
        "| DCON-999 | Extra active contract | extra | `.qfai/contracts/design/extra.yaml` | active |\n| DCON-032 |",
      ),
    );
    expect(extra.status).toBe(1);
    expect(extra.stderr).toContain("::error file=");
    expect(extra.stderr).toContain("R-DESIGN-INDEX unexpected active row: DCON-999");
  });

  it.each([
    ["missing row", DESIGN_INDEX.replace(/^.*DCON-008.*\n/m, ""), "missing active row: DCON-008"],
    [
      "duplicate row",
      DESIGN_INDEX.replace(/^(.*DCON-030.*\n)/m, "$1$1"),
      "duplicate active row: DCON-030",
    ],
    [
      "wrong file",
      DESIGN_INDEX.replace("`DESIGN.md`", "`.qfai/contracts/design/DESIGN.md.lock.yaml`"),
      "File must name DESIGN.md: DCON-030",
    ],
    [
      "wrong mirror path",
      DESIGN_INDEX.replace(
        "(validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md)",
        "(validator on `.qfai/contracts/other/design-system.yaml` ↔ DESIGN.md)",
      ),
      "File must name (validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md): DCON-032",
    ],
    [
      "mirror missing DESIGN.md",
      DESIGN_INDEX.replace(" ↔ DESIGN.md)", ")"),
      "File must name (validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md): DCON-032",
    ],
    ["duplicate table", `${DESIGN_INDEX}\n${DESIGN_INDEX}`, "more than one Design Contracts table"],
    [
      "missing table",
      DESIGN_INDEX.replace("### Design Contracts", "### Other"),
      "Design Contracts table is missing",
    ],
    ["fenced table", `\`\`\`md\n${DESIGN_INDEX}\n\`\`\``, "Design Contracts table is missing"],
    ["commented table", `<!--\n${DESIGN_INDEX}\n-->`, "Design Contracts table is missing"],
  ])("contract-index checker rejects %s", async (_name, source, expected) => {
    const result = await runFixture(source);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });
});
