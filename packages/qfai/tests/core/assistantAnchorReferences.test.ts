/**
 * Cross-document `file.md#anchor` references inside `.qfai/assistant/**` were
 * validated by nothing.
 *
 * The assistant tree is held together by anchored citations — `SKILL.md`
 * delegates to `references/`, references cite rules, agents
 * cite skill sections. A partial `qfai init` refresh leaves half the tree at an
 * older revision, so a newer rule cites a section the older document in the
 * same tree does not contain. Nothing reported it: the tree looks complete, and
 * the dispatch that follows the citation arrives at a document with no such
 * section and proceeds on whatever the agent inferred.
 */

import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { validateProject } from "../../src/core/validate.js";
import {
  collectAnchorReferences,
  collectHeadingSlugs,
  slugifyHeading,
  validateAssistantAnchorReferences,
} from "../../src/core/validators/assistantAnchorReferences.js";
import { recordAssistantVersion } from "../helpers/assistantVersion.js";

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
    await recordAssistantVersion(root);
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

  it("slugs the rendered text of an inline link, not its source", () => {
    // GitHub ids the heading from what it renders. Stripping punctuation out of
    // the source line instead produced `installsetupmd`: a working
    // `guide.md#install` was reported dangling, and `#installsetupmd` — an
    // anchor that exists nowhere — passed.
    expect(slugifyHeading("[Install](setup.md)")).toBe("install");
    expect(slugifyHeading("[Install][setup] the tool")).toBe("install-the-tool");
    expect(slugifyHeading("![logo](logo.png) Overview")).toBe("overview");
  });
});

describe("collectHeadingSlugs", () => {
  it("ignores headings inside fenced code blocks", () => {
    const slugs = collectHeadingSlugs(
      ["# Real Heading", "", "```md", "## Fenced Heading", "```", "", "## Second"].join("\n"),
    );
    expect([...slugs].sort()).toEqual(["real-heading", "second"]);
  });

  it("numbers repeated headings the way GitHub disambiguates them", () => {
    // Without the suffixes a working `file.md#entry-1` citation is reported as
    // dangling, because only the bare `entry` was ever registered.
    const slugs = collectHeadingSlugs(["## Entry", "", "## Entry", "", "## Entry"].join("\n"));
    expect([...slugs].sort()).toEqual(["entry", "entry-1", "entry-2"]);
  });

  it("advances the suffix past a slug an earlier heading already took", () => {
    // `## Entry-1` owns `entry-1` outright, so the second `## Entry` lands on
    // `entry-2`. Counting each base on its own re-issued `entry-1` and left the
    // citation that does resolve, `file.md#entry-2`, reported as dangling.
    const slugs = collectHeadingSlugs(["## Entry-1", "", "## Entry", "", "## Entry"].join("\n"));
    expect([...slugs].sort()).toEqual(["entry", "entry-1", "entry-2"]);
  });

  it("closes a fence only on the same marker at the opening length or longer", () => {
    // A ```` ```` ```` block legally quotes a ```` ``` ```` sample inside
    // itself. Toggling on any fence line ended the outer block there and
    // re-exposed everything after it.
    const slugs = collectHeadingSlugs(
      ["````md", "```", "## Inner Sample", "```", "````", "", "## Real"].join("\n"),
    );
    expect([...slugs].sort()).toEqual(["real"]);
  });
});

