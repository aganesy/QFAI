// QFAI:SPEC-0018 — Codex Sub-Agent TOML Support Tests
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseTOML } from "smol-toml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CODEX_DIR = join(REPO_ROOT, ".codex");
const AGENTS_DIR = join(CODEX_DIR, "agents");
const CONFIG_PATH = join(CODEX_DIR, "config.toml");
const CANONICAL_DIR = join(REPO_ROOT, ".qfai", "assistant", "agents");

const REVIEW_AGENTS = [
  "architect-reviewer",
  "backend-reviewer",
  "code-reviewer",
  "design-owner",
  "design-review-lead",
  "facilitator",
  "frontend-reviewer",
  "interviewer",
  "option-explorer",
  "option-reviewer",
  "oq-harvester",
  "oq-reviewer",
  "project-lead",
  "prototyping-coverage-auditor",
  "qa-engineer",
  "qa-gatekeeper",
  "qa-lead",
  "qa-reviewer",
  "requirements-analyst",
  "researcher",
  "reviewer",
  "runtime-gatekeeper",
  "test-volume-estimator",
  "ui-ux-reviewer",
  "unit-test-scope-enforcer",
] as const;

const IMPL_AGENTS = [
  "architect",
  "atdd-api-implementer",
  "atdd-e2e-implementer",
  "atdd-integration-implementer",
  "backend-engineer",
  "contract-designer",
  "coverage-planner",
  "devops-ci-engineer",
  "doc-steward",
  "frontend-engineer",
  "orchestrator",
  "planner",
  "test-case-owner",
  "test-engineer",
] as const;

const EXCLUDED_AGENTS = [
  "design-expert",
  "integrated-uiux-reviewer",
  "navigation-expert",
  "screen-transition-expert",
  "uiux-expert",
] as const;

const ALL_AGENTS = [...REVIEW_AGENTS, ...IMPL_AGENTS];

function loadTomlFile(filePath: string): Record<string, unknown> {
  return parseTOML(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function loadAllAgents(): { name: string; data: Record<string, unknown> }[] {
  return readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".toml"))
    .map((f) => ({
      name: f.replace(/\.toml$/, ""),
      data: loadTomlFile(join(AGENTS_DIR, f)),
    }));
}

// QFAI:SPEC-0018:TC-0018-0006
describe("TC-0018-0006: config.toml 存在・妥当性", () => {
  it("config.toml が存在し TOML としてパースできる", () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
    const config = loadTomlFile(CONFIG_PATH);
    expect(config).toBeDefined();
  });

  it("[agents] セクションが存在し max_threads=1, max_depth=1 を含む", () => {
    const config = loadTomlFile(CONFIG_PATH);
    const agents = config["agents"] as Record<string, unknown>;
    expect(agents).toBeDefined();
    expect(agents["max_threads"]).toBe(1);
    expect(agents["max_depth"]).toBe(1);
  });
});

