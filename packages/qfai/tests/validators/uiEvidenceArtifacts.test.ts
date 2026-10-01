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
  const contractsDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
  await mkdir(contractsDir, { recursive: true });
  await writeFile(
    path.join(contractsDir, "ui-0001-orders.yaml"),
    [
      "# QFAI-CONTRACT-ID: UI-0001",
      "screens:",
      "  - id: orders-dashboard",
      "    title: Orders Dashboard",
      "    route: /orders",
      "    primary_tasks:",
      "      - { id: view_orders, label: View latest orders, acceptance: done }",
    ].join("\n"),
    "utf-8",
  );
}

describe("validateUiEvidenceArtifacts", () => {
  it("returns errors for both when a declared screen has no screenshot and no HTML", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues.map((issue) => issue.code).sort()).toEqual(["QFAI-UIE-001", "QFAI-UIE-002"]);
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  // QFAI:EX-0001-0157-03
  it("does not accept the aggregate handoff copies as evidence", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const screenshotDir = path.join(root, ".qfai", "evidence", "prototyping", "screenshots");
    const htmlDir = path.join(root, ".qfai", "evidence", "prototyping", "html");
    await mkdir(screenshotDir, { recursive: true });
    await mkdir(htmlDir, { recursive: true });
    await writeFile(path.join(screenshotDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(htmlDir, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues.map((found) => found.code).sort()).toEqual(["QFAI-UIE-001", "QFAI-UIE-002"]);
    const screenshot = issues.find((found) => found.code === "QFAI-UIE-001");
    const html = issues.find((found) => found.code === "QFAI-UIE-002");
    expect(screenshot?.file).toBe(".qfai/evidence/prototyping/iter-NN/orders-dashboard.png");
    expect(screenshot?.suggested_action).toContain(
      ".qfai/evidence/prototyping/iter-NN/<screen-id>.png",
    );
    expect(screenshot?.suggested_action).not.toContain("screenshots/");
    expect(html?.file).toBe(".qfai/evidence/prototyping/iter-NN/orders-dashboard.html");
    expect(html?.suggested_action).toContain(
      ".qfai/evidence/prototyping/iter-NN/<screen-id>.html",
    );
    expect(html?.suggested_action).not.toContain("html/<screen-id>");
  });

  // QFAI:EX-0001-0157-04
  it("does not accept a copy in an iter-NN directory nested below the root", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const nested = path.join(root, ".qfai", "evidence", "prototyping", "archive", "iter-03");
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(nested, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues.map((found) => found.code).sort()).toEqual(["QFAI-UIE-001", "QFAI-UIE-002"]);
  });

  // QFAI:EX-0001-0157-02
  it("returns no issue when the v2 screenshot and HTML under iter-NN are both present", async () => {
    const root = await newTempRoot();
    await seedUiContracts(root);

    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-03");
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  // QFAI:EX-0001-0040-03
  it("skips the check when contracts/ui is absent", async () => {
    const root = await newTempRoot();

    const issues = await validateUiEvidenceArtifacts(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("reads the evidence directory derived from a custom contractsDir", async () => {
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

    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-01");
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "orders-dashboard.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "orders-dashboard.html"), "<html></html>", "utf-8");

    const issues = await validateUiEvidenceArtifacts(root, config);

    expect(issues).toEqual([]);
  });

  it("returns an error instead of using a dangerous screenId as an evidence filename", async () => {
    const root = await newTempRoot();
    const contractsDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
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
    expect(issues[0]?.file).toContain(".qfai/spec/03_contract/ui/ui-0001-orders.yaml#../escape");
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
    const contractsDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
    await mkdir(contractsDir, { recursive: true });
    await writeFile(
      path.join(contractsDir, "ui-0001-orders.yaml"),
      ["screens:", "  - id: orders-dashboard", '    route: "/orders"'].join("\n"),
      "utf-8",
    );
    const written = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(path.join(written, "iter-01"), { recursive: true });
    await writeFile(path.join(written, "iter-01", "orders-dashboard.png"), "png", "utf-8");
    await writeFile(
      path.join(written, "iter-01", "orders-dashboard.html"),
      "<html></html>",
      "utf-8",
    );

    expect(await validateUiEvidenceArtifacts(root, config)).toEqual([]);

    // A copy beside the moved specs directory is not where iterate writes.
    const beside = await newTempRoot();
    await mkdir(path.join(beside, ".qfai", "spec", "03_contract", "ui"), { recursive: true });
    await writeFile(
      path.join(beside, ".qfai", "spec", "03_contract", "ui", "ui-0001-orders.yaml"),
      ["screens:", "  - id: orders-dashboard", '    route: "/orders"'].join("\n"),
      "utf-8",
    );
    const elsewhere = path.join(beside, "workspace", "evidence", "prototyping");
    await mkdir(path.join(elsewhere, "iter-01"), { recursive: true });
    await writeFile(path.join(elsewhere, "iter-01", "orders-dashboard.png"), "png", "utf-8");
    const codes = (await validateUiEvidenceArtifacts(beside, config)).map((found) => found.code);
    expect(codes).toContain("QFAI-UIE-001");
  });

  it("points suggested_action at the actual evidence path even with a custom contractsDir", async () => {
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
