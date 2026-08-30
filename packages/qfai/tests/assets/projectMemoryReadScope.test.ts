/**
 * Article III mandated an unscoped read of two whole directory trees before any
 * deliverable, and a third of that read was a generated mirror.
 *
 * Items 3 and 4 of the article carry conditions (`(if present)`,
 * `(if relevant)`); items 1 and 2 did not. Item 2's `.qfai/assistant/manifest/*`
 * glob pulled in `manifest/agent-catalog.yml`, which is the one file the
 * framework exempts from `SKILL_MD_MAX_LINES` precisely because it is
 * "generated, not authored". Only its `developer_instructions` field is
 * generated: `tests/codex/agents.test.ts` asserts that field stays identical to
 * `assistant/agents/<id>.md`, and nothing else in the entry is mirrored there.
 * `owned_artifacts`, `tool_profile`, `permission_profile`, and
 * `specialization_tags` live only in the catalog — `constitution/agent-selection.md`
 * names it SSOT alongside `agent-routing.yml` and `review-profiles.yml` — so the
 * scoping may drop the duplicated body and nothing more.
 *
 * The article also fired at the same instant as `workflow.md`'s Stage 0
 * steering-refresh contract, overlapped it on `catalog/`, and neither cited the
 * other — so a stage had two mandatory bootstrap contracts and no statement of
 * how they compose.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONSTITUTION = "assistant/constitution/constitution.md";
const WORKFLOW = "assistant/constitution/workflow.md";
const AGENTS_DIR = "assistant/agents";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function read(tree: string, rel: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));
}

/**
 * Slice the Article III body out of the flattened constitution. Bounds are
 * asserted before use: an `indexOf` miss returns -1 and `slice` would quietly
 * hand back a different region than the one under test.
 */
function articleIII(constitution: string): string {
  const start = constitution.indexOf("## Article III");
  const end = constitution.indexOf("## Article IV");
  expect(start, "the Article III heading moved").toBeGreaterThanOrEqual(0);
  expect(end, "the article after Article III moved").toBeGreaterThan(start);
  return constitution.slice(start, end);
}