// QFAI:SPEC-0018:TC-0018-0001
describe("TC-0018-0001: 39 TOML ファイル存在確認", () => {
  it(".codex/agents/ に TOML ファイルが 39 個存在する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    expect(files).toHaveLength(39);
  });

  it("全 39 エージェント名に対応する TOML ファイルが存在する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    for (const name of ALL_AGENTS) {
      expect(files).toContain(`${name}.toml`);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0002
describe("TC-0018-0002: TOML 必須フィールド検証", () => {
  it("全 39 ファイルが name, description, developer_instructions を持つ", () => {
    const agents = loadAllAgents();
    expect(agents).toHaveLength(39);
    for (const { name, data } of agents) {
      expect(data["name"], `${name}: name missing`).toBeDefined();
      expect(typeof data["name"], `${name}: name not string`).toBe("string");
      expect((data["name"] as string).length, `${name}: name empty`).toBeGreaterThan(0);

      expect(data["description"], `${name}: description missing`).toBeDefined();
      expect(typeof data["description"], `${name}: description not string`).toBe("string");
      expect((data["description"] as string).length, `${name}: description empty`).toBeGreaterThan(
        0,
      );

      expect(
        data["developer_instructions"],
        `${name}: developer_instructions missing`,
      ).toBeDefined();
      expect(
        typeof data["developer_instructions"],
        `${name}: developer_instructions not string`,
      ).toBe("string");
      expect(
        (data["developer_instructions"] as string).length,
        `${name}: developer_instructions empty`,
      ).toBeGreaterThan(0);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0009
describe("TC-0018-0009: name フィールドとファイル名の一致", () => {
  it("各 TOML の name フィールドがファイル名（拡張子なし）と一致する", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect(data["name"], `${name}.toml: name mismatch`).toBe(name);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0004
describe("TC-0018-0004: レビュー系 sandbox_mode = read-only", () => {
  it("25 レビュー系エージェントすべてが sandbox_mode = read-only を持つ", () => {
    for (const name of REVIEW_AGENTS) {
      const data = loadTomlFile(join(AGENTS_DIR, `${name}.toml`));
      expect(data["sandbox_mode"], `${name}: sandbox_mode missing or wrong`).toBe("read-only");
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0005
describe("TC-0018-0005: 実装系 sandbox_mode 省略", () => {
  it("14 実装系エージェントすべてが sandbox_mode キーを持たない", () => {
    for (const name of IMPL_AGENTS) {
      const data = loadTomlFile(join(AGENTS_DIR, `${name}.toml`));
      expect("sandbox_mode" in data, `${name}: sandbox_mode should not exist`).toBe(false);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0003
describe("TC-0018-0003: developer_instructions 必須セクション含有", () => {
  // "Stop conditions" is the standard name; reviewer.md uses "Must-reject conditions"
  const STOP_VARIANTS = ["stop conditions", "must-reject conditions"];
  const REQUIRED_SECTIONS = [
    "Mission",
    "Inputs you must read",
    "Deliverables",
    "checklist",
    "Output format",
  ];

  it("全エージェントの developer_instructions が canonical MD の必須 6 セクションを含む", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      const instructions = (data["developer_instructions"] as string).toLowerCase();
      for (const section of REQUIRED_SECTIONS) {
        expect(
          instructions.includes(section.toLowerCase()),
          `${name}: missing section "${section}" in developer_instructions`,
        ).toBe(true);
      }
      expect(
        STOP_VARIANTS.some((v) => instructions.includes(v)),
        `${name}: missing "Stop conditions" or "Must-reject conditions"`,
      ).toBe(true);
    }
  });

  it("全エージェントの developer_instructions が canonical MD と実質一致する", () => {
    const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      const canonicalPath = join(CANONICAL_DIR, `${name}.md`);
      expect(existsSync(canonicalPath), `${name}: canonical MD not found`).toBe(true);
      const canonicalContent = readFileSync(canonicalPath, "utf-8");
      // Extract content from ## Mission onward (skip H1 title)
      const missionIdx = canonicalContent.indexOf("## Mission");
      expect(missionIdx, `${name}: canonical MD has no ## Mission`).toBeGreaterThanOrEqual(0);
      const canonicalBody = normalize(canonicalContent.slice(missionIdx));
      const instructions = normalize(data["developer_instructions"] as string);
      expect(instructions, `${name}: developer_instructions diverges from canonical MD`).toBe(
        canonicalBody,
      );
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0007
describe("TC-0018-0007: model フィールド不在確認", () => {
  it("全 39 ファイルに model キーが存在しない", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect("model" in data, `${name}: model should not exist`).toBe(false);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0008
describe("TC-0018-0008: nickname_candidates フィールド不在確認", () => {
  it("全 39 ファイルに nickname_candidates キーが存在しない", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect("nickname_candidates" in data, `${name}: nickname_candidates should not exist`).toBe(
        false,
      );
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0010
describe("TC-0018-0010: TOML 構文妥当性", () => {
  it("40 ファイル（39 agents + config.toml）すべてが TOML パースエラーなし", () => {
    // config.toml
    expect(() => loadTomlFile(CONFIG_PATH)).not.toThrow();

    // 39 agent files
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    for (const f of files) {
      expect(() => loadTomlFile(join(AGENTS_DIR, f)), `${f}: TOML parse error`).not.toThrow();
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0011
describe("TC-0018-0011: スコープ外エージェントの不在確認", () => {
  it("5 除外エージェントの TOML ファイルが存在しない", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    for (const name of EXCLUDED_AGENTS) {
      expect(files, `${name}.toml should not exist`).not.toContain(`${name}.toml`);
    }
  });
});

// QFAI:SPEC-0018:TC-0018-0012
describe("TC-0018-0012: ファイル名 kebab-case 検証", () => {
  it("全 TOML ファイル名が kebab-case パターンに一致する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    const kebabPattern = /^[a-z][a-z0-9-]*\.toml$/;
    for (const f of files) {
      expect(f, `${f}: not kebab-case`).toMatch(kebabPattern);
    }
  });
});
