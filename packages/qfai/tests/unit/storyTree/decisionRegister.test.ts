import { describe, expect, it } from "vitest";

import { nextId } from "../../../src/core/storyTree/ids.js";
import { buildStoryTreeModel, nextStoryTreeId } from "../../../src/core/storyTree/tree.js";
import { validateStoryTreeStructureModel } from "../../../src/core/validators/storyTreeStructure.js";

const specs = "docs/spec";
const rootFile = `${specs}/decisions.md`;
const firstPage = `${specs}/decisions/page-0001.md`;
const secondPage = `${specs}/decisions/page-0002.md`;
const header =
  "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
const approach =
  "- Evidence: file:docs/source.md - Grounds: approved scope - Residual risk: bounded - Rollback: restore original bytes";
const row = (id: string, content = "Choice", status = "DONE", reason = "Keep"): string =>
  `| ${id} | ${content} | ${reason} | ${status} |\n`;

function index(pages: string[], tail = ""): string {
  return (
    header.replace(
      "## Decisions",
      `## Decision pages\n\n${pages.map((page) => `- ${page}`).join("\n")}\n\n## Decisions`,
    ) + tail
  );
}

function model(entries: [string, string][]) {
  return buildStoryTreeModel(new Map(entries), { specsDir: specs });
}

function recordFindings(tree: ReturnType<typeof model>) {
  return validateStoryTreeStructureModel(tree).filter((finding) =>
    ["QFAI-STORY-002", "QFAI-STORY-003", "QFAI-STORY-017"].includes(finding.code),
  );
}

