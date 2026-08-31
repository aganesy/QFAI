// QFAI:SPEC-0003 — Codex Sub-Agent TOML Support Tests
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseTOML } from "smol-toml";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CODEX_DIR = join(REPO_ROOT, ".codex");
const AGENTS_DIR = join(CODEX_DIR, "agents");
const CONFIG_PATH = join(CODEX_DIR, "config.toml");
const CANONICAL_DIR = join(REPO_ROOT, ".qfai", "assistant", "agents");
const CATALOG_PATH = join(REPO_ROOT, ".qfai", "assistant", "manifest", "agent-catalog.yml");

type CatalogAgent = {
  id: string;
  kind: "worker" | "reviewer";
};

function loadCatalogAgents(): CatalogAgent[] {
  const parsed = parseYaml(readFileSync(CATALOG_PATH, "utf-8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("agent-catalog.yml must parse to an object");
  }
  const root = parsed as Record<string, unknown>;
  const agents = root["agents"];
  if (!Array.isArray(agents)) {
    throw new Error("agent-catalog.yml must contain agents array");
  }
  return agents.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`agent-catalog.yml agents[${index}] must be an object`);
    }
    const agent = entry as Record<string, unknown>;
    if (typeof agent["id"] !== "string") {
      throw new Error(`agent-catalog.yml agents[${index}].id must be string`);
    }
    if (agent["kind"] !== "worker" && agent["kind"] !== "reviewer") {
      throw new Error(`agent-catalog.yml agents[${index}].kind must be worker|reviewer`);
    }
    return {
      id: agent["id"],
      kind: agent["kind"],
    };
  });
}

const CATALOG_AGENTS = loadCatalogAgents();
const REVIEW_AGENTS = CATALOG_AGENTS.filter((agent) => agent.kind === "reviewer").map(
  (agent) => agent.id,
);
const IMPL_AGENTS = CATALOG_AGENTS.filter((agent) => agent.kind === "worker").map(
  (agent) => agent.id,
);
const ALL_AGENTS = CATALOG_AGENTS.map((agent) => agent.id);
const EXPECTED_AGENT_COUNT = ALL_AGENTS.length;

/**
 * The canonical agent body: the `## Mission` heading *line* onward, searched
 * past the frontmatter — the same rule `canonicalAgentBody`
 * (src/core/validators/agentDefinition.ts) and `scripts/gen-agent-catalog.mjs`
 * use. A plain `indexOf` matches the string anywhere, so a frontmatter
 * description that merely mentions `## Mission` would drag the frontmatter into
 * the expected body and fail these SSOT comparisons against a block the
 * generator produced correctly. Returns undefined when no such heading exists.
 */
function canonicalMissionBody(markdown: string): string | undefined {
  const content = markdown.replace(/\r\n/g, "\n");
  let offset = 0;
  if (content.startsWith("---\n")) {
    const close = content.indexOf("\n---", "---\n".length - 1);
    if (close >= 0) offset = close + 1;
  }
  const match = /^## Mission[ \t]*$/m.exec(content.slice(offset));
  return match === null ? undefined : content.slice(offset + match.index);
}

function loadTomlFile(filePath: string): Record<string, unknown> {
  const parsed = parseTOML(readFileSync(filePath, "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath}: expected TOML to parse as an object`);
  }
  return parsed as Record<string, unknown>;
}

function loadAllAgents(): { name: string; data: Record<string, unknown> }[] {
  return readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".toml"))
    .map((f) => ({
      name: f.replace(/\.toml$/, ""),
      data: loadTomlFile(join(AGENTS_DIR, f)),
    }));
}

