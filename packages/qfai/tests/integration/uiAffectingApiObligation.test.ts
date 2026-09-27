/**
 * The UI-affecting check reads an API obligation from the API contract that
 * declares it, over a project tree with UI and API contracts on disk.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { UiAffectingClauses } from "../../src/core/uiAffectingClauses.js";

const CONTRACTS = ".qfai/spec/03_contract";
const RETIRED = ["CON", "API", "0001"].join("-");

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function project(files: Readonly<Record<string, string>>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-api-obligation-"));
  for (const [relative, body] of Object.entries(files)) {
    const file = path.join(dir, ...relative.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf-8");
  }
  return dir;
}

describe("an API obligation linked to a UI contract", () => {
  // QFAI:AC-0001-0078-06
  it("is read from the declaring API contract, and a retired value has no entry", async () => {
    root = await project({
      "qfai.config.yaml": "uiux:\n  surfacePaths: []\n",
      [`${CONTRACTS}/ui/ui-0001-home.yaml`]: [
        "# QFAI-CONTRACT-ID: UI-0001",
        "screens:",
        "  - id: home",
        "    route: /",
        "    elements:",
        "      - id: checkout-button",
        "",
      ].join("\n"),
      [`${CONTRACTS}/api/api-0002-orders.yaml`]: [
        "# QFAI-CONTRACT-ID: API-0002",
        "x-qfai-depends-on: []",
        "info:",
        "  description: submitted by checkout-button",
        "",
      ].join("\n"),
      [`${CONTRACTS}/api/api-0003-refunds.yaml`]: [
        "# QFAI-CONTRACT-ID: API-0003",
        "x-qfai-depends-on: [API-0002]",
        "info:",
        "  description: refunds",
        "",
      ].join("\n"),
      [`${CONTRACTS}/api/orders.yaml`]: [
        `# QFAI-CONTRACT-ID: ${RETIRED}`,
        "info:",
        "  description: submitted by checkout-button",
        "",
      ].join("\n"),
    });
    const clauses = new UiAffectingClauses(root, CONTRACTS, {
      testCases: path.join(root, "absent.md"),
      userStories: path.join(root, "absent.md"),
    });
    const row = { owningModule: "-", testFile: "tests/api/orders.test.ts" };

    expect(await clauses.firstHolding({ ...row, obligations: ["API-0002"] })).toEqual({
      clause: 3,
      because: `checkout-button from ${CONTRACTS}/ui/ui-0001-home.yaml occurs in the entry for API-0002 in ${CONTRACTS}/api/api-0002-orders.yaml`,
    });
    expect(await clauses.firstHolding({ ...row, obligations: ["API-0003"] })).toBeNull();
    expect(await clauses.firstHolding({ ...row, obligations: [RETIRED] })).toBeNull();
  });
});
