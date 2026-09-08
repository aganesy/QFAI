/**
 * QFAI-ASSETS-003 — the Stage 0 steering files finally have a detector.
 *
 * `qfai init` ships `.qfai/assistant/catalog/{manifest,product,structure,tech}.md`
 * with literal `<...>` values, `qfai-implement` Stage 0 is told to take every
 * gate command from `tech.md#standard-commands-copy-paste`, and no validator
 * opened any of the four. The shipped templates themselves are driven here, so
 * the test fails the moment the detector stops recognising the thing it is
 * meant to catch.
 */
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { collectRegeneratedAssistantFiles } from "../../src/core/assistantAssetProvenance.js";
import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../../src/core/sunset.js";
import { resolveToolVersion } from "../../src/core/version.js";
import {
  NAMED_STALE_FILES,
  validateAssistantAssets,
} from "../../src/core/validators/assistantAssets.js";

// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const shippedAssistantDir = path.join(packageRoot, "assets", "init", ".qfai", "assistant");
const shippedCatalogDir = path.join(shippedAssistantDir, "catalog");

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assistant-assets-"));
  tempDirs.push(root);
  await mkdir(path.join(root, ".qfai", "assistant", "catalog"), { recursive: true });
  return root;
}

async function writeCatalog(root: string, fileName: string, content: string): Promise<void> {
  await writeFile(path.join(root, ".qfai", "assistant", "catalog", fileName), content, "utf-8");
}

/** Copy the file `qfai init` actually ships into the temp tree. */
async function seedShipped(root: string, fileName: string): Promise<void> {
  await writeCatalog(
    root,
    fileName,
    await readFile(path.join(shippedCatalogDir, fileName), "utf-8"),
  );
}

