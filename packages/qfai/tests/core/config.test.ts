import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_DIAGRAM_BUDGET,
  defaultConfig,
  loadConfig,
  readAcceptedDrift,
} from "../../src/core/config.js";

// QFAI:EX-0001-0038-05
describe("story-tree default paths", () => {
  it("resolves both omitted path keys to the story tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-story-paths-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  testsDir: checks\n", "utf-8");
      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.paths.specsDir).toBe(".qfai/spec");
      expect(config.paths.contractsDir).toBe(".qfai/spec/03_contract");
      expect(config.paths.skillsDir).toBe(".qfai/assistant/skill");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("uiux.surfacePaths", () => {
  async function surfacePathsOf(configBody: string) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-surface-paths-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), configBody, "utf-8");
      const { config, issues } = await loadConfig(root);
      return { surfacePaths: config.uiux?.surfacePaths, issues };
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  // QFAI:EX-0001-0076-05
  it("reads a list of globs, an empty list, and an absent key apart", async () => {
    const listed = await surfacePathsOf(
      "uiux:\n  surfacePaths:\n    - src/ui/**\n    - tests/e2e/**\n",
    );
    expect(listed).toEqual({ surfacePaths: ["src/ui/**", "tests/e2e/**"], issues: [] });
    expect(await surfacePathsOf("uiux:\n  surfacePaths: []\n")).toEqual({
      surfacePaths: [],
      issues: [],
    });
    expect(await surfacePathsOf("paths:\n  specsDir: .qfai/spec\n")).toEqual({
      surfacePaths: undefined,
      issues: [],
    });
  });

  // QFAI:EX-0001-0076-06
  it("reports a value that is not a list of globs and declares nothing", async () => {
    const { surfacePaths, issues } = await surfacePathsOf("uiux:\n  surfacePaths: src/ui/**\n");
    expect(issues.map((entry) => entry.message)).toContain(
      "uiux.surfacePaths must be a list of non-empty glob strings.",
    );
    expect(surfacePaths).toBeUndefined();
  });
});

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
      expect(issues[0]?.code).toBe("QFAI-CFG-002");
      expect(issues[0]?.message).toContain("baseBranch");
      expect(config.baseBranch).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("spec-0012 prototyping.execution config", () => {
  it("rejects a browserTool other than playwright", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-browsertool-invalid-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  execution:", "    browserTool: playwright-mcp", ""].join("\n"),
        "utf-8",
      );

      // `browserTool` falls back to the supported default.
      const { config, issues } = await loadConfig(root);
      const invalid = issues.find((issue) =>
        issue.message.includes("prototyping.execution.browserTool"),
      );
      expect(invalid, "expected invalid browserTool rejection").toBeDefined();
      expect(invalid?.message).toContain('must be "playwright"');
      expect(config.prototyping?.execution?.browserTool).toBe("playwright");
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
      // Use an exact equality check, not a substring match.
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

describe("uiux.registries", () => {
  async function loadWith(body: string): Promise<Awaited<ReturnType<typeof loadConfig>>> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-registries-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), body, "utf-8");
      return await loadConfig(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("accepts the map shape a components.json already carries", async () => {
    const { config, issues } = await loadWith(
      'uiux:\n  registries:\n    "@acme": https://acme.example/r/{name}.json\n    "@internal": https://internal.example/{name}\n',
    );
    expect(issues).toEqual([]);
    expect(config.uiux?.registries).toEqual({
      "@acme": "https://acme.example/r/{name}.json",
      "@internal": "https://internal.example/{name}",
    });
  });

  it("rejects a template with no place to put the component name", async () => {
    // Such a URL resolves nothing, so accepting it would leave a registry
    // that is declared, looks configured, and can never answer.
    const { config, issues } = await loadWith(
      'uiux:\n  registries:\n    "@acme": https://acme.example/registry.json\n',
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("uiux.registries.@acme must contain the {name} placeholder"),
    ]);
    expect(config.uiux?.registries).toBeUndefined();
  });

  it("keeps the entries it can use when one is malformed", async () => {
    const { config, issues } = await loadWith(
      'uiux:\n  registries:\n    "@good": https://good.example/{name}.json\n    "@bad": ""\n',
    );
    expect(issues).toHaveLength(1);
    expect(config.uiux?.registries).toEqual({ "@good": "https://good.example/{name}.json" });
  });

  it("does not care about the scheme, because a private registry may be local", async () => {
    const { issues } = await loadWith(
      'uiux:\n  registries:\n    "@dev": http://localhost:4000/{name}.json\n',
    );
    expect(issues).toEqual([]);
  });
});

