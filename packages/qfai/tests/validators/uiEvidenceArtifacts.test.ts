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

  it("iter-NN 配下の v2 screenshot と HTML が揃っていれば issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-03");
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "orders-dashboard.html"), "<html></html>", "utf-8");

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

  it("reads the evidence where iterate writes it when specsDir is moved", async () => {
    // Iterate writes the captures under `.qfai/evidence/prototyping` whatever
    // `specsDir` is, so a check reading beside the moved specs directory
    // reported every captured screen missing.
    const root = await newTempRoot();
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, specsDir: "workspace/specs" },
    };
    const contractsDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(contractsDir, { recursive: true });
    await writeFile(
      path.join(contractsDir, "ui-0001-orders.yaml"),
      ["screens:", "  - id: orders-dashboard", '    route: "/orders"'].join("\n"),
      "utf-8",
    );
    const written = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(path.join(written, "screenshots"), { recursive: true });
    await mkdir(path.join(written, "html"), { recursive: true });
    await writeFile(path.join(written, "screenshots", "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(written, "html", "orders-dashboard.html"), "<html></html>", "utf-8");

    expect(await validateUiEvidenceArtifacts(root, config)).toEqual([]);

    // A copy beside the moved specs directory is not where iterate writes.
    const beside = await newTempRoot();
    await mkdir(path.join(beside, ".qfai", "contracts", "ui"), { recursive: true });
    await writeFile(
      path.join(beside, ".qfai", "contracts", "ui", "ui-0001-orders.yaml"),
      ["screens:", "  - id: orders-dashboard", '    route: "/orders"'].join("\n"),
      "utf-8",
    );
    const elsewhere = path.join(beside, "workspace", "evidence", "prototyping");
    await mkdir(path.join(elsewhere, "screenshots"), { recursive: true });
    await writeFile(path.join(elsewhere, "screenshots", "orders-dashboard.png"), "png", "utf-8");
    const codes = (await validateUiEvidenceArtifacts(beside, config)).map((found) => found.code);
    expect(codes).toContain("QFAI-UIE-001");
  });

  it("custom contractsDir でも suggested_action は実際の evidence path を案内する", async () => {
    const root = await newTempRoot();
    const config = {
      ...defaultConfig,
      paths: {
        ...defaultConfig.paths,
        contractsDir: "workspace/contracts",
        specsDir: "workspace/specs",
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

    const issues = await validateUiEvidenceArtifacts(root, config);

    expect(issues.map((issue) => issue.code).sort()).toEqual(["QFAI-UIE-001", "QFAI-UIE-002"]);
    expect(issues[0]?.suggested_action).toContain(".qfai/evidence/prototyping/");
    expect(issues[0]?.suggested_action).not.toContain("workspace/evidence");
    expect(issues[0]?.suggested_action).toContain("workspace/contracts/ui/*.yaml");
    expect(issues[1]?.suggested_action).toContain(".qfai/evidence/prototyping/");
    expect(issues[1]?.suggested_action).toContain("workspace/contracts/ui/*.yaml");
  });
});
