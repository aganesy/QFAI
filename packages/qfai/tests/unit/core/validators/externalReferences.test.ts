import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
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
        ".qfai/discussion/discussion-x/notes.md": "Cites `src/b.ts`.\n",
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
  it("counts no path anywhere in the decision and open-question trees", async () => {
    await inProject(
      {
        [decisions]:
          "| DEC-0001 | Note | - Evidence: file:x - Grounds: `src/core/c.ts` now owns it - Residual risk: none — kept - Rollback: none — kept | DONE |\n",
        ".qfai/spec/decisions/page-0001.md":
          "| DEC-0002 | Note | - Evidence: file:x - Residual risk: [the guide](docs/guide.md) may move | DONE |\n",
        ".qfai/spec/open-questions.md": "| OQ-0001 | Does `src/i.ts` stay? | - | TODO |\n",
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

  it("raises nothing when there is no story tree", async () => {
    await inProject({}, async (root) => {
      expect(await validateExternalReferences(root, defaultConfig)).toEqual([]);
    });
  });
});