async function steeringFindings(root: string) {
  const issues = await validateAssistantAssets(root, defaultConfig);
  return issues.filter((found) => found.code === "QFAI-ASSETS-003");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("validateAssistantAssets — Stage 0 steering placeholders", () => {
  it("flags the shipped tech.md and names the mandated gate-command section", async () => {
    const root = await newRoot();
    await seedShipped(root, "tech.md");

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    const [finding] = findings;
    // Not a literal: the severity is decided by the promotion pin, so spelling
    // `"warning"` here would go red the release the window closes and would
    // say nothing about whether the pin is what decides it.
    expect(finding?.severity).toBe(
      newRuleSeverity(
        await resolveToolVersion(),
        RULE_PROMOTIONS.steeringCatalogPlaceholders.promoteAt,
      ),
    );
    expect(finding?.rule).toBe("assistantAssets.steeringPlaceholder");
    expect(finding?.file).toContain(path.join("catalog", "tech.md"));
    expect(finding?.refs).toContain("Standard commands (copy-paste)");
    // Every `<...>` slot in the section `qfai-implement` Stage 0 must read.
    // Nine since the smoke entry became one line per entrypoint, so the
    // operator fills the entrypoint's name as well as its command; the number
    // tracks the asset, which is what this row is for.
    expect(finding?.message).toContain("Standard commands (copy-paste) (9)");
    expect(finding?.loc?.line).toBeGreaterThan(0);
  });

  it("flags every one of the four shipped steering templates", async () => {
    const root = await newRoot();
    for (const fileName of ["manifest.md", "product.md", "structure.md", "tech.md"]) {
      await seedShipped(root, fileName);
    }

    const findings = await steeringFindings(root);

    expect(findings.map((found) => path.basename(found.file ?? "")).sort()).toEqual([
      "manifest.md",
      "product.md",
      "structure.md",
      "tech.md",
    ]);
  });

  it("stays silent once the values are filled in", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "tech.md",
      [
        "# Tech Steering",
        "",
        "## Standard commands (copy-paste)",
        "",
        "- Install: `pnpm install --frozen-lockfile`",
        "- Test: `pnpm test`",
        "- Docs: <https://example.com/handbook>",
        "- Contact: <team@example.com>",
        "- Validate: `npx qfai validate --fail-on error --format github`",
        "",
      ].join("\n"),
    );

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("flags a bare TBD value the way the operating baseline names it", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      ["# Structure Steering", "", "## Quality gates (SSOT)", "", "- lint: `TBD`", ""].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Quality gates (SSOT) (1)");
  });

  it("counts a bare TBD in a table cell and on a line of its own", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        "| Milestone | Description |",
        "| --------- | ----------- |",
        "| TBD       | TBD         |",
        "",
        "## Open questions",
        "",
        "TBD",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Milestones (2)");
    expect(findings[0]?.message).toContain("Open questions (1)");
  });

  it("counts cells of a table written without outer pipes", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        // Valid GFM: the outer pipes are optional, so this is a table whose
        // two body cells are still unfilled.
        "Milestone | Description",
        "--------- | -----------",
        "TBD       | TBD",
        "GA        | 2026-09-01",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Milestones (2)");
  });

  it("reads cells off the delimiter row, not off any pipe in prose", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Notes",
        "",
        // No delimiter row above these, so they are prose that happens to
        // contain a `|` — splitting them into cells would invent findings.
        "TODO | write the runbook once staging exists",
        "- Log: `pnpm test | tee test.log`",
        "",
      ].join("\n"),
    );

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("counts an angle-bracket slot and a bare TBD left on the same row", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        "| Milestone         | Description |",
        "| ----------------- | ----------- |",
        "| <milestone name>  | TBD         |",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    // Two slots on one row, not one: the `<...>` token and the bare `TBD`.
    expect(findings[0]?.message).toContain("Milestones (2)");
  });

  it("flags a placeholder keyword wrapped in markdown emphasis", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## Quality gates (SSOT)",
        "",
        "- lint: **TBD**",
        "- typecheck: _TODO_",
        "- test: `pnpm test`",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Quality gates (SSOT) (2)");
  });

  it("counts a bare TBD behind an emphasised bullet label", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## Quality gates (SSOT)",
        "",
        // The label, not the value, carries the emphasis: the residual `**`
        // left on the extracted value is decoration and is peeled off before
        // the keyword test.
        "- **Test:** TBD",
        "- _Lint:_ TODO",
        "- **Build:** `pnpm build`",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Quality gates (SSOT) (2)");
  });

  it("counts a slot whose name is written in a non-ASCII script", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "tech.md",
      [
        "# Tech Steering",
        "",
        "## Standard commands (copy-paste)",
        "",
        "- Test: `<テストコマンド>`",
        "- Lint: `<リントコマンド>`",
        "- Build: `pnpm build`",
        // Digits only, no letter in any script: typography, not a slot.
        "- Budget: <300> ms",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Standard commands (copy-paste) (2)");
  });

  it("counts a placeholder left in the section heading itself", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## <product area>",
        "",
        "- Summary: the ledger service",
        "",
        "## Milestones",
        "",
        "- GA: 2026-09-01",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    // The heading names its own section, and is charged to it.
    expect(findings[0]?.message).toContain("<product area> (1)");
    expect(findings[0]?.message).not.toContain("Milestones");
  });

  it("ignores a placeholder that has been commented out", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "tech.md",
      [
        "# Tech Steering",
        "",
        "## Standard commands (copy-paste)",
        "",
        "- Test: `pnpm test`",
        "<!-- dropped: - Bench: `<bench command>` -->",
        "<!--",
        "- Docs: <doc command>",
        "-->",
        "",
      ].join("\n"),
    );

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("accepts a non-HTTP URI autolink as a filled value", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "manifest.md",
      [
        "# Manifest",
        "",
        "## Contacts",
        "",
        "- Hotline: <tel:+1-212-555-0100>",
        "- Standard: <urn:isbn:9780262033848>",
        "- Issues: <mailto:team@example.com>",
        "",
      ].join("\n"),
    );

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("flags a bare TBD under a `+` bullet and an ordered list marker", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        "+ TBD",
        "+ Beta: TBD",
        "1. TBD",
        "2) Launch: TODO",
        "+ GA: 2026-09-01",
        "3. Retro: scheduled",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Milestones (4)");
  });

  it("accepts a bracketed markdown link destination as a filled value", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## References",
        "",
        "- 設計書: [設計書](<docs/System Design.md>)",
        '- 規約: [規約](<docs/Coding Standard.md> "社内規約")',
        "- ADR: [ADR](docs/adr.md)",
        "",
      ].join("\n"),
    );

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("still counts a slot that only looks like a link destination", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## References",
        "",
        // No `](` in front: an ordinary unfilled slot that happens to sit
        // beside a parenthesis.
        "- 設計書: <design doc path> (未定)",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("References (1)");
  });

  it("counts a placeholder keyword left as the heading text itself", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        // The `##` is structure; the value the operator still owes is `TBD`.
        "## TBD",
        "",
        "- Summary: the ledger service",
        "",
        "## **TBD**",
        "",
        "- Summary: the reporting service",
        "",
        "## Milestones",
        "",
        "- GA: 2026-09-01",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("TBD (1)");
    expect(findings[0]?.message).toContain("**TBD** (1)");
    // A heading that is a real section name is not a placeholder.
    expect(findings[0]?.message).not.toContain("Milestones");
  });

  it("does not split a table cell at an escaped pipe", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        "| Step  | Command             |",
        "| ----- | ------------------- |",
        // `\|` is the only way to put a pipe inside a GFM cell: one filled
        // cell, not a `TBD` fragment.
        "| Smoke | `echo ok \\| TBD`    |",
        "| Lint  | TBD                 |",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    // Only the genuinely empty `Lint` cell.
    expect(findings[0]?.message).toContain("Milestones (1)");
  });

  it("counts a placeholder behind a GFM task-list checkbox", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Open questions",
        "",
        "- [ ] TBD",
        "- [x] TODO",
        // An answered question is a value, not a slot.
        "- [ ] Confirm the retention window",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Open questions (2)");
  });

  it("ends the table at a list that follows it without a blank line", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "product.md",
      [
        "# Product Steering",
        "",
        "## Milestones",
        "",
        "| Milestone | Description |",
        "| --------- | ----------- |",
        "| TBD       | TBD         |",
        // A list is a new block: it ends the table, and its value is read the
        // way a bullet's value is read.
        "- Test: TBD",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    // Two table cells (still split per cell) plus the bullet.
    expect(findings[0]?.message).toContain("Milestones (3)");
  });

  it("still counts an explicit TBD left in a bracketed link destination", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## References",
        "",
        "- 設計書: [設計書](<TBD>)",
        "- 規約: [規約](<TODO>)",
        // A real destination that needs the brackets only because of the space.
        "- ADR: [ADR](<docs/System Design.md>)",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("References (2)");
  });

  it("counts a placeholder behind a bullet label carrying backticks or a URL", async () => {
    const root = await newRoot();
    await writeCatalog(
      root,
      "structure.md",
      [
        "# Structure Steering",
        "",
        "## Quality gates (SSOT)",
        "",
        "- Command for `lint`: TBD",
        "- Evidence URL (https://example.com): TBD",
        // The same label shapes, filled in.
        "- Command for `test`: `pnpm test`",
        "- Evidence URL (https://example.com/docs): docs/evidence.md",
        "",
      ].join("\n"),
    );

    const findings = await steeringFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Quality gates (SSOT) (2)");
  });

  it("names the catalog path the project is configured to use", async () => {
    const root = await newRoot();
    await mkdir(path.join(root, "assistant-tree", "catalog"), { recursive: true });
    await writeFile(
      path.join(root, "assistant-tree", "catalog", "tech.md"),
      ["# Tech Steering", "", "## Standard commands (copy-paste)", "", "- Test: TBD", ""].join(
        "\n",
      ),
      "utf-8",
    );
    const relocated = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, skillsDir: "assistant-tree/skills" },
    };

    const issues = await validateAssistantAssets(root, relocated);
    const findings = issues.filter((found) => found.code === "QFAI-ASSETS-003");

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("assistant-tree/catalog/tech.md");
    expect(findings[0]?.message).not.toContain(".qfai/assistant/catalog/tech.md");
  });

  it("still names the default catalog path when the tree is not relocated", async () => {
    const root = await newRoot();
    await seedShipped(root, "tech.md");

    const findings = await steeringFindings(root);

    expect(findings[0]?.message).toContain(".qfai/assistant/catalog/tech.md");
  });

  it("takes its severity from the promotion window and names the release that ends it", async () => {
    // P7: a new finding code ships at `warning` behind a pinned promotion
    // release, and says so in the finding itself, so `--fail-on error` keeps
    // working while the operator sees the debt. This rule landed with a
    // literal `"warning"` and no pin at all — which reads as "registered" to
    // nothing, and gave the escalation its docstring promises no route to
    // ever happen. `tests/core/sunsetLedger.test.ts` catches the missing
    // registry entry; this catches the operator-visible half.
    const root = await newRoot();
    await seedShipped(root, "tech.md");

    const { promoteAt } = RULE_PROMOTIONS.steeringCatalogPlaceholders;
    const findings = await steeringFindings(root);
    const [finding] = findings;

    expect(finding?.severity).toBe(newRuleSeverity(await resolveToolVersion(), promoteAt));
    if (finding?.severity === "warning") {
      expect(finding.message).toContain(promoteAt);
    }
  });

  it("does not report a steering file that is absent", async () => {
    const root = await newRoot();

    expect(await steeringFindings(root)).toHaveLength(0);
  });

  it("skips a catalog entry that is not a regular file instead of failing", async () => {
    const root = await newRoot();
    // A directory where `tech.md` belongs: `readFile` answers `EISDIR`, which
    // the rule declines the same way it declines absence — it is a layout
    // fault, not unfilled content.
    await mkdir(path.join(root, ".qfai", "assistant", "catalog", "tech.md"), { recursive: true });
    await seedShipped(root, "product.md");

    const findings = await steeringFindings(root);

    expect(findings.map((found) => path.basename(found.file ?? ""))).toEqual(["product.md"]);
  });
});