describe("the complete decision register", () => {
  // QFAI:EX-0001-0053-24
  it("reads every legacy root row without rewriting an oversized document", () => {
    const raw =
      header +
      Array.from({ length: 496 }, (_, n) => row(`DEC-${String(n + 1).padStart(4, "0")}`)).join("");
    const files = new Map([[rootFile, raw]]);
    const tree = buildStoryTreeModel(files, { specsDir: specs });
    expect(tree.decisions?.rows).toHaveLength(496);
    expect(tree.decisions?.rows.at(-1)?.id).toBe("DEC-0496");
    expect(files.get(rootFile)).toBe(raw);
    expect(tree).toMatchObject({
      decisionRegisterErrors: [
        expect.objectContaining({
          file: rootFile,
          message: expect.stringMatching(/500|501|502/),
        }),
      ],
    });
  });

  // QFAI:EX-0001-0053-25
  it("keeps listed page order, root tail, four cells and physical raw origins", () => {
    const a = row("DEC-0002", "Test exception: AC-0001-0053-01", "DONE");
    const b = row("DEC-0001", "Test exception: EX-0001-0053-01", "WIP").replace(/\n$/, "\r\n");
    const c = row("DEC-0003", "Successor", "DONE");
    const tree = model([
      [firstPage, header + b],
      [secondPage, header + a],
      [rootFile, index(["decisions/page-0002.md", "decisions/page-0001.md"], c)],
    ]);
    expect(tree.decisions?.rows).toEqual([
      {
        id: "DEC-0002",
        content: "Test exception: AC-0001-0053-01",
        approach: "Keep",
        status: "DONE",
      },
      {
        id: "DEC-0001",
        content: "Test exception: EX-0001-0053-01",
        approach: "Keep",
        status: "WIP",
      },
      { id: "DEC-0003", content: "Successor", approach: "Keep", status: "DONE" },
    ]);
    expect(tree).toMatchObject({
      decisionFile: rootFile,
      decisionFiles: [secondPage, firstPage, rootFile],
      decisionOccurrences: [
        { raw: a, origin: { path: secondPage, actualRow: 7, rawOrdinal: 1 } },
        { raw: b, origin: { path: firstPage, actualRow: 7, rawOrdinal: 2 } },
        { raw: c, origin: { path: rootFile, actualRow: 12, rawOrdinal: 3 } },
      ],
    });
    expect(tree.decisions?.errors).toEqual([]);
  });

  // QFAI:EX-0001-0053-26
  it.each(["second page", "root"])(
    "reports a global duplicate in the %s without dropping either row",
    (place) => {
      const repeated = row("DEC-0001");
      const tree = model([
        [
          rootFile,
          index(
            ["decisions/page-0001.md", "decisions/page-0002.md"],
            place === "root" ? repeated : "",
          ),
        ],
        [firstPage, header + repeated],
        [secondPage, header + (place === "second page" ? repeated : "")],
      ]);
      expect(tree.decisions?.rows.filter(({ id }) => id === "DEC-0001")).toHaveLength(2);
      const duplicate = recordFindings(tree).find((finding) =>
        /more than once|duplicate/i.test(finding.message),
      );
      expect(duplicate?.severity).toBe("error");
      expect(JSON.stringify(duplicate)).toContain(firstPage);
      expect(JSON.stringify(duplicate)).toContain(place === "root" ? rootFile : secondPage);
    },
  );

  // QFAI:EX-0001-0053-27
  it("refuses a partial register and a partial maximum when a listed page is missing", () => {
    const tree = model([
      [rootFile, index(["decisions/page-0001.md", "decisions/page-0002.md"], row("DEC-0001"))],
      [firstPage, header + row("DEC-0090")],
    ]);
    expect(tree).toMatchObject({
      decisionRegisterErrors: [
        expect.objectContaining({
          file: secondPage,
          message: expect.stringMatching(/missing|read|absent/i),
        }),
      ],
    });
    expect(tree.decisions?.rows ?? []).toEqual([]);
    expect(() => nextStoryTreeId(tree, "DEC")).toThrow(/page-0002|incomplete|register|read/i);
  });

  // QFAI:EX-0001-0053-28
  it.each(["unlisted page", "unlisted Markdown", "duplicate list"])(
    "rejects %s instead of discovering or collapsing history",
    (fault) => {
      const pages =
        fault === "duplicate list"
          ? ["decisions/page-0001.md", "decisions/page-0001.md"]
          : ["decisions/page-0001.md"];
      const entries: [string, string][] = [
        [rootFile, index(pages)],
        [firstPage, header],
      ];
      if (fault !== "duplicate list")
        entries.push([
          fault === "unlisted page" ? secondPage : `${specs}/decisions/notes.md`,
          header,
        ]);
      const tree = model(entries);
      expect(tree).toMatchObject({
        decisionRegisterErrors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/unlisted|duplicate|twice/i) }),
        ]),
      });
      expect(tree.decisions?.rows ?? []).toEqual([]);
    },
  );

  // QFAI:EX-0001-0053-29
  it.each([
    "/outside/page-0001.md",
    "../outside.md",
    "decisions\\page-0001.md",
    "decisions/wrong.md",
  ])("rejects the unsafe direct-page entry %s", (entry) => {
    const tree = model([
      [rootFile, index([entry])],
      [firstPage, header + row("DEC-0099")],
    ]);
    expect(tree).toMatchObject({
      decisionRegisterErrors: expect.arrayContaining([
        expect.objectContaining({
          file: rootFile,
          message: expect.stringMatching(/page|path|entry|direct/i),
        }),
      ]),
    });
    expect(tree.decisions?.rows ?? []).toEqual([]);
  });

  // QFAI:EX-0001-0053-30
  it.each([499, 500, 501])(
    "counts %i physical lines including headings, blanks and comments",
    (lines) => {
      const raw = header + row("DEC-0001") + "<!-- retained comment -->\n" + "\n".repeat(lines - 8);
      for (const paged of [false, true]) {
        const file = paged ? firstPage : rootFile;
        const tree = model(
          paged
            ? [
                [rootFile, index(["decisions/page-0001.md"])],
                [file, raw],
              ]
            : [[file, raw]],
        );
        expect(tree.decisions?.rows).toHaveLength(1);
        if (lines <= 500) expect(tree).toMatchObject({ decisionRegisterErrors: [] });
        else
          expect(tree).toMatchObject({
            decisionRegisterErrors: expect.arrayContaining([
              expect.objectContaining({ file, message: expect.stringMatching(/501|500/) }),
            ]),
          });
      }
    },
  );

  // QFAI:EX-0001-0053-31
  it.each([
    ["fifth cell", "| DEC-0001 | Choice | Keep | DONE | extra |\n", /cells|column/i],
    ["invalid Status", row("DEC-0001", "Choice", "ACCEPTED"), /Status/],
    ["malformed Approach", row("DEC-2099", "Choice", "DONE", "Keep"), /Evidence|Grounds/],
    ["missing successor", row("DEC-0001", "Choice", "SUPERSEDED (by DEC-0002)"), /DEC-0002/],
  ])("keeps the %s finding at its physical page", (_name, raw, problem) => {
    const tree = model([
      [rootFile, index(["decisions/page-0001.md"])],
      [firstPage, header + String(raw)],
    ]);
    const findings = recordFindings(tree);
    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: firstPage,
        message: expect.stringMatching(problem),
      }),
    );
    expect(tree).toMatchObject({
      decisionOccurrences: [
        expect.objectContaining({ origin: { path: firstPage, actualRow: 7, rawOrdinal: 1 } }),
      ],
    });
  });

  // QFAI:EX-0001-0008-27
  it("allocates beyond historical live and retired numbers and observed claims without filling gaps", () => {
    const tree = model([
      [rootFile, index(["decisions/page-0001.md"], row("DEC-0001"))],
      [
        firstPage,
        header + row("DEC-0090", "Retired AC-0001-0001-98 and EX-0001-0001-99", "DONE", approach),
      ],
    ]);
    expect(nextStoryTreeId(tree, "DEC")).toBe("DEC-0091");
    expect(nextStoryTreeId(tree, "AC", "US-0001-0001")).toBe("AC-0001-0001-99");
    expect(() => nextStoryTreeId(tree, "EX", "US-0001-0001")).toThrow(/exhausted.*US-0001-0001/i);
    const claims = [nextStoryTreeId(tree, "DEC"), "DEC-0095"];
    expect(nextId("DEC", [...tree.declarations.map(({ id }) => id), ...claims])).toBe("DEC-0096");
  });
});
