import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { SUNSETS } from "../../src/core/sunset.js";

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

describe("spec-0012 prototyping.execution config", () => {
  // spec-0012 — legacy browserProvider key rejected
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
      // Canonical default = "playwright" primary (REQ-0012-0060 / spec-0006
      // D-DEPRECATED-PROBE). "playwright-cli" is the deprecation window.
      // Match the replacement guidance literally — the regex ensures
      // "playwright" is NOT followed by "-cli", which catches both the
      // original drift AND any future regression back to "playwright-cli"
      // as the canonical replacement target.
      expect(legacy?.message).toMatch(/browserTool:\s*playwright(?!-cli)/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // spec-0012 — legacy renderProvider key rejected
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

  // spec-0012 — browserTool: playwright-cli accepted
  it("rejects browserTool: playwright-cli past its sunset (REQ-0002)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-browsertool-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    browserTool: playwright-cli", ""].join("\n"),
        "utf-8",
      );

      // The deprecation window closed at `SUNSETS.playwrightCli`, which the
      // shipped version is now past. `browserTool` falls back to the supported
      // default rather than carrying a value the launcher no longer accepts.
      const { config, issues } = await loadConfig(root);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("playwright-cli");
      expect(issues[0]?.message).toContain(SUNSETS.playwrightCli);
      expect(config.prototyping?.execution?.browserTool).toBe("playwright");
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

  it("defaults browserTool to playwright when execution section is empty", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-default-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    targetUrl: http://localhost:5173", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      // Canonical default = "playwright" primary (REQ-0012-0060). Use an
      // exact equality check (not a substring match) to catch both the
      // original drift AND any future regression to "playwright-cli" —
      // the latter would still substring-match "playwright" but is not
      // the canonical default.
      expect(config.prototyping?.execution?.browserTool).toBe("playwright");
      expect(config.prototyping?.execution?.targetUrl).toBe("http://localhost:5173");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("spec-0004 testStrategy.forbidTestTodoStubs", () => {
  // spec-0004 — default forbidTestTodoStubs is true
  it("defaults to true when not specified (REQ-0009)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-todo-default-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "{}\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.validation.testStrategy.forbidTestTodoStubs).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("honors explicit forbidTestTodoStubs: false opt-out", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-todo-optout-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["validation:", "  testStrategy:", "    forbidTestTodoStubs: false", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.validation.testStrategy.forbidTestTodoStubs).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects non-boolean forbidTestTodoStubs value", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-todo-invalid-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["validation:", "  testStrategy:", '    forbidTestTodoStubs: "nope"', ""].join("\n"),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      const invalid = issues.find((issue) =>
        issue.message.includes("validation.testStrategy.forbidTestTodoStubs"),
      );
      expect(invalid, "expected invalid type rejection").toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("uiux.competitive_refs_min", () => {
  async function loadWith(value: string): Promise<Awaited<ReturnType<typeof loadConfig>>> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-competitive-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        `uiux:\n  competitive_refs_min: ${value}\n`,
        "utf-8",
      );
      return await loadConfig(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("accepts a non-negative integer", async () => {
    for (const value of ["0", "3", "10"]) {
      const { config, issues } = await loadWith(value);
      expect(issues).toEqual([]);
      expect(config.uiux?.competitive_refs_min).toBe(Number(value));
    }
  });

  it("rejects a fractional bound instead of silently rounding it up", async () => {
    // A count of references is discrete. `2.5` reached the comparison, which
    // effectively demanded three while the finding still said "at least 2.5".
    const { config, issues } = await loadWith("2.5");
    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("uiux.competitive_refs_min は0以上の整数である必要があります。"),
    ]);
    expect(config.uiux?.competitive_refs_min).toBeUndefined();
  });

  it("still rejects a negative bound", async () => {
    const { config, issues } = await loadWith("-1");
    expect(issues).toHaveLength(1);
    expect(config.uiux?.competitive_refs_min).toBeUndefined();
  });
});