function loadCanonicalFrontmatter(name: string): { name: string; description: string } {
  const canonicalPath = join(CANONICAL_DIR, `${name}.md`);
  const content = readFileSync(canonicalPath, "utf-8");
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatterMatch) {
    throw new Error(`${canonicalPath}: missing YAML frontmatter`);
  }

  const parsed = parseYaml(frontmatterMatch[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${canonicalPath}: frontmatter must parse to an object`);
  }

  const frontmatter = parsed as Record<string, unknown>;
  if (typeof frontmatter["name"] !== "string" || frontmatter["name"].trim().length === 0) {
    throw new Error(`${canonicalPath}: frontmatter.name must be a non-empty string`);
  }
  if (
    typeof frontmatter["description"] !== "string" ||
    frontmatter["description"].trim().length === 0
  ) {
    throw new Error(`${canonicalPath}: frontmatter.description must be a non-empty string`);
  }

  return {
    name: frontmatter["name"].trim(),
    description: frontmatter["description"].trim(),
  };
}

// QFAI:SPEC-0003:TC-0003-0006
describe("TC-0003-0006: config.toml 存在・妥当性", () => {
  it("config.toml が存在し TOML としてパースできる", () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
    const config = loadTomlFile(CONFIG_PATH);
    expect(config).toBeDefined();
  });

  it("[agents] セクションが存在し max_threads=1, max_depth=1 を含む", () => {
    const config = loadTomlFile(CONFIG_PATH);
    const agents = config["agents"];
    expect(
      typeof agents === "object" && agents !== null && !Array.isArray(agents),
      "[agents] section must be a non-null, non-array object",
    ).toBe(true);
    const agentsObj = agents as Record<string, unknown>;
    expect(agentsObj["max_threads"]).toBe(20);
    expect(agentsObj["max_depth"]).toBe(1);
  });
});

// QFAI:SPEC-0003:TC-0003-0001
describe("TC-0003-0001: TOML ファイル存在確認", () => {
  it(".codex/agents/ に agent-catalog.yml と同数の TOML ファイルが存在する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    expect(files).toHaveLength(EXPECTED_AGENT_COUNT);
  });

  it("agent-catalog.yml の全エージェント名に対応する TOML ファイルが存在する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    for (const name of ALL_AGENTS) {
      expect(files).toContain(`${name}.toml`);
    }
    expect(files.slice().sort()).toEqual(ALL_AGENTS.map((name) => `${name}.toml`).sort());
  });
});

// QFAI:SPEC-0003:TC-0003-0002
describe("TC-0003-0002: TOML 必須フィールド検証", () => {
  it("全 TOML が name, description, developer_instructions を持つ", () => {
    const agents = loadAllAgents();
    expect(agents).toHaveLength(EXPECTED_AGENT_COUNT);
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

// QFAI:SPEC-0003:TC-0003-0009
describe("TC-0003-0009: name フィールドとファイル名の一致", () => {
  it("各 TOML の name フィールドがファイル名（拡張子なし）と一致する", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect(data["name"], `${name}.toml: name mismatch`).toBe(name);
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0011
describe("TC-0003-0011: canonical metadata parity", () => {
  it("各 TOML の name/description が canonical agent frontmatter と一致する", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      const canonical = loadCanonicalFrontmatter(name);
      expect(data["name"], `${name}.toml: name diverges from canonical frontmatter`).toBe(
        canonical.name,
      );
      expect(
        data["description"],
        `${name}.toml: description diverges from canonical frontmatter`,
      ).toBe(canonical.description);
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0004
describe("TC-0003-0004: レビュー系 sandbox_mode = read-only", () => {
  it("reviewer 種別エージェントすべてが sandbox_mode = read-only を持つ", () => {
    for (const name of REVIEW_AGENTS) {
      const data = loadTomlFile(join(AGENTS_DIR, `${name}.toml`));
      expect(data["sandbox_mode"], `${name}: sandbox_mode missing or wrong`).toBe("read-only");
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0005
describe("TC-0003-0005: 実装系 sandbox_mode 省略", () => {
  it("worker 種別エージェントすべてが sandbox_mode キーを持たない", () => {
    for (const name of IMPL_AGENTS) {
      const data = loadTomlFile(join(AGENTS_DIR, `${name}.toml`));
      expect("sandbox_mode" in data, `${name}: sandbox_mode should not exist`).toBe(false);
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0003
describe("TC-0003-0003: developer_instructions 必須セクション含有", () => {
  const REQUIRED_SECTIONS = [
    "Mission",
    "Domain Responsibilities",
    "Inputs you must read",
    "Deliverables",
    "Stop conditions",
    "Sign-off",
  ];

  it("全エージェントの developer_instructions が canonical MD の必須 6 セクションを含む", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect(
        typeof data["developer_instructions"],
        `${name}: developer_instructions is not a string`,
      ).toBe("string");
      const instructions = (data["developer_instructions"] as string).toLowerCase();
      for (const section of REQUIRED_SECTIONS) {
        expect(
          instructions.includes(section.toLowerCase()),
          `${name}: missing section "${section}" in developer_instructions`,
        ).toBe(true);
      }
    }
  });

  it("全エージェントの developer_instructions が canonical MD と実質一致する", () => {
    const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      const canonicalPath = join(CANONICAL_DIR, `${name}.md`);
      expect(existsSync(canonicalPath), `${name}: canonical MD not found`).toBe(true);
      const canonicalContent = readFileSync(canonicalPath, "utf-8");
      // Extract content from the ## Mission heading line onward (skip
      // frontmatter and H1 title)
      const missionBody = canonicalMissionBody(canonicalContent);
      expect(missionBody, `${name}: canonical MD has no ## Mission`).toBeDefined();
      const canonicalBody = normalize(missionBody ?? "");
      expect(
        typeof data["developer_instructions"],
        `${name}: developer_instructions is not a string`,
      ).toBe("string");
      const instructions = normalize(data["developer_instructions"] as string);
      expect(instructions, `${name}: developer_instructions diverges from canonical MD`).toBe(
        canonicalBody,
      );
    }
  });
});

