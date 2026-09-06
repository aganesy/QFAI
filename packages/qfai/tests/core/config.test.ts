import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadConfig, type QfaiValidationConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS, SUNSETS, newRuleSeverity } from "../../src/core/sunset.js";
import { resolveToolVersion } from "../../src/core/version.js";

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

describe("testStrategy key surface", () => {
  // Issue #408: `requireLayerTags` / `requireSizeTags` were declared, defaulted
  // and parsed here but read by nothing, so flipping either one changed no
  // outcome. They are off the shipped `qfai.config.yaml` and `evaluateStrategyTags`
  // is gone, but the keys survive on the public `QfaiValidationConfig` type as a
  // deprecated compat shim (same treatment as `paths.promptsDir`): a project
  // that still carries them must keep loading cleanly AND keep resolving the
  // value it set, not `undefined`.
  it("still resolves the deprecated requireLayerTags / requireSizeTags keys", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-retired-tags-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "validation:",
          "  testStrategy:",
          "    requireLayerTags: true",
          "    requireSizeTags: true",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(Object.keys(config.validation.testStrategy).sort()).toEqual([
        "forbidTestTodoStubs",
        "maxE2eScenarioCount",
        "maxE2eScenarioRatio",
        "requireLayerTags",
        "requireSizeTags",
      ]);
      expect(config.validation.testStrategy.requireLayerTags).toBe(true);
      expect(config.validation.testStrategy.requireSizeTags).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `QfaiValidationConfig` is re-exported from the package root, so a
  // TypeScript consumer that constructs one of these objects or reads either
  // key into a `boolean` must keep compiling until the next major. Both stay
  // required `boolean`, and an absent key still falls back to `false` rather
  // than to `undefined`.
  it("keeps the deprecated keys a required boolean on the public type", async () => {
    const legacy: QfaiValidationConfig["testStrategy"] = {
      maxE2eScenarioRatio: null,
      maxE2eScenarioCount: null,
      forbidTestTodoStubs: true,
      requireLayerTags: true,
      requireSizeTags: true,
    };
    const enabled: boolean = legacy.requireLayerTags;
    expect(enabled).toBe(true);

    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-legacy-type-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "{}\n", "utf-8");

      const { config } = await loadConfig(root);
      const resolved: boolean = config.validation.testStrategy.requireSizeTags;
      expect(resolved).toBe(false);
      expect(config.validation.testStrategy.requireLayerTags).toBe(false);
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

describe("retired validation.traceability keys", () => {
  it("reports every retired key still present as deprecated and inert", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-retired-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "validation:",
          "  traceability:",
          "    brMustHaveSc: false",
          "    scNoTestSeverity: warning",
          "    orphanContractsPolicy: allow",
          "    scMustHaveTest: false",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);

      const deprecated = issues.filter((issue) => issue.code === "QFAI-CFG-001");
      // Severity is the central promotion pin's, not a literal: warning
      // inside the window, error from
      // `RULE_PROMOTIONS.retiredTraceabilityKeys.promoteAt`. P7 keys the
      // window on the finding code, and `QFAI-CFG-001` is new even
      // though the config shape it names is old.
      const { promoteAt } = RULE_PROMOTIONS.retiredTraceabilityKeys;
      const expected = newRuleSeverity(await resolveToolVersion(), promoteAt);
      expect(deprecated.map((issue) => issue.severity)).toEqual([expected, expected, expected]);
      for (const key of ["brMustHaveSc", "scNoTestSeverity", "orphanContractsPolicy"]) {
        expect(
          deprecated.some((issue) => issue.message.includes(`validation.traceability.${key}`)),
          `expected a deprecation warning naming ${key}`,
        ).toBe(true);
      }
      // The window's end is stated to the operator, not just enforced silently.
      expect(deprecated.every((issue) => issue.message.includes(promoteAt))).toBe(true);
      // The retired keys must not be rejected outright: an existing config still loads,
      // and the key that is actually wired keeps its effect.
      expect(issues.some((issue) => issue.code === "QFAI_CONFIG_INVALID")).toBe(false);
      expect(config.validation.traceability.scMustHaveTest).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the retired keys as deprecated optional types for existing consumers", async () => {
    // Dropping a key from the runtime config is safe (an old YAML still loads); dropping it
    // from the exported types is not — a consumer importing `OrphanContractsPolicy` or
    // building a `QfaiConfig` literal would stop compiling on upgrade. The compat surface
    // must outlive the runtime removal, so it is guarded here rather than left to review.
    const configSource = await readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/core/config.ts"),
      "utf-8",
    );

    expect(configSource).toMatch(/export type OrphanContractsPolicy =/);
    for (const declaration of [
      "brMustHaveSc?: boolean;",
      "scNoTestSeverity?: TraceabilitySeverity;",
      // The field points at the internal union, not the `@deprecated` public
      // alias: referencing the alias here is what forced an
      // `eslint-disable-next-line @typescript-eslint/no-deprecated`.
      "orphanContractsPolicy?: RetiredOrphanContractsPolicy;",
    ]) {
      expect(configSource, `expected a deprecated optional ${declaration}`).toContain(declaration);
    }
  });

  it("stays silent when no retired key is present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-retired-clean-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["validation:", "  traceability:", "    scMustHaveTest: true", ""].join("\n"),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
