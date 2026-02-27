import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

describe("validatePrototypingEvidence", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-evidence-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("fails when prototyping evidence files are missing", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const missingIssue = issues.find((item) => item.code === "QFAI-PROT-101");

      expect(missingIssue).toBeDefined();
      expect(missingIssue?.severity).toBe("error");
    });
  });

  it("fails when runtimeGate.ui or meta is missing from evidence schema", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const evidenceRoot = path.join(root, ".qfai", "evidence");
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(
        path.join(evidenceRoot, "prototyping.md"),
        "# Prototyping Evidence\n",
        "utf-8",
      );
      await writeFile(
        path.join(evidenceRoot, "prototyping.json"),
        `${JSON.stringify(
          {
            specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
            runtimeGate: {
              api: [{ method: "GET", path: "/api/orders", status: 200 }],
            },
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const schemaIssue = issues.find((item) => item.code === "QFAI-PROT-101");

      expect(schemaIssue).toBeDefined();
      expect(schemaIssue?.severity).toBe("error");
      expect(schemaIssue?.rule).toBe("prototypingEvidence.schema");
    });
  });

  it("fails when evidence does not cover all specs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001", "0002"]);
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const coverageIssue = issues.find(
        (item) => item.code === "QFAI-PROT-111",
      );

      expect(coverageIssue).toBeDefined();
      expect(coverageIssue?.severity).toBe("error");
      expect(coverageIssue?.refs).toContain("spec-0002");
    });
  });

  it("fails when declared checks are unresolved or runtime API has 404", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        specs: [
          {
            specId: "spec-0001",
            declared: { uiRoutes: 2, apiEndpoints: 2, dbObjects: 1 },
            checked: { uiOk: 1, apiNon404: 1, dbPresent: 0 },
            missing: {
              uiRoutes: ["/orders/new"],
              apiEndpoints: ["POST /api/orders"],
              dbObjects: ["orders"],
            },
          },
        ],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 404 }],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-112")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-113")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-114")).toBe(true);
    });
  });

  it("passes when all specs are covered and runtime API has no 404", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001", "0002"]);
      await seedEvidence(root, {
        specs: [
          buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 }),
          buildSpecRow("spec-0002", { ui: 2, api: 2, db: 1 }),
        ],
        runtimeGate: {
          ui: [
            { route: "/orders", status: 200 },
            { route: "/orders/new", status: 200 },
          ],
          api: [
            { method: "GET", path: "/api/orders", status: 200 },
            { method: "POST", path: "/api/orders", status: 201 },
            { method: "GET", path: "/api/health", status: 200 },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });
});

async function seedSpecs(root: string, specNumbers: string[]): Promise<void> {
  for (const specNumber of specNumbers) {
    await mkdir(path.join(root, ".qfai", "specs", `spec-${specNumber}`), {
      recursive: true,
    });
  }
}

type EvidenceSpecRow = {
  specId: string;
  declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
  checked: { uiOk: number; apiNon404: number; dbPresent: number };
  missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
};

type EvidencePayload = {
  specs: EvidenceSpecRow[];
  runtimeGate?: {
    ui: Array<{ route: string; status: number }>;
    api: Array<{ method: string; path: string; status: number }>;
  };
};

async function seedEvidence(
  root: string,
  payload: EvidencePayload,
): Promise<void> {
  const evidenceRoot = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    path.join(evidenceRoot, "prototyping.md"),
    "# Prototyping Evidence\n",
    "utf-8",
  );
  await writeFile(
    path.join(evidenceRoot, "prototyping.json"),
    `${JSON.stringify(
      {
        specs: payload.specs,
        runtimeGate: payload.runtimeGate ?? { ui: [], api: [] },
        meta: {
          generatedAt: "2026-02-23T00:00:00.000Z",
          toolVersion: "1.4.33",
          commands: ["pnpm dev"],
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

function buildSpecRow(
  specId: string,
  counts: { ui: number; api: number; db: number },
): EvidenceSpecRow {
  return {
    specId,
    declared: {
      uiRoutes: counts.ui,
      apiEndpoints: counts.api,
      dbObjects: counts.db,
    },
    checked: {
      uiOk: counts.ui,
      apiNon404: counts.api,
      dbPresent: counts.db,
    },
    missing: {
      uiRoutes: [],
      apiEndpoints: [],
      dbObjects: [],
    },
  };
}