/**
 * QFAI-ASSETS-009 — the layers `qfai init --force` regenerates.
 *
 * `skills/**` and `agents/**` are copied once and refreshed only by an explicit
 * `--force`, so an upgraded project keeps running the skill bodies it
 * initialised with and nothing said so. The shipped trees themselves are driven
 * here rather than a fixture: a fixture would still pass if the check stopped
 * reading the directories the release actually ships.
 */
describe("validateAssistantAssets — regenerated assistant layers", () => {
  async function staleFindings(root: string) {
    const issues = await validateAssistantAssets(root, defaultConfig);
    return issues.filter((found) => found.code === "QFAI-ASSETS-009");
  }

  /** The project's copy of a layer, exactly as `qfai init` would leave it. */
  async function seedLayer(root: string, layer: "skills" | "agents"): Promise<void> {
    await cp(path.join(shippedAssistantDir, layer), path.join(root, ".qfai", "assistant", layer), {
      recursive: true,
    });
  }

  /** A file inside the project's copy of a layer, by its path under that layer. */
  function layerFile(root: string, layer: "skills" | "agents", relative: string): string {
    return path.join(root, ".qfai", "assistant", layer, ...relative.split("/"));
  }

  /** The paths the release ships under one layer, in the walk's own order. */
  async function shippedUnder(layer: "skills" | "agents"): Promise<string[]> {
    return (await collectRegeneratedAssistantFiles(shippedAssistantDir, layer)).map((relative) =>
      relative.slice(layer.length + 1),
    );
  }

  it("says nothing about a project holding exactly what the release ships", async () => {
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("reports one finding for the layer, naming the count and the remedy's cost", async () => {
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");
    const [first] = await shippedUnder("skills");
    expect(first, "the release must ship skills for this case to be about anything").toBeDefined();
    await writeFile(layerFile(root, "skills", first ?? ""), "behind the release\n", "utf-8");

    const findings = await staleFindings(root);

    expect(findings).toHaveLength(1);
    const [finding] = findings;
    expect(finding?.rule).toBe("assistantAssets.staleRegeneratedLayer");
    expect(finding?.file).toContain(path.join("assistant", "skills"));
    expect(finding?.message).toContain("differs from the installed release in 1 of the");
    expect(finding?.message).toContain(first ?? "");
    // The hint has to say the layer is overwritten. `QFAI-ASSETS-004` can offer
    // `--force` as a plain refresh because a diverged file is left alone; this
    // layer has no such exemption, and a hint that quietly destroys work is
    // worse than the staleness it clears.
    expect(finding?.suggested_action).toContain("qfai init --force");
    expect(finding?.suggested_action).toContain(
      "overwrites every file in that layer, local edits included",
    );
  });

  it("stays at one finding per layer when the whole tree is behind", async () => {
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");
    const shipped = await shippedUnder("skills");
    expect(
      shipped.length,
      "the burying this case is about needs many files to bury with",
    ).toBeGreaterThan(NAMED_STALE_FILES);
    for (const relative of shipped) {
      await writeFile(layerFile(root, "skills", relative), "behind the release\n", "utf-8");
    }

    const findings = await staleFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain(
      `differs from the installed release in ${String(shipped.length)} of the ${String(shipped.length)} files`,
    );
    // Named up to a cap and then counted. Listing all of them would be the
    // per-file finding this rule exists to avoid, printed inside one message.
    expect(findings[0]?.message).toContain(
      `and ${String(shipped.length - NAMED_STALE_FILES)} more`,
    );
  });

  it("reports only the layer that is behind", async () => {
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");
    const [first] = await shippedUnder("agents");
    await writeFile(layerFile(root, "agents", first ?? ""), "behind the release\n", "utf-8");

    const findings = await staleFindings(root);

    expect(findings.map((found) => path.basename(found.file ?? ""))).toEqual(["agents"]);
  });

  it("says nothing about a project that has no such layer", async () => {
    // Never ran `init` here, or still on the pre-recut layout. It is not behind
    // the release; it has nothing to be behind with, and naming every shipped
    // file at it would be noise rather than governance.
    const root = await newRoot();

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("leaves a file the release does not ship alone", async () => {
    // `--force` copies, it does not prune, so reporting this would name
    // something the remedy cannot clear.
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");
    await writeFile(layerFile(root, "agents", "project-only.md"), "ours\n", "utf-8");

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("takes its severity from the promotion pin", async () => {
    const root = await newRoot();
    await seedLayer(root, "skills");
    await seedLayer(root, "agents");
    const [first] = await shippedUnder("skills");
    await writeFile(layerFile(root, "skills", first ?? ""), "behind the release\n", "utf-8");

    const { promoteAt } = RULE_PROMOTIONS.assistantRegeneratedLayerStale;
    const [finding] = await staleFindings(root);

    // Not a literal: spelling `"warning"` here would go red the release the
    // window closes, and would say nothing about whether the pin decides it.
    expect(finding?.severity).toBe(newRuleSeverity(await resolveToolVersion(), promoteAt));
    if (finding?.severity === "warning") {
      expect(finding.message).toContain(promoteAt);
    }
  });
});
