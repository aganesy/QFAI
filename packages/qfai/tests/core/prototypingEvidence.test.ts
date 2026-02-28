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

  it("fails when interactive uiFidelity is missing", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const missingIssue = issues.find((item) => item.code === "QFAI-PROT-231");

      expect(missingIssue).toBeDefined();
      expect(missingIssue?.severity).toBe("error");
    });
  });

  it("fails when uiFidelity elementsPlaced does not match expected elements", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedUiContract(root, {
        contractId: "CON-UI-0001",
        route: "/orders",
        elements: ["search_input", "orders_table"],
        actions: ["go_to_create"],
      });
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 1,
                actionsWired: 1,
              },
              mockPaths: [{ id: "mp_create_to_list", status: "pass" }],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const mismatchIssue = issues.find(
        (item) => item.code === "QFAI-PROT-232",
      );

      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.severity).toBe("error");
      expect(mismatchIssue?.refs).toContain("contract_id=CON-UI-0001");
      expect(mismatchIssue?.refs).toContain("route=/orders");
      expect(mismatchIssue?.refs).toContain(
        "contract_route=CON-UI-0001|/orders",
      );
      expect(mismatchIssue?.refs).toContain(
        "missing_labels=orders_table|search_input",
      );
      expect(mismatchIssue?.refs).toContain(
        "contract_element_labels=orders_table|search_input",
      );
      expect(mismatchIssue?.refs).toContain(
        "missing_labels_by_contract_route=CON-UI-0001|/orders:orders_table|search_input",
      );
      expect(mismatchIssue?.refs).toContain(
        "contract_element_labels_by_contract_route=CON-UI-0001|/orders:orders_table|search_input",
      );
    });
  });

  it("fails when interactive uiFidelity has no screens", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const mismatchIssue = issues.find(
        (item) => item.code === "QFAI-PROT-232",
      );

      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.severity).toBe("error");
      expect(mismatchIssue?.refs).toContain("uiFidelity.screens[]");
    });
  });

  it("fails when uiFidelity references unknown uiContractId", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-9999",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 2,
                actionsWired: 1,
              },
              mockPaths: [{ id: "mp_create_to_list", status: "pass" }],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const mismatchIssue = issues.find(
        (item) => item.code === "QFAI-PROT-232",
      );

      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.severity).toBe("error");
      expect(mismatchIssue?.refs).toContain("contract_id=CON-UI-9999");
      expect(mismatchIssue?.refs).toContain("route=/orders");
    });
  });

  it("fails when uiFidelity actionsWired is zero and UI contract has actions", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedUiContract(root, {
        contractId: "CON-UI-0001",
        route: "/orders",
        elements: ["search_input", "orders_table"],
        actions: ["go_to_create"],
      });
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 2,
                actionsWired: 0,
              },
              mockPaths: [{ id: "mp_create_to_list", status: "pass" }],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const mismatchIssue = issues.find(
        (item) => item.code === "QFAI-PROT-232",
      );

      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.severity).toBe("error");
      expect(mismatchIssue?.refs).toContain("required_actions=go_to_create");
      expect(mismatchIssue?.refs).toContain(
        "required_actions_by_contract_route=CON-UI-0001|/orders:go_to_create",
      );
    });
  });

  it("keeps contract-route pairing refs when multiple screens mismatch", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const uiRoot = path.join(root, ".qfai", "contracts", "ui");
      await mkdir(uiRoot, { recursive: true });
      await writeFile(
        path.join(uiRoot, "ui-contract.orders.yaml"),
        [
          "# QFAI-CONTRACT-ID: CON-UI-0001",
          "screens:",
          "  - id: orders_screen",
          "    route: /orders",
          "    elements:",
          "      - id: search_input",
          "        label: search_input",
          "      - id: orders_table",
          "        label: orders_table",
          "    actions:",
          "      - id: go_to_create",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(uiRoot, "ui-contract.users.yaml"),
        [
          "# QFAI-CONTRACT-ID: CON-UI-0002",
          "screens:",
          "  - id: users_screen",
          "    route: /users",
          "    elements:",
          "      - id: users_table",
          "        label: users_table",
          "    actions:",
          "      - id: go_to_invite",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [
            { route: "/orders", status: 200 },
            { route: "/users", status: 200 },
          ],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 1,
                actionsWired: 0,
              },
              mockPaths: [{ id: "mp_orders", status: "pass" }],
            },
            {
              route: "/users",
              uiContractId: "CON-UI-0002",
              expected: { elements: 1, actions: 1 },
              observed: {
                elementsPlaced: 0,
                actionsWired: 0,
              },
              mockPaths: [{ id: "mp_users", status: "pass" }],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const mismatchIssue = issues.find(
        (item) => item.code === "QFAI-PROT-232",
      );

      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.refs).toContain(
        "contract_route=CON-UI-0001|/orders",
      );
      expect(mismatchIssue?.refs).toContain(
        "contract_route=CON-UI-0002|/users",
      );
      expect(mismatchIssue?.refs).toContain(
        "missing_labels_by_contract_route=CON-UI-0001|/orders:orders_table|search_input",
      );
      expect(mismatchIssue?.refs).toContain(
        "contract_element_labels_by_contract_route=CON-UI-0001|/orders:orders_table|search_input",
      );
      expect(mismatchIssue?.refs).toContain(
        "required_actions_by_contract_route=CON-UI-0002|/users:go_to_invite",
      );
    });
  });

  it("warns when interactive uiFidelity has no mockPaths pass", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedUiContract(root, {
        contractId: "CON-UI-0001",
        route: "/orders",
        elements: ["search_input", "orders_table"],
        actions: ["go_to_create"],
      });
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 2,
                actionsWired: 1,
              },
              mockPaths: [],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const warnIssue = issues.find((item) => item.code === "QFAI-PROT-233");

      expect(warnIssue).toBeDefined();
      expect(warnIssue?.severity).toBe("warning");
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
      await seedUiContract(root, {
        contractId: "CON-UI-0001",
        route: "/orders",
        elements: ["search_input", "orders_table"],
        actions: ["go_to_create"],
      });
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
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 2,
                actionsWired: 1,
              },
              mockPaths: [{ id: "mp_create_to_list", status: "pass" }],
            },
          ],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("passes when uiFidelity satisfies referenced UI contract", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedUiContract(root, {
        contractId: "CON-UI-0001",
        route: "/orders",
        elements: ["search_input", "orders_table"],
        actions: ["go_to_create"],
      });
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 2, actions: 1 },
              observed: {
                elementsPlaced: 2,
                actionsWired: 1,
                markersEmitted: 2,
              },
              mockPaths: [
                {
                  id: "mp_create_to_list",
                  status: "pass",
                  notes: "create -> list reflects",
                },
              ],
              placeholders: { hasPlaceholderText: false, notes: "" },
            },
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

async function seedUiContract(
  root: string,
  payload: {
    contractId: string;
    route: string;
    elements: string[];
    actions: string[];
  },
): Promise<void> {
  const uiRoot = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiRoot, { recursive: true });
  const elementsBlock = payload.elements
    .map((id) => `      - id: ${id}\n        label: ${id}`)
    .join("\n");
  const actionsBlock = payload.actions
    .map((id) => `      - id: ${id}`)
    .join("\n");
  await writeFile(
    path.join(uiRoot, "ui-contract.sample.yaml"),
    [
      `# QFAI-CONTRACT-ID: ${payload.contractId}`,
      "screens:",
      "  - id: orders_screen",
      `    route: ${payload.route}`,
      "    elements:",
      elementsBlock,
      "    actions:",
      actionsBlock,
      "",
    ].join("\n"),
    "utf-8",
  );
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
  uiFidelity?: Record<string, unknown>;
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
        ...(payload.uiFidelity ? { uiFidelity: payload.uiFidelity } : {}),
        meta: {
          generatedAt: "2026-02-23T00:00:00.000Z",
          toolVersion: "1.4.36",
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
