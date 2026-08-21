/**
 * Cross-document `file.md#anchor` references inside `.qfai/assistant/**` were
 * validated by nothing.
 *
 * The assistant tree is held together by anchored citations — `SKILL.md`
 * delegates to `references/`, references cite constitution sections, agents
 * cite skill sections. A partial `qfai init` refresh leaves half the tree at an
 * older revision, so a newer rule cites a section the older document in the
 * same tree does not contain. Nothing reported it: the tree looks complete, and
 * the dispatch that follows the citation arrives at a document with no such
 * section and proceeds on whatever the agent inferred.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import {
  collectAnchorReferences,
  collectHeadingSlugs,
  slugifyHeading,
  validateAssistantAnchorReferences,
} from "../../src/core/validators/assistantAnchorReferences.js";

async function withAssistantTree(
  files: Record<string, string>,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-anchor-refs-"));
  try {
    for (const [relative, body] of Object.entries(files)) {
      const absolute = path.join(root, relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function run(root: string) {
  const { config } = await loadConfig(root);
  return validateAssistantAnchorReferences(root, config);
}

describe("slugifyHeading", () => {
  it("strips backticks and bold markers before removing punctuation", () => {
    expect(slugifyHeading("Precedence between `delivery-planner` and `qa-gatekeeper`")).toBe(
      "precedence-between-delivery-planner-and-qa-gatekeeper",
    );
    expect(slugifyHeading("**Finding provenance (MUST)**")).toBe("finding-provenance-must");
  });

  it("collapses a heading down to the GitHub slug", () => {
    expect(slugifyHeading("Layer derivation procedure (normative)")).toBe(
      "layer-derivation-procedure-normative",
    );
  });
});

describe("collectHeadingSlugs", () => {
  it("ignores headings inside fenced code blocks", () => {
    const slugs = collectHeadingSlugs(
      ["# Real Heading", "", "```md", "## Fenced Heading", "```", "", "## Second"].join("\n"),
    );
    expect([...slugs].sort()).toEqual(["real-heading", "second"]);
  });
});

describe("collectAnchorReferences", () => {
  it("reads the citing line number and skips fenced examples", () => {
    const references = collectAnchorReferences(
      [
        "See `constitution/drift-protocol.md#drift-classes`.",
        "",
        "```md",
        "example/only.md#not-a-citation",
        "```",
      ].join("\n"),
    );
    expect(references).toEqual([
      { line: 1, targetPath: "constitution/drift-protocol.md", anchor: "drift-classes" },
    ]);
  });

  it("leaves prose/column anchors alone — only GitHub slug shapes are citations", () => {
    // `06_Test-Cases.md#Level` names a table column, not a heading. An anchor
    // carrying uppercase can never be a GitHub slug, so it is out of scope.
    expect(collectAnchorReferences("`06_Test-Cases.md#Level` is the column.")).toEqual([]);
  });
});

describe("validateAssistantAnchorReferences", () => {
  it("reports a citation whose target document has no such heading", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/catalog/test-layers.md": ["# Test layers", "", "## Vocabulary", ""].join(
          "\n",
        ),
        ".qfai/assistant/skills/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Derive the Layer per `catalog/test-layers.md#layer-derivation-procedure-normative`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.severity).toBe("error");
        expect(issues[0]?.loc?.line).toBe(3);
        expect(issues[0]?.message).toContain("layer-derivation-procedure-normative");
      },
    );
  });

  it("accepts the citation once the target document carries the heading", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/catalog/test-layers.md": [
          "# Test layers",
          "",
          "## Layer derivation procedure (normative)",
          "",
        ].join("\n"),
        ".qfai/assistant/skills/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Derive the Layer per `catalog/test-layers.md#layer-derivation-procedure-normative`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("resolves a bare SKILL.md against the citing file's own skill, not a sibling's", async () => {
    await withAssistantTree(
      {
        // The sibling skill carries the heading; the owning one does not. A
        // basename-only fallback would match this file and pass.
        ".qfai/assistant/skills/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "## Parallelization policy",
          "",
        ].join("\n"),
        ".qfai/assistant/skills/qfai-implement/SKILL.md": ["# qfai-implement", ""].join("\n"),
        ".qfai/assistant/skills/qfai-implement/references/final-checklist.md": [
          "# Final checklist",
          "",
          "Honor `SKILL.md#parallelization-policy`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.file).toContain("final-checklist.md");
      },
    );
  });

  it("resolves a repo-root-relative citation as well as a file-relative one", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/constitution/drift-protocol.md": [
          "# Drift protocol",
          "",
          "## Drift classes",
          "",
        ].join("\n"),
        ".qfai/assistant/skills/qfai-sdd/templates/change-request.md": [
          "# Change request",
          "",
          "Classify per `.qfai/assistant/constitution/drift-protocol.md#drift-classes`.",
          "Then per `constitution/drift-protocol.md#drift-classes`.",
          "And per `drift-protocol.md#drift-classes`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("stays silent when the cited document is not part of the assistant tree", async () => {
    // `06_Test-Cases.md` and `tdd/test-list.md` live in the consumer's spec
    // packs. Anchor integrity across the assistant tree is this rule's scope;
    // the existence of a project artifact is not.
    await withAssistantTree(
      {
        ".qfai/assistant/catalog/test-layers.md": [
          "# Test layers",
          "",
          "See `tdd/test-list.md#layer-column` for the ledger side.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("returns nothing when the project has no assistant tree", async () => {
    await withAssistantTree({ "README.md": "# project\n" }, async (root) => {
      expect(await run(root)).toEqual([]);
    });
  });

  it("keeps walking when part of the assistant tree is not a directory", async () => {
    // Structural damage belongs to QFAI-LINK-001, which runs first in every
    // profile. This rule must not raise ENOTDIR out of its own walk and take
    // that finding down with it.
    await withAssistantTree(
      {
        ".qfai/assistant/skills": "not a directory\n",
        ".qfai/assistant/constitution/workflow.md": ["# Workflow", ""].join("\n"),
        ".qfai/assistant/catalog/test-layers.md": [
          "# Test layers",
          "",
          "See `constitution/workflow.md#concurrency-stage-independent-mandatory`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
      },
    );
  });
});

describe("profile wiring", () => {
  // A dangling citation is a property of the installation, not of a stage, so
  // every profile has to see it — the drift it reports predates whichever
  // stage the operator happens to be running.
  const profiles = ["discussion", "sdd", "atdd", "tdd", "verify", "full"] as const;

  it.each(profiles)("reports QFAI-LINK-002 under --profile %s", async (profile) => {
    await withAssistantTree(
      {
        ".qfai/assistant/constitution/drift-protocol.md": ["# Drift protocol", ""].join("\n"),
        ".qfai/assistant/skills/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Classify per `constitution/drift-protocol.md#drift-classes`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const result = await validateProject(root, undefined, { profile });
        expect(result.issues.map((entry) => entry.code)).toContain("QFAI-LINK-002");
      },
    );
  });
});

describe("the shipped assistant tree", () => {
  it("has no dangling anchored cross-reference", async () => {
    // The rule is only a gate if the tree QFAI ships passes it. A partial
    // re-sync of the vendored tree shows up here first.
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const { config } = await loadConfig(repoRoot);
    const issues = await validateAssistantAnchorReferences(repoRoot, config);
    expect(issues.map((entry) => `${entry.file ?? ""}: ${entry.message}`)).toEqual([]);
  });
});