describe("collectAnchorReferences", () => {
  it("reads the citing line number and skips fenced examples", () => {
    const references = collectAnchorReferences(
      [
        "See `rule/drift-protocol.md#drift-classes`.",
        "",
        "```md",
        "example/only.md#not-a-citation",
        "```",
      ].join("\n"),
    );
    expect(references).toEqual([
      { line: 1, targetPath: "rule/drift-protocol.md", anchor: "drift-classes" },
    ]);
  });

  it("leaves prose/column anchors alone — only GitHub slug shapes are citations", () => {
    // `tech.md#Test` names a table field, not a heading. An anchor
    // carrying uppercase can never be a GitHub slug, so it is out of scope.
    expect(collectAnchorReferences("`tech.md#Test` is the field.")).toEqual([]);
  });

  it("reads the whole fragment, not the slug-shaped prefix of one", () => {
    // Inside a code span the span closes the fragment, so a multi-word prose
    // reference stays out of scope instead of collapsing to `install`.
    expect(collectAnchorReferences("See `guide.md#install notes` for setup.")).toEqual([]);
    // In prose the first delimiter closes it, and `install.invalid` is not a
    // slug — passing it as `install` validated a citation that never resolves.
    expect(collectAnchorReferences("See guide.md#install.invalid (broken).")).toEqual([]);
  });

  it("reads an empty fragment at either edge of a code span", () => {
    // The boundary `codeSpans` documents as half-open. A `#` on the closing
    // backtick run leaves nothing behind it, and the prose branch stops on that
    // same backtick, so both readings of the interval agree here — pinned so a
    // later change to the predicate cannot quietly start scanning past the span.
    expect(collectAnchorReferences("see `guide.md#` for details")).toEqual([]);
    expect(collectAnchorReferences("``guide.md#`` doubled")).toEqual([]);
    // …while a fragment that does sit inside the span is still read whole.
    expect(collectAnchorReferences("see `guide.md#install` for details")).toEqual([
      { line: 1, targetPath: "guide.md", anchor: "install" },
    ]);
  });

  it("keeps a bare-prose citation that trailing sentence punctuation follows", () => {
    expect(collectAnchorReferences("Classify per rule/drift.md#core-rule.")).toEqual([
      { line: 1, targetPath: "rule/drift.md", anchor: "core-rule" },
    ]);
  });

  it("keeps reading citations after a fence that quotes a shorter fence", () => {
    const references = collectAnchorReferences(
      ["````md", "```", "example/only.md#not-a-citation", "```", "````", "", "`real.md#kept`"].join(
        "\n",
      ),
    );
    expect(references).toEqual([{ line: 7, targetPath: "real.md", anchor: "kept" }]);
  });
});