// QFAI:SPEC-0004:TC-0004-0026 — agent-catalog.yml#developer_instructions
// MUST stay in lockstep with canonical .qfai/assistant/agents/<name>.md
// bodies (3-way SSOT: canonical MD ↔ codex TOML ↔ agent-catalog.yml).
// The codex side is already covered by TC-0003-0003 above; this test
// closes the catalog side.
describe("TC-0004-0026: agent-catalog.yml developer_instructions matches canonical MD", () => {
  it("全 agent の developer_instructions が canonical MD と実質一致する", () => {
    const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
    const catalog = parseYaml(readFileSync(CATALOG_PATH, "utf-8")) as Record<string, unknown>;
    const agentsField = catalog["agents"];
    if (!Array.isArray(agentsField)) {
      throw new Error("agent-catalog.yml must contain agents array");
    }
    for (const raw of agentsField) {
      if (!raw || typeof raw !== "object") continue;
      const agent = raw as Record<string, unknown>;
      const id = agent["id"];
      const di = agent["developer_instructions"];
      // expect.toBe throws on mismatch in Vitest; the type narrowing
      // after the predicate runs only on the GREEN path and keeps `id`
      // typed as string for the rest of the loop body.
      expect(typeof id, `agent-catalog.yml agent.id must be string (got ${typeof id})`).toBe(
        "string",
      );
      if (typeof id !== "string") continue; // unreachable; narrows TS type
      const canonicalPath = join(CANONICAL_DIR, `${id}.md`);
      expect(existsSync(canonicalPath), `${id}: canonical MD missing at ${canonicalPath}`).toBe(
        true,
      );
      const canonicalContent = readFileSync(canonicalPath, "utf-8");
      const missionBody = canonicalMissionBody(canonicalContent);
      expect(missionBody, `${id}: canonical MD has no ## Mission section`).toBeDefined();
      const canonicalBody = normalize(missionBody ?? "");
      // Same pattern as `id`: expect throws on mismatch; the if-narrow
      // satisfies TS without adding reachable branches.
      expect(typeof di, `${id}: agent-catalog.yml developer_instructions is not a string`).toBe(
        "string",
      );
      if (typeof di !== "string") continue; // unreachable; narrows TS type
      expect(
        normalize(di),
        `${id}: agent-catalog.yml developer_instructions diverges from canonical MD`,
      ).toBe(canonicalBody);
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0007
describe("TC-0003-0007: model フィールド不在確認", () => {
  it("全 TOML に model キーが存在しない", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect("model" in data, `${name}: model should not exist`).toBe(false);
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0008
describe("TC-0003-0008: nickname_candidates フィールド不在確認", () => {
  it("全 TOML に nickname_candidates キーが存在しない", () => {
    const agents = loadAllAgents();
    for (const { name, data } of agents) {
      expect("nickname_candidates" in data, `${name}: nickname_candidates should not exist`).toBe(
        false,
      );
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0010
describe("TC-0003-0010: TOML 構文妥当性", () => {
  it("全 agent TOML + config.toml が TOML パースエラーなし", () => {
    // config.toml
    expect(() => loadTomlFile(CONFIG_PATH)).not.toThrow();

    // agent files
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    expect(files).toHaveLength(EXPECTED_AGENT_COUNT);
    for (const f of files) {
      expect(() => loadTomlFile(join(AGENTS_DIR, f)), `${f}: TOML parse error`).not.toThrow();
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0011
describe("TC-0003-0011: カタログ外エージェントの不在確認", () => {
  it("agent-catalog.yml に存在しない TOML ファイルが混入していない", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    expect(files.slice().sort()).toEqual(ALL_AGENTS.map((name) => `${name}.toml`).sort());
  });
});

// QFAI:SPEC-0003:TC-0003-0012
describe("TC-0003-0012: ファイル名 kebab-case 検証", () => {
  it("全 TOML ファイル名が kebab-case パターンに一致する", () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".toml"));
    const kebabPattern = /^[a-z][a-z0-9-]*\.toml$/;
    for (const f of files) {
      expect(f, `${f}: not kebab-case`).toMatch(kebabPattern);
    }
  });
});
