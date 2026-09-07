import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fg from "fast-glob";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "web-research",
);
// The MCP templates live inside the skill that documents them, so `qfai init`
// copies them into the consumer root alongside SKILL.md. Held outside the init
// payload they shipped in the npm tarball but never reached a project, leaving
// SKILL.md's "Configuration templates:" pointers unresolvable for consumers.
const mcpTemplateDir = path.join(skillDir, "mcp-templates");

async function readSkill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

describe("web-research pipeline", { timeout: 15_000 }, () => {
  // QFAI:SPEC-0027:TC-0027-0001
  it("defines 8 pipeline stages in order: search→rank→fetch→extract→sanitize→cache→verify→cite", async () => {
    const content = await readSkill();
    const stages = ["search", "rank", "fetch", "extract", "sanitize", "cache", "verify", "cite"];

    // All 8 stages must be present
    for (const stage of stages) {
      expect(content.toLowerCase()).toContain(stage);
    }

    // Stages must appear in order
    let lastIndex = -1;
    for (const stage of stages) {
      const stageRe = new RegExp(`\\b${stage}\\b`, "i");
      const match = stageRe.exec(content);
      expect(match, `stage "${stage}" not found in SKILL.md`).not.toBeNull();
      const idx = match?.index ?? -1;
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }

    // Session log reference must exist
    expect(content).toMatch(/session[_\s-]?log/i);

    // Citation output must be specified
    expect(content).toMatch(/citation/i);
  });

  // QFAI:SPEC-0027:TC-0027-0002
  it("specifies zero-result handling when no web sources found", async () => {
    const content = await readSkill();
    expect(content).toMatch(/no\s+(web\s+)?sources?\s+found|zero[_\s-]?result/i);
  });

  // QFAI:SPEC-0027:TC-0027-0003
  it("specifies fetch failure isolation per URL", async () => {
    const content = await readSkill();
    expect(content).toMatch(/fetch\s+fail(ure)?/i);
    expect(content).toMatch(/partial\s+result|isolat/i);
  });

  // QFAI:SPEC-0027:TC-0027-0004
  it("references MCP stdio transport for Brave Search", async () => {
    const content = await readSkill();
    expect(content).toMatch(/brave\s+search/i);
    expect(content).toMatch(/stdio|mcp/i);
  });

  // QFAI:SPEC-0027:TC-0027-0026
  it("references MCP HTTP transport support", async () => {
    const content = await readSkill();
    expect(content).toMatch(/http\s+transport|http[_\s-]?based\s+mcp|streamable[_\s-]?http/i);
  });

  // QFAI:SPEC-0027:TC-0027-0021
  it("cross-agent MCP templates exist for at least 2 of 3 agent formats", async () => {
    const braveDir = path.join(mcpTemplateDir, "brave-search");
    const files = await fg(["**/*"], { cwd: braveDir, absolute: false }).catch(() => []);

    // At least 2 of 3 config formats: .mcp.json, config.toml, mcp-config.json
    const formats = [".mcp.json", "config.toml", "mcp-config.json"];
    const found = formats.filter((fmt) => files.some((f) => f.endsWith(fmt)));
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  // QFAI:SPEC-0027:TC-0027-0027
  it("specifies conservative concurrency defaults max_threads=2", async () => {
    const content = await readSkill();
    expect(content).toMatch(/max[_\s-]?threads\s*[=:]\s*2/i);
  });

  // QFAI:SPEC-0027:TC-0027-0023
  it("specifies cache key derivation as hash(URL+etag)", async () => {
    const content = await readSkill();
    expect(content).toMatch(/hash\s*\(\s*url\s*\+\s*etag\s*\)|hash\(url\+etag\)/i);
  });

  // QFAI:SPEC-0027:TC-0027-0024
  it("specifies cache staleness with 24h default TTL", async () => {
    const content = await readSkill();
    expect(content).toMatch(/24\s*h(our)?|ttl.*24|staleness/i);
  });

  // QFAI:SPEC-0027:TC-0027-0028
  it("Firecrawl template documents both hosted and local npx modes", async () => {
    const firecrawlDir = path.join(mcpTemplateDir, "firecrawl");
    const files = await fg(["**/*"], { cwd: firecrawlDir, absolute: false }).catch(() => []);
    expect(files.length).toBeGreaterThan(0);

    // Read all available configs and require explicit mode markers to avoid false positives.
    let hasHosted = false;
    let hasLocal = false;
    for (const file of files) {
      const content = await readFile(path.join(firecrawlDir, file), "utf-8");
      if (/hosted\s+mode|hosted\s+url/i.test(content)) hasHosted = true;
      if (/local\s+npx\s+mode/i.test(content)) hasLocal = true;
    }
    expect(hasHosted).toBe(true);
    expect(hasLocal).toBe(true);
  });
});