describe("validateAssistantAnchorReferences", () => {
  it("reports a citation whose target document has no such heading", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/rule/test-layers.md": ["# Test layers", "", "## Vocabulary", ""].join(
          "\n",
        ),
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Derive the Layer per `rule/test-layers.md#layer-derivation-procedure-normative`.",
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
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "## Layer derivation procedure (normative)",
          "",
        ].join("\n"),
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Derive the Layer per `rule/test-layers.md#layer-derivation-procedure-normative`.",
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
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "## Parallelization policy",
          "",
        ].join("\n"),
        ".qfai/assistant/skill/qfai-implement/SKILL.md": ["# qfai-implement", ""].join("\n"),
        ".qfai/assistant/skill/qfai-implement/references/checkpoint-verification.md": [
          "# Checkpoint verification",
          "",
          "Honor `SKILL.md#parallelization-policy`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.file).toContain("checkpoint-verification.md");
      },
    );
  });

  it("resolves a repo-root-relative citation as well as a file-relative one", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/rule/drift-protocol.md": [
          "# Drift protocol",
          "",
          "## Drift classes",
          "",
        ].join("\n"),
        ".qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md": [
          "# Decisions",
          "",
          "Classify per `.qfai/assistant/rule/drift-protocol.md#drift-classes`.",
          "Then per `rule/drift-protocol.md#drift-classes`.",
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
    // Project contracts live outside the assistant tree. Anchor integrity
    // across the assistant tree is this rule's scope;
    // the existence of a project artifact is not.
    await withAssistantTree(
      {
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `03_contract/tech.md#standard-commands-copy-paste` for the project commands.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("accepts a citation to the second heading that slugs the same as the first", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/rule/workflow.md": ["# Workflow", "", "## Entry", "", "## Entry", ""].join(
          "\n",
        ),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `rule/workflow.md#entry-1`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("does not resolve a bare citation onto a template standing in for a consumer file", async () => {
    // `templates/04_Sources.md` is instantiated into the consumer's discussion
    // pack, so `04_Sources.md#trend-scan` names the consumer's copy. Binding it
    // to the template validated a citation against a document the consumer
    // never sees, and made template headings govern consumer-owned references.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-discussion/templates/04_Sources.md": [
          "# Sources",
          "",
          "## Evidence table",
          "",
        ].join("\n"),
        ".qfai/assistant/skill/qfai-discussion/references/ui-bearing-playbook.md": [
          "# UI-bearing playbook",
          "",
          "Record freshness at `04_Sources.md#trend-scan`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("reports a citation into the assistant tree whose document is not there", async () => {
    // A path spelled from the repository root into `.qfai/assistant/**` can
    // only be QFAI's own document, so an absent one is drift, not the
    // consumer-owned ambiguity the rule declines to judge. Skipping it let an
    // instruction nobody can follow pass in every profile.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Classify per `.qfai/assistant/rule/missing.md#drift-classes`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.rule).toBe("assistantAnchorReferences.missingTarget");
        expect(issues[0]?.loc?.line).toBe(3);
        expect(issues[0]?.message).toContain("missing.md");
      },
    );
  });

  it("reports a relative citation into the tree whose document is not there", async () => {
    // `references/` under this skill is part of the tree, so the citation names
    // a document QFAI owns however it is spelled. Re-reading it from the
    // repository root alone put `/references/missing.md` outside the tree, and
    // a reference file deleted or renamed out from under its SKILL passed in
    // silence — the one drift this rule exists to catch.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Follow `references/missing.md#rule`.",
          "",
        ].join("\n"),
        ".qfai/assistant/skill/qfai-sdd/references/present.md": ["# Present", ""].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.rule).toBe("assistantAnchorReferences.missingTarget");
        expect(issues[0]?.loc?.line).toBe(3);
        expect(issues[0]?.message).toContain("references/missing.md");
      },
    );
  });

  it("stays silent on a relative citation whose directory the tree does not hold", async () => {
    // `03_contract/tech.md` is the consumer's contract, written relative the
    // same way. Nothing under the tree is called `03_contract/`, from any resolution base,
    // which is what tells the two apart.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-implement/SKILL.md": [
          "# qfai-implement",
          "",
          "Read commands in `03_contract/tech.md#standard-commands-copy-paste`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("stays silent when an absent cited path is the consumer's own artifact", async () => {
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Record it in `.qfai/spec/BF-0001/01_flow.md#requirements`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("does not bind a bare name whose case a case-sensitive checkout would reject", async () => {
    // `Workflow.md` never resolves to `workflow.md` on Git/GitHub or on any
    // case-sensitive filesystem. Folding the basename bound it anyway and
    // validated the citation against a document the consumer cannot reach.
    await withAssistantTree(
      {
        ".qfai/assistant/rule/workflow.md": ["# Workflow", "", "## Entry", ""].join("\n"),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `Workflow.md#no-such-heading`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("does not treat the parent of a relocated skills root as the assistant tree", async () => {
    // `paths.skillsDir: skills` puts the parent at the repository root. Walking
    // it read every spec, README and user document as assistant tree, and a
    // `README.md#missing` that is nobody's business here became an error.
    await withAssistantTree(
      {
        "qfai.config.yaml": ["paths:", "  skillsDir: skills", ""].join("\n"),
        "README.md": ["# Project", "", "See `README.md#missing-section`.", ""].join("\n"),
        "skills/qfai-sdd/SKILL.md": ["# qfai-sdd", "", "## Entry", ""].join("\n"),
        "skills/qfai-sdd/references/notes.md": ["# Notes", "", "See `SKILL.md#entry`.", ""].join(
          "\n",
        ),
      },
      async (root) => {
        expect(await run(root)).toEqual([]);
      },
    );
  });

  it("reads citations out of a YAML assistant file", async () => {
    // A YAML assistant file may carry a citation in block text.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-atdd/SKILL.md": ["# qfai-atdd", "", "## Entry", ""].join("\n"),
        ".qfai/assistant/agent/custom-card.yml": [
          "agents:",
          "  - id: qa-gatekeeper",
          "    developer_instructions: |",
          "      Follow `.qfai/assistant/skill/qfai-atdd/SKILL.md#entry`.",
          "      Then `.qfai/assistant/skill/qfai-atdd/SKILL.md#no-such-heading`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
        expect(issues[0]?.rule).toBe("assistantAnchorReferences.dangling");
        expect(issues[0]?.file).toBe(".qfai/assistant/agent/custom-card.yml");
        // The line of the YAML document the operator opens.
        expect(issues[0]?.loc?.line).toBe(5);
      },
    );
  });

  it("does not let a citation resolve to a YAML file", async () => {
    // Only `.md` targets are citable, so YAML is a citing file and never
    // a cited one. It stays out of the basename fallback for the same reason.
    await withAssistantTree(
      {
        ".qfai/assistant/agent/custom-card.yml": ["profiles: []", ""].join("\n"),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `custom-card.yml#profiles`.",
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
        ".qfai/assistant/skill": "not a directory\n",
        ".qfai/assistant/rule/workflow.md": ["# Workflow", ""].join("\n"),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `rule/workflow.md#concurrency-stage-independent-mandatory`.",
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

describe("the read boundary", () => {
  // The walk followed every link it met and read whatever the link named: a
  // linked directory or document reaching out of the assistant tree had its
  // contents indexed and its citations held to this rule, and a link to a FIFO
  // stopped the run in `readFile` with no finding and no exit. Only what
  // resolves inside the tree is read, and only as a bounded regular file.

  /** A document outside the tree whose citation would be reported if it were read. */
  const OUTSIDE_DOCUMENT = [
    "# Outside notes",
    "",
    "See `.qfai/assistant/rule/workflow.md#no-such-section`.",
    "",
  ].join("\n");

  const TREE = {
    ".qfai/assistant/rule/workflow.md": ["# Workflow", "", "## Stages", ""].join("\n"),
    "vendor/outside/notes.md": OUTSIDE_DOCUMENT,
  };

  const DIRECTORY_LINK = process.platform === "win32" ? "junction" : "dir";

  it("does not descend a linked directory that resolves outside the tree", async () => {
    await withAssistantTree(TREE, async (root) => {
      await symlink(
        path.join(root, "vendor", "outside"),
        path.join(root, ".qfai", "assistant", "rule", "linked"),
        DIRECTORY_LINK,
      );
      expect(await run(root)).toEqual([]);
    });
  });

  it("does not read a linked document that resolves outside the tree", async () => {
    await withAssistantTree(TREE, async (root) => {
      await symlink(
        path.join(root, "vendor", "outside", "notes.md"),
        path.join(root, ".qfai", "assistant", "rule", "notes.md"),
        "file",
      );
      expect(await run(root)).toEqual([]);
    });
  });

  it("still reads a tree that is itself linked in from elsewhere", async () => {
    // Vendoring the whole tree by link is a layout a project may choose: the
    // boundary is where the tree resolves to, not the path that names it.
    await withAssistantTree(
      {
        "vendor/assistant/rule/workflow.md": ["# Workflow", ""].join("\n"),
        "vendor/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `rule/workflow.md#no-such-section`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        await rm(path.join(root, ".qfai", "assistant"), { recursive: true, force: true });
        await symlink(
          path.join(root, "vendor", "assistant"),
          path.join(root, ".qfai", "assistant"),
          DIRECTORY_LINK,
        );
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
      },
    );
  });

  it("skips a linked document that is not a regular file and keeps walking", async (ctx) => {
    await withAssistantTree(
      {
        ".qfai/assistant/rule/workflow.md": ["# Workflow", ""].join("\n"),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "See `rule/workflow.md#no-such-section`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const fifo = path.join(root, ".qfai", "assistant", "rule", "pipe");
        // On Windows `mkfifo` may exist yet make a FIFO this process cannot
        // see, so the fixture is verified rather than the exit status.
        spawnSync("mkfifo", [fifo]);
        const planted = await lstat(fifo).then(
          (stats) => stats.isFIFO(),
          () => false,
        );
        if (!planted) ctx.skip(); // no FIFO this process can see — nothing to assert
        await symlink(fifo, path.join(root, ".qfai", "assistant", "rule", "pipe.md"), "file");
        const issues = await run(root);
        expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-002"]);
      },
    );
  });

  it("refuses a document in the tree too large to read within the ceiling", async () => {
    // Skipping it would drop every heading it holds, and each citation into it
    // would then pass or fail against a document nobody read.
    await withAssistantTree(
      {
        ".qfai/assistant/rule/workflow.md": `# Workflow\n\n${"x".repeat(8 * 1024 * 1024)}\n`,
      },
      async (root) => {
        await expect(run(root)).rejects.toThrow(/workflow\.md/);
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
        ".qfai/assistant/rule/drift-protocol.md": ["# Drift protocol", ""].join("\n"),
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": [
          "# qfai-sdd",
          "",
          "Classify per `rule/drift-protocol.md#drift-classes`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const result = await validateProject(root, undefined, { profile });
        expect(result.issues.map((entry) => entry.code)).toContain("QFAI-LINK-002");
      },
    );
  });

  it("still reports QFAI-LINK-002 when structural damage short-circuits the profile", async () => {
    // A canonical agent replaced by a directory makes the tree `full` opens
    // unwalkable, so the run stops after `QFAI-LINK-001`. The anchor walk
    // tolerates that damage and already has its finding on the intact half of
    // the tree; withholding it until LINK-001 is repaired would break the
    // "every profile" contract this rule is written to.
    await withAssistantTree(
      {
        ".qfai/assistant/skill/qfai-sdd/SKILL.md": ["# qfai-sdd", ""].join("\n"),
        ".qfai/assistant/agent/README.md": "# readme\n",
        // The document the roster names, replaced by a directory.
        ".qfai/assistant/agent/implementation-reviewer.md/.keep": "",
        // Enough of a surface that init counts as having run here.
        ".qfai/waivers.yml": "version: 1\nwaivers: []\n",
        ".qfai/assistant/rule/drift-protocol.md": ["# Drift protocol", ""].join("\n"),
        ".qfai/assistant/rule/test-layers.md": [
          "# Test layers",
          "",
          "Classify per `rule/drift-protocol.md#drift-classes`.",
          "",
        ].join("\n"),
      },
      async (root) => {
        const result = await validateProject(root, undefined, { profile: "full" });
        const codes = result.issues.map((entry) => entry.code);
        expect(codes).toContain("QFAI-LINK-001");
        expect(codes).toContain("QFAI-LINK-002");
      },
    );
  });
});

describe("the shipped assistant tree", () => {
  // The rule is only a gate if the tree QFAI ships passes it, and the tree QFAI
  // ships is `packages/qfai/assets/init/**` — the repository's own
  // `.qfai/assistant/**` is the installed mirror of it. Checking the mirror
  // alone let a broken citation that had only reached the packaged source pass
  // until the next `sync:ssot`, which is exactly the window this guards.
  const roots: ReadonlyArray<readonly [string, string]> = [
    ["the packaged init assets", getInitAssetsDir()],
    ["the repository's installed mirror", path.resolve(__dirname, "..", "..", "..", "..")],
  ];

  it.each(roots)("has no dangling anchored cross-reference in %s", async (_label, root) => {
    const { config } = await loadConfig(root);
    const issues = await validateAssistantAnchorReferences(root, config);
    expect(issues.map((entry) => `${entry.file ?? ""}: ${entry.message}`)).toEqual([]);
  });
});
