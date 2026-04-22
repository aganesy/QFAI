import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateUiEvidenceArtifacts } from "../../src/core/validators/uiEvidenceArtifacts.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-evidence-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedUiContracts(root: string): Promise<void> {
  const contractsDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(contractsDir, { recursive: true });
  await writeFile(
    path.join(contractsDir, "ui-0001-orders.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: orders-dashboard",
      "    title: Orders Dashboard",
      "    route: /orders",
      "    primary_tasks:",
      "      - View latest orders",
    ].join("\n"),
    "utf-8",
  );
}

describe("validateUiEvidenceArtifacts", () => {
  it("declared screen に screenshot と HTML が無い場合は両方 error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues.map((issue) => issue.code).sort()).toEqual(["QFAI-UIE-001", "QFAI-UIE-002"]);
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  it("declared screen の screenshot と HTML が揃っていれば issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const screenshotDir = path.join(root, ".qfai", "evidence", "prototyping", "screenshots");
    const htmlDir = path.join(root, ".qfai", "evidence", "prototyping", "html");
    await mkdir(screenshotDir, { recursive: true });
    await mkdir(htmlDir, { recursive: true });
    await writeFile(path.join(screenshotDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(htmlDir, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("contracts/ui が無い場合はチェックをスキップする", async () => {
    const root = await newTempRoot();

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("custom contractsDir から導出した evidence 配下を参照する", async () => {
    const root = await newTempRoot();
    const config = {
      ...defaultConfig,
      paths: {
        ...defaultConfig.paths,
        contractsDir: "workspace/contracts",
      },
    };
    const contractsDir = path.join(root, "workspace", "contracts", "ui");
    await mkdir(contractsDir, { recursive: true });
    await writeFile(
      path.join(contractsDir, "ui-0001-orders.yaml"),
      [
        "screens:",
        "  - id: orders-dashboard",
        '    title: "Orders Dashboard"',
        '    route: "/orders"',
      ].join("\n"),
      "utf-8",
    );

    const screenshotDir = path.join(root, ".qfai", "evidence", "prototyping", "screenshots");
    const htmlDir = path.join(root, ".qfai", "evidence", "prototyping", "html");
    await mkdir(screenshotDir, { recursive: true });
    await mkdir(htmlDir, { recursive: true });
    await writeFile(path.join(screenshotDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(htmlDir, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, config);

    expect(issues).toEqual([]);
  });

  it("危険な screenId を evidence filename として使わず error を返す", async () => {
    const root = await newTempRoot();
    const contractsDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(contractsDir, { recursive: true });
    await writeFile(
      path.join(contractsDir, "ui-0001-orders.yaml"),
      [
        "screens:",
        "  - id: ../escape",
        '    title: "Orders Dashboard"',
        '    route: "/orders"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-UIE-003"]);
    expect(issues[0]?.file).toContain(".qfai/contracts/ui/ui-0001-orders.yaml#../escape");
  });
});