describe.each(QFAI_TREES)("%s", (tree) => {
  it("names the manifest files it needs instead of globbing the whole directory", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    // The whole-directory glob is what dragged the 1,622-line mirror in.
    expect(article).not.toContain("`.qfai/assistant/manifest/*`");
    expect(article).toContain("`.qfai/assistant/manifest/agent-routing.yml`");
    expect(article).toContain("`.qfai/assistant/manifest/review-profiles.yml`");
  });

  it("scopes the skip to the mirrored body, keeping the catalog-only metadata mandatory", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    // Only `developer_instructions` duplicates the agent card. The ownership,
    // tool, and permission metadata exists nowhere else, so a card in context
    // must never stand in for the catalog entry.
    expect(article).toContain("`.qfai/assistant/manifest/agent-catalog.yml`");
    expect(article).toContain("`owned_artifacts`");
    expect(article).toContain("`tool_profile`");
    expect(article).toContain("`permission_profile`");
    expect(article).toContain("`specialization_tags`");
    // The mirrored body, and only it, is the part the article may let an
    // already-loaded agent card satisfy.
    expect(article).toContain(
      "Only the entry's `developer_instructions` body is a generated mirror",
    );
    expect(article).toContain("`.qfai/assistant/agents/<id>.md`");
    expect(article).toContain("on demand");
  });

  it("only lets the skip stand when the card and the catalog body agree", async () => {
    // `init --force` regenerates the card and deliberately leaves `manifest/`
    // alone so a taxonomy tuned through `/qfai-configure` survives, so the two
    // bodies can differ in an upgraded or customised project. Skipping on the
    // card's mere presence then drops the role contract the catalog carries.
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("the mirror can be");
    expect(article).toContain(
      "skip that body only when it matches the card in context; when they differ, the catalog entry is the role contract and wins",
    );
    expect(article).toContain("stale-manifest.md");
    expect(article).not.toContain("skip that body when the card is already in context");
  });

  it("still mandates the authored project memory it always did", async () => {
    // The scoping must not become a licence to skip the authored assets: only
    // the machine-derived duplicate leaves the unconditional path.
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("`.qfai/assistant/constitution/*`");
    expect(article).toContain("`.qfai/assistant/catalog/*`");
    expect(article).toContain("`.qfai/discussion/` (if present)");
    expect(article).toContain("`.qfai/specs/spec-*/` (if relevant)");
  });

  it("composes the article with the Stage 0 steering refresh instead of racing it", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("Stage 0 — Steering refresh contract");
    expect(article).toContain("constitution/workflow.md");
  });

  it("keeps the standing orchestrator's own catalog entry mandatory", async () => {
    // `constitution/agent-selection.md` makes `orchestrator` the standing
    // commander, and no phase in `manifest/agent-routing.yml` nor any profile
    // in `manifest/review-profiles.yml` lists it. Scoping the catalog read to
    // "every routed role" alone would therefore drop the one entry that is
    // read on every single stage.
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("`orchestrator`");
    expect(article).toContain("constitution/agent-selection.md");
  });

  it("points back from Stage 0, so neither statement can drift alone", async () => {
    const workflow = await read(tree, WORKFLOW);
    const start = workflow.indexOf("### Stage 0 — Steering refresh contract");
    const end = workflow.indexOf("## Delegation pattern");
    expect(start, "the Stage 0 heading moved").toBeGreaterThanOrEqual(0);
    expect(end, "the section after Stage 0 moved").toBeGreaterThan(start);
    const stage0 = workflow.slice(start, end);
    expect(stage0).toContain("Article III");
    expect(stage0).toContain("constitution/constitution.md");
  });

  // Scoping the article alone changes nothing while every agent card still
  // opens with `## Inputs you must read` -> `.qfai/assistant/{manifest,catalog}/**`.
  // Activating any role re-imposes the whole-tree read the article just dropped,
  // so the cards state the same scope the article does.
  it("scopes the same read in every agent card, not just in the article", async () => {
    const dir = path.join(repoRoot, tree, AGENTS_DIR);
    const cards = (await readdir(dir)).filter((name) => name.endsWith(".md"));
    expect(cards.length, "no agent cards found").toBeGreaterThan(0);

    for (const card of cards) {
      const body = flat(await readFile(path.join(dir, card), "utf-8"));
      expect(body, `${card}: still globs the whole manifest tree`).not.toContain(
        ".qfai/assistant/{manifest,catalog}/",
      );
      expect(body, `${card}: does not name agent-routing.yml`).toContain(
        ".qfai/assistant/manifest/agent-routing.yml",
      );
      expect(body, `${card}: does not name review-profiles.yml`).toContain(
        ".qfai/assistant/manifest/review-profiles.yml",
      );
      // The catalog stays required — only its mirrored body is conditional.
      expect(body, `${card}: dropped the catalog entry entirely`).toContain(
        ".qfai/assistant/manifest/agent-catalog.yml",
      );
      // The skip is conditional on the two bodies AGREEING. `init --force`
      // regenerates the card and deliberately leaves `manifest/` alone, so an
      // upgraded or `/qfai-configure`-tuned project can hold two different
      // bodies for one role — skipping on the card's mere presence then drops
      // the role contract the catalog carries.
      expect(body, `${card}: does not scope the mirrored body`).toContain(
        "Skip a `developer_instructions` body only when it matches the agent card already in context",
      );
      expect(body, `${card}: does not say which side wins on divergence`).toContain(
        "when the two differ the catalog entry is the role contract and wins",
      );
      // `doctor`'s `extractLiteralRequiredInputs` (src/core/doctor.ts) treats a
      // bullet that starts with "." and carries no glob character as a literal
      // path it must find on disk. The catalog scope therefore has to ride on
      // the globbed bullet as a continuation line, never as its own bullet.
      expect(
        body,
        `${card}: the catalog scope is its own bullet and doctor will read it as a path`,
      ).not.toContain("- .qfai/assistant/manifest/agent-catalog.yml —");
    }
  });

  // Scoping the article and the cards is still not enough: `qfai-sdd`,
  // `qfai-atdd`, `qfai-configure` and `qfai-verify` each carry their own
  // `Inputs Priority`, and a whole-manifest glob there re-reads the mirror on
  // every ordinary run of those workflows.
  it("scopes the manifest read in the skills that declare their own inputs", async () => {
    const dir = path.join(repoRoot, tree, "assistant/skills");
    const skills = (await readdir(dir)).filter((name) => name.startsWith("qfai-"));
    expect(skills.length, "no qfai-* skills found").toBeGreaterThan(0);

    for (const skill of skills) {
      const body = flat(await readFile(path.join(dir, skill, "SKILL.md"), "utf-8"));
      if (!body.includes("Inputs Priority")) {
        continue;
      }
      expect(body, `${skill}: still globs the whole manifest tree`).not.toContain(
        "P2: `.qfai/assistant/manifest/*`",
      );
      if (!body.includes("agent-catalog.yml")) {
        continue;
      }
      expect(body, `${skill}: does not scope the catalog read`).toContain("not the file whole");
    }
  });
});
