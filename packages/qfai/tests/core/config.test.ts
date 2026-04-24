import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";

describe("baseBranch config", () => {
  it("loads baseBranch from config YAML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "baseBranch: origin/develop\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.baseBranch).toBe("origin/develop");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("defaults to undefined when baseBranch absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "{}\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.baseBranch).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for non-string baseBranch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "baseBranch: 123\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI_CONFIG_INVALID");
      expect(issues[0]?.message).toContain("baseBranch");
      expect(config.baseBranch).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("prototyping calibration config", () => {
  it("loads prototyping.calibration from config YAML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "prototyping:",
          "  calibration:",
          "    packPath: .qfai/evidence/custom-calibration.yaml",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping?.calibration).toEqual({
        packPath: ".qfai/evidence/custom-calibration.yaml",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for obsolete thresholds block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  calibration:", "    thresholds:", "      accept: 1.5", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(
        issues.some((issue) => issue.message.includes("prototyping.calibration.thresholds")),
      ).toBe(true);
      expect(config.prototyping?.calibration).toEqual({
        packPath: ".qfai/evidence/calibration.yaml",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for obsolete scalar calibration fields", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  calibration:", "    maxIterations: 7", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(
        issues.some((issue) => issue.message.includes("prototyping.calibration.maxIterations")),
      ).toBe(true);
      expect(config.prototyping?.calibration).toEqual({
        packPath: ".qfai/evidence/calibration.yaml",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("spec-0017 prototyping.execution config", () => {
  // TC-0017-0002 — legacy browserProvider key rejected
  it("reports issue when legacy browserProvider key is present (REQ-0008)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-browser-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    browserProvider: playwright", ""].join("\n"),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      const legacy = issues.find((issue) =>
        issue.message.includes("prototyping.execution.browserProvider"),
      );
      expect(legacy, "expected legacy browserProvider rejection").toBeDefined();
      expect(legacy?.message).toContain("spec-0017");
      expect(legacy?.message).toContain("playwright-cli");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0017-0003 — legacy renderProvider key rejected
  it("reports issue when legacy renderProvider key is present (REQ-0008)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-render-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    renderProvider: playwright", ""].join("\n"),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      const legacy = issues.find((issue) =>
        issue.message.includes("prototyping.execution.renderProvider"),
      );
      expect(legacy, "expected legacy renderProvider rejection").toBeDefined();
      expect(legacy?.message).toContain("browserTool");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0017-0004 — browserTool: playwright-cli accepted
  it("accepts browserTool: playwright-cli without issues (REQ-0002)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-browsertool-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    browserTool: playwright-cli", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping?.execution?.browserTool).toBe("playwright-cli");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects browserTool values other than playwright-cli (REQ-0002)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-browsertool-invalid-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    browserTool: playwright-mcp", ""].join("\n"),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      const invalid = issues.find((issue) =>
        issue.message.includes("prototyping.execution.browserTool"),
      );
      expect(invalid, "expected invalid browserTool rejection").toBeDefined();
      expect(invalid?.message).toContain("playwright-cli");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("defaults browserTool to playwright-cli when execution section is empty", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-default-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    targetUrl: http://localhost:5173", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping?.execution?.browserTool).toBe("playwright-cli");
      expect(config.prototyping?.execution?.targetUrl).toBe("http://localhost:5173");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
