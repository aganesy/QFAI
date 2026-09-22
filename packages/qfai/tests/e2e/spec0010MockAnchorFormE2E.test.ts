/**
 * E2E: the discussion mock template emits anchor-form links (spec-0010).
 *
 * Both halves of the story in one place: the template a discussion author
 * copies, and the validator that reads what they wrote. A template whose own
 * mock the validator rejects is the failure this covers.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const discussionSkillDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
);
const workshopTemplate = path.join(discussionSkillDir, "templates", "03_Story-Workshop.md");

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
});

function config(): QfaiConfig {
  return {
    paths: {
      discussionDir: ".qfai/discussion",
      specsDir: ".qfai/specs",
    },
    uiux: { htmlMockTimeout: 5000 },
  } as unknown as QfaiConfig;
}

/** Writes one discussion pack holding `markdown`, and returns the root. */
async function packHolding(markdown: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-mock-"));
  roots.push(root);
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "03_Story-Workshop.md"), markdown, "utf-8");
  return root;
}

async function localRefFindings(root: string): Promise<string[]> {
  const issues = await validateHtmlMock(root, "web", config());
  return issues.filter((entry) => entry.code === "QFAI-MOCK-010").map((entry) => entry.message);
}

// QFAI:SPEC-0010:US-0010-0011
describe("E2E: the mock template emits anchor-form hrefs by default (US-0010-0011)", () => {
  it("ships a mock whose links are anchor-form", async () => {
    const template = await readFile(workshopTemplate, "utf-8");
    expect(template).toContain('<a href="#orders">');
  });

  it("instructs the author in the skill as well as in the template", async () => {
    const template = await readFile(workshopTemplate, "utf-8");
    const skill = await readFile(path.join(discussionSkillDir, "SKILL.md"), "utf-8");
    for (const [name, content] of [
      ["the template", template],
      ["SKILL.md", skill],
    ] as const) {
      expect(content, `${name} must name the anchor form`).toContain('<a href="#name">');
    }
  });

  it("passes the validator that reads what the author wrote", async () => {
    // The template is the default a pack starts from, so a template the
    // validator rejects makes every untouched pack red on its first run.
    const template = await readFile(workshopTemplate, "utf-8");
    await expect(localRefFindings(await packHolding(template))).resolves.toEqual([]);
  });

  it("is the form a same-origin absolute path would have lost", async () => {
    // Without this the case above passes on a template with no links at all.
    const sameOrigin = [
      "# Story Workshop",
      "",
      "```html",
      '<section class="screen-mock">',
      '  <a href="/orders/">View Orders</a>',
      "</section>",
      "```",
      "",
    ].join("\n");

    const findings = await localRefFindings(await packHolding(sameOrigin));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("/orders/");
  });
});
