/**
 * E2E: the discussion mock template emits anchor-form links (spec-0010).
 *
 * Both halves of the story in one place: the template a discussion author
 * copies, and the validator that reads what they wrote. A template whose own
 * mock the validator rejects is the failure this covers.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";

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
      specsDir: ".qfai/spec",
    },
    uiux: { htmlMockTimeout: 5000 },
  } as unknown as QfaiConfig;
}

/** Writes one spec file holding `markdown`, and returns the root. */
async function packHolding(markdown: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-mock-"));
  roots.push(root);
  const packDir = path.join(root, ".qfai", "spec");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "03_Story-Workshop.md"), markdown, "utf-8");
  return root;
}

async function localRefFindings(root: string): Promise<string[]> {
  const issues = await validateHtmlMock(root, "web", config());
  return issues.filter((entry) => entry.code === "QFAI-MOCK-010").map((entry) => entry.message);
}

// QFAI:BF-0001
describe("E2E: the mock template emits anchor-form hrefs by default (US-0010-0011)", () => {
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
