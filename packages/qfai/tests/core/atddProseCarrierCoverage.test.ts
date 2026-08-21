/**
 * ATDD coverage could not tell an executable test from a list of IDs.
 *
 * Satisfaction is a text match over `tests/{e2e,api,integration}/**`, and
 * `STRUCTURAL_ANNOTATION_EXTENSIONS` deliberately widens the scan past code so
 * a Gherkin feature or a markdown annotation ledger can carry the ID. Nothing
 * then asked which kind of file the match came from, so a bullet list
 * discharged `QFAI-ATDD-111` / `-112` / `-113` / `-115` exactly as an
 * acceptance test did — and `missing: {us: [], tc: [], conApi: [], conDb: []}`
 * was the only thing the summary artifact said about it.
 *
 * The distinction is now reported, not enforced: markdown stays a legitimate
 * carrier, `QFAI-ATDD-118` (`info`) names the obligations that have nothing
 * else, and `coveredByCarrierOnly` puts the same partition in
 * `summary.json` so `qfai report` and the completion reviewer can gate on it.
 * A `.feature` counts as code — a runner executes it.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

type Project = {
  /** `US-*` ids declared in `02_User-stories.md`. */
  us?: string[];
  /** `TC-ID | Level` rows for `06_Test-Cases.md`. */
  tcs?: Array<{ id: string; level: string }>;
  /** Relative path -> file body, written verbatim under the project root. */
  files?: Record<string, string>;
};

async function withProject(project: Project, task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-carrier-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      ["# US", "", ...(project.us ?? []).map((id) => `## ${id}: story`), ""].join("\n"),
      "utf-8",
    );
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...(project.tcs ?? []).map(
          (tc) => `| ${tc.id} | ${tc.level} | AC-0001 | EX-0001 | s | e |`,
        ),
        "",
      ].join("\n"),
      "utf-8",
    );
    for (const [relative, body] of Object.entries(project.files ?? {})) {
      const file = path.join(root, ...relative.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>): string[] =>
  issues.map((entry) => entry.code);

describe("an annotation carrier is not an executable test", () => {
  it("names a US whose only carrier is a markdown bullet list", async () => {
    // The exact shape measured on qfai's own repository: one heading, one
    // bullet per ID, no runner construct anywhere in the file.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/qfai-traceability.md": "# QFAI E2E Traceability\n\n- QFAI:SPEC-0001:US-0001\n",
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const carrierOnly = issues.find((entry) => entry.code === "QFAI-ATDD-118");

        expect(carrierOnly?.severity).toBe("info");
        expect(carrierOnly?.refs).toEqual(["SPEC-0001:US-0001"]);
        // The old reading, still true and still not enough on its own.
        expect(codes(issues)).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("says nothing when an executable test carries the same annotation", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.test.ts": "// QFAI:SPEC-0001:US-0001\n",
        },
      },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-118");
        expect(found).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("treats one executable carrier as enough, even beside a markdown one", async () => {
    // The partition is per obligation, not per file: a ledger listing every ID
    // must not turn a genuinely tested obligation into a finding.
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n",
          "tests/e2e/us-0001.test.ts": "// QFAI:SPEC-0001:US-0001\n",
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-118",
        );
      },
    );
  });

  it("counts a Gherkin feature as code, because a runner executes it", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: {
          "tests/e2e/us-0001.feature":
            "Feature: story\n  # QFAI:SPEC-0001:US-0001\n  Scenario: it works\n",
        },
      },
      async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-118",
        );
      },
    );
  });

  it("covers TC and CON-API on the same terms as US", async () => {
    await withProject(
      {
        tcs: [{ id: "TC-0001", level: "L3" }],
        files: {
          "tests/integration/qfai-traceability.md": "- QFAI:SPEC-0001:TC-0001\n",
          "tests/api/qfai-traceability.md": "- QFAI:CON-API-0001\n",
          ".qfai/contracts/api/orders.yaml":
            "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.1.0\npaths:\n  /orders:\n    get:\n      responses: {}\n",
        },
      },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(result.coveredByCarrierOnly.tc).toEqual(["SPEC-0001:TC-0001"]);
        expect(result.coveredByCarrierOnly.conApi).toEqual(["CON-API-0001"]);
        expect(result.missing.tc).toEqual([]);
        expect(result.missing.conApi).toEqual([]);
      },
    );
  });

  it("does not claim a Unit/Component TC, which owes no annotation at all", async () => {
    // `QFAI-ATDD-117` already owns L1/L2. Reporting them here too would name
    // the same TC under two exclusions with contradictory remedies.
    await withProject(
      {
        tcs: [{ id: "TC-0001", level: "L1" }],
        files: { "tests/integration/qfai-traceability.md": "- QFAI:SPEC-0001:TC-0001\n" },
      },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(result.coveredByCarrierOnly.tc).toEqual([]);
        expect(result.unitComponentTcIds).toEqual(["SPEC-0001:TC-0001"]);
      },
    );
  });

  it("persists the partition into the summary artifact, not only into the findings", async () => {
    // `missing: []` is what `qfai report`, the completion reviewer and
    // `qa-gatekeeper` read. Without a second field there, the finding exists
    // and every downstream consumer still sees "fully covered".
    await withProject(
      {
        us: ["US-0001", "US-0002"],
        files: {
          "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n",
          "tests/e2e/us-0002.test.ts": "// QFAI:SPEC-0001:US-0002\n",
        },
      },
      async (root) => {
        await validateAtddCodeTraceability(root, defaultConfig);
        const parsed: unknown = JSON.parse(
          await readFile(
            path.join(root, ".qfai", "report", "atdd-traceability", "summary.json"),
            "utf-8",
          ),
        );
        expect(parsed).toMatchObject({
          missing: { us: [] },
          coveredByCarrierOnly: { us: ["SPEC-0001:US-0001"], tc: [], conApi: [], conDb: [] },
        });

        const markdown = await readFile(
          path.join(root, ".qfai", "report", "atdd-traceability", "summary.md"),
          "utf-8",
        );
        expect(markdown).toContain("## Covered By Annotation Carrier Only");
        expect(markdown).toContain("SPEC-0001:US-0001");
      },
    );
  });

  it("keeps a scoped run to its own spec's prose-only obligations", async () => {
    await withProject(
      {
        us: ["US-0001"],
        files: { "tests/e2e/qfai-traceability.md": "- QFAI:SPEC-0001:US-0001\n" },
      },
      async (root) => {
        const scoped = await validateAtddCodeTraceability(root, defaultConfig, {
          specScope: new Set(["0002"]),
        });
        expect(codes(scoped)).not.toContain("QFAI-ATDD-118");
      },
    );
  });
});