// QFAI:EX-0001-0297-19
describe("uiText.elements", () => {
  async function loadWith(body: string): Promise<Awaited<ReturnType<typeof loadConfig>>> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-ui-text-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), body, "utf-8");
      return await loadConfig(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("keeps each component mapped to an exempt element or role", async () => {
    const { config, issues } = await loadWith(
      "uiText:\n  elements:\n    TableHead: th\n    Card.Title: h3\n    nav-link: a\n    StatusRegion: status\n    Toast: alert\n",
    );
    expect(issues).toEqual([]);
    expect(config.uiText?.elements).toEqual({
      TableHead: "th",
      "Card.Title": "h3",
      "nav-link": "a",
      StatusRegion: "status",
      Toast: "alert",
    });
  });

  it("reports an unknown value and a malformed key, and keeps the other entries", async () => {
    const { config, issues } = await loadWith(
      'uiText:\n  elements:\n    TableHead: th\n    Panel: div\n    div: status\n    "Bad Name": h2\n    Count: 3\n',
    );
    expect(issues.map((found) => [found.code, found.message])).toEqual([
      ["QFAI-CFG-002", expect.stringContaining("uiText.elements.Panel must be one of h1|")],
      [
        "QFAI-CFG-002",
        expect.stringContaining('uiText.elements key "div" is not a component name'),
      ],
      [
        "QFAI-CFG-002",
        expect.stringContaining('uiText.elements key "Bad Name" is not a component name'),
      ],
      ["QFAI-CFG-002", expect.stringContaining("uiText.elements.Count must be one of")],
    ]);
    expect(config.uiText?.elements).toEqual({ TableHead: "th" });
  });

  it("reports a section or a map that is not a mapping, and an unknown key", async () => {
    const notMap = await loadWith("uiText:\n  elements: [TableHead]\n");
    expect(notMap.issues.map((found) => found.message)).toEqual([
      "uiText.elements must be an object.",
    ]);
    expect(notMap.config.uiText).toBeUndefined();
    const notSection = await loadWith("uiText: th\n");
    expect(notSection.issues.map((found) => found.message)).toEqual(["uiText must be an object."]);
    const unknown = await loadWith("uiText:\n  components:\n    TableHead: th\n");
    expect(unknown.issues.map((found) => found.message)).toEqual([
      "uiText.components is not a setting.",
    ]);
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
          "    scMustHaveTest: false",
          "    unknownContractIdSeverity: warning",
          "    testFileGlobs: [tests/**/*.test.ts]",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);

      const deprecated = issues.filter((issue) => issue.code === "QFAI-CFG-001");
      const expected = "error";
      expect(deprecated.map((issue) => issue.severity)).toEqual([expected, expected]);
      for (const key of ["scMustHaveTest", "unknownContractIdSeverity"]) {
        expect(
          deprecated.some((issue) => issue.message.includes(`validation.traceability.${key}`)),
          `expected a deprecation warning naming ${key}`,
        ).toBe(true);
      }
      // The retired keys must not be rejected outright: an existing config still loads,
      // and the key that is actually wired keeps its effect.
      expect(issues.some((issue) => issue.code === "QFAI-CFG-002")).toBe(false);
      expect(config.validation.traceability.testFileGlobs).toEqual(["tests/**/*.test.ts"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stays silent when no retired key is present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-retired-clean-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["validation:", "  traceability:", "    testFileGlobs: [tests/**/*.test.ts]", ""].join(
          "\n",
        ),
        "utf-8",
      );

      const { issues } = await loadConfig(root);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

const DIGEST = `sha256:${"0123456789abcdef".repeat(4)}`;

describe("workflow.acceptedDrift", () => {
  // QFAI:EX-0003-0011-33
  it("reads each listed shipped workflow with its digest and reason, and an absent key as none", () => {
    expect(readAcceptedDrift({})).toEqual(new Map());
    expect(readAcceptedDrift({ workflow: { acceptedDrift: [] } })).toEqual(new Map());
    expect(
      readAcceptedDrift({
        workflow: {
          acceptedDrift: [{ file: "qfai-docs.yml", digest: DIGEST, reason: " Our own lane. " }],
        },
      }),
    ).toEqual(new Map([["qfai-docs.yml", { digest: DIGEST, reason: "Our own lane." }]]));
  });

  // QFAI:EX-0003-0011-34
  it("reads a value with a missing or malformed digest, a missing or empty reason, an unknown file or a repeated file as invalid", () => {
    for (const acceptedDrift of [
      "qfai-docs.yml",
      ["qfai-docs.yml"],
      [{ file: "qfai-docs.yml", digest: DIGEST }],
      [{ file: "qfai-docs.yml", digest: DIGEST, reason: "" }],
      [{ file: "qfai-docs.yml", digest: DIGEST, reason: "   " }],
      [{ file: "qfai-docs.yml", digest: DIGEST, reason: 1 }],
      [{ file: "qfai-docs.yml", reason: "Ours." }],
      [{ file: "qfai-docs.yml", digest: DIGEST.slice(0, -1), reason: "Ours." }],
      [{ file: "qfai-docs.yml", digest: DIGEST.replace("sha256:", ""), reason: "Ours." }],
      [{ file: "qfai-docs.yml", digest: DIGEST.toUpperCase(), reason: "Ours." }],
      [{ file: "qfai-docs.yml", digest: 1, reason: "Ours." }],
      [{ file: "qfai-orphan.yml", digest: DIGEST, reason: "Ours." }],
      [
        { file: "qfai-docs.yml", digest: DIGEST, reason: "Ours." },
        { file: "qfai-docs.yml", digest: DIGEST, reason: "Again." },
      ],
    ]) {
      expect(
        readAcceptedDrift({ workflow: { acceptedDrift } }),
        JSON.stringify(acceptedDrift),
      ).toBeNull();
    }
  });

  // QFAI:EX-0003-0011-34
  it("raises one config issue for an entry without a digest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-accepted-drift-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "workflow:\n  acceptedDrift:\n    - file: qfai-docs.yml\n      reason: Ours.\n",
        "utf-8",
      );
      const { issues } = await loadConfig(root);
      const named = issues.filter((issue) => issue.message.includes("workflow.acceptedDrift"));
      expect(named).toHaveLength(1);
      expect(named[0]?.code).toBe("QFAI-CFG-002");
      expect(named[0]?.severity).toBe("error");
      expect(named[0]?.message).toContain("sha256:");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("independent configuration per load", () => {
  async function loadChangeAndReload(configBody: string | null) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-fresh-"));
    try {
      if (configBody !== null) {
        await writeFile(path.join(root, "qfai.config.yaml"), configBody, "utf-8");
      }
      const first = await loadConfig(root);
      first.config.paths.specsDir = "changed";
      first.config.validation.traceability.testFileGlobs.push("changed/**");
      const second = await loadConfig(root);
      return second.config;
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it.each([
    ["no configuration file", null],
    ["a file that sets no path or validation key", "baseBranch: main\n"],
    ["a file that is not an object", "- item\n"],
  ])("leaves a later load untouched by changes to an earlier one, with %s", async (_, body) => {
    const config = await loadChangeAndReload(body);
    expect(config.paths.specsDir).toBe(".qfai/spec");
    expect(config.validation.traceability.testFileGlobs).toEqual([]);
    expect(defaultConfig.paths.specsDir).toBe(".qfai/spec");
    expect(defaultConfig.validation.traceability.testFileGlobs).toEqual([]);
  });

  it("keeps the canonical defaults immutable", () => {
    expect(Object.isFrozen(defaultConfig.paths)).toBe(true);
    expect(Object.isFrozen(defaultConfig.validation.traceability.testFileGlobs)).toBe(true);
    expect(Object.isFrozen(DEFAULT_DIAGRAM_BUDGET)).toBe(true);
  });
});
