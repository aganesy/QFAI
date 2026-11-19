import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { validateProject } from "../../../../src/core/validate.js";
import { validateExternalReferences } from "../../../../src/core/validators/externalReferences.js";

async function inProject(
  files: Record<string, string>,
  check: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-external-refs-"));
  try {
    for (const [relative, text] of Object.entries(files)) {
      const file = path.join(root, ...relative.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, text, "utf8");
    }
    await check(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const policy = ".qfai/spec/01_policy/principle.md";
const decisions = ".qfai/spec/decisions.md";
const contract = ".qfai/spec/03_contract/cli/cli-0001-example.md";

// QFAI:EX-0001-0051-10
describe("validateExternalReferences", () => {
  it("counts lines and files that name a path outside .qfai for each tree", async () => {
    await inProject(
      {
        [policy]:
          "Read `docs/guide.md`.\nAlso [the guide](docs/guide.md#top) and `docs/other.md:12`.\n",
        ".qfai/spec/01_policy/glossary.md": "See `docs/glossary.md`.\n",
        ".qfai/deliberation/20261113000000-notes.md": "Cites `src/b.ts`.\n",
      },
      async (root) => {
        const findings = await validateExternalReferences(root, defaultConfig);
        expect(
          findings.map(({ code, severity, message }) => ({ code, severity, message })),
        ).toEqual([
          {
            code: "QFAI-STORY-015",
            severity: "warning",
            message: "The policy tree has 3 lines in 2 files naming a path outside .qfai",
          },
        ]);
      },
    );
  });

  it("counts a contract document under its own tree", async () => {
    await inProject({ [contract]: "Source: `packages/x/y.ts`.\n" }, async (root) => {
      const findings = await validateExternalReferences(root, defaultConfig);
      expect(findings.map(({ message }) => message)).toEqual([
        "The contract tree has 1 line in 1 file naming a path outside .qfai",
      ]);
    });
  });

  it("raises nothing for a path under .qfai, a URL, a bare file name or a directory", async () => {
    await inProject(
      {
        [policy]: [
          "`.qfai/spec/03_contract/cli/cli-0001-example.md` and `https://example.com/a/b.md`",
          "`qfai.config.yaml`, `src/core/` and `cli/<name>`",
          "[sibling](01_policy/principle.md) and `01_policy/principle.md`",
          "[up](../spec/decisions.md)",
        ].join("\n"),
      },
      async (root) => {
        expect(await validateExternalReferences(root, defaultConfig)).toEqual([]);
      },
    );
  });

  // QFAI:EX-0001-0051-16
  it("counts no path in the decision and open-question trees or another spec-root document", async () => {
    await inProject(
      {
        [decisions]:
          "| DEC-0001 | Note | - Evidence: file:x - Grounds: `src/core/c.ts` now owns it - Residual risk: none — kept - Rollback: none — kept |\n",
        ".qfai/spec/decisions/page-0001.md":
          "| DEC-0002 | Note | - Evidence: file:x - Residual risk: [the guide](docs/guide.md) may move |\n",
        ".qfai/spec/open-questions.md": "| OQ-0001 | Does `src/i.ts` stay? | - |\n",
        ".qfai/spec/notes.md": "Cites `src/x.ts`.\n",
        [policy]: "Read `docs/need.md`.\n",
      },
      async (root) => {
        const findings = await validateExternalReferences(root, defaultConfig);
        expect(findings.map(({ message, file }) => [message, file])).toEqual([
          [
            "The policy tree has 1 line in 1 file naming a path outside .qfai",
            path.join(root, ...policy.split("/")),
          ],
        ]);
      },
    );
  });

  it("counts a relative link that leaves .qfai", async () => {
    await inProject({ [policy]: "[out](../../../src/a.ts)\n", "src/a.ts": "x\n" }, async (root) => {
      const findings = await validateExternalReferences(root, defaultConfig);
      expect(findings.map(({ message }) => message)).toEqual([
        "The policy tree has 1 line in 1 file naming a path outside .qfai",
      ]);
    });
  });

  // QFAI:EX-0001-0057-01
  it("counts only the files of the flows --flow names", async () => {
    const storyOf = (id: string) =>
      `.qfai/spec/02_business-flow/business-flow-${id}/user-story-${id}-0001/01_User-story.md`;
    const files: Record<string, string> = {};
    for (const id of ["0001", "0002", "0003"]) {
      files[`.qfai/spec/02_business-flow/business-flow-${id}/business-flow.md`] =
        `# BF-${id}: Flow ${id}\n`;
      files[storyOf(id)] = `# US-${id}-0001: Story\n\nRead \`docs/flow-${id}.md\`.\n`;
    }
    await inProject(files, async (root) => {
      const result = await validateProject(
        root,
        { config: defaultConfig, issues: [], configPath: path.join(root, "qfai.config.yaml") },
        { profile: "sdd", flowIds: ["BF-0002", "BF-0003"] },
      );
      const relative = (file: string) => path.relative(root, file).split(path.sep).join("/");
      expect(
        result.issues
          .filter((found) => found.code === "QFAI-STORY-015")
          .map((found) => ({
            message: found.message,
            file: relative(found.file ?? ""),
            relatedFiles: (found.relatedFiles ?? []).map(relative),
          })),
      ).toEqual([
        {
          message: "The business-flow tree has 2 lines in 2 files naming a path outside .qfai",
          file: storyOf("0002"),
          relatedFiles: [storyOf("0003")],
        },
      ]);
    });
  });

  it("raises nothing when there is no story tree", async () => {
    await inProject({}, async (root) => {
      expect(await validateExternalReferences(root, defaultConfig)).toEqual([]);
    });
  });
});
