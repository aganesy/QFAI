// QFAI:AC-0001-0233-05

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";

describe("AC-0001-0233-05", () => {
  it("previews new and upgraded projects without writes or process calls", async () => {
    for (const upgraded of [false, true]) {
      const project = await graphProject();
      try {
        const notes = path.join(project.root, ".qfai", "project-notes.md");
        if (upgraded) {
          await mkdir(path.dirname(notes));
          await writeFile(notes, "Original project notes\n");
        }
        const before = (await readdir(project.root, { recursive: true })).sort();
        const output = await project.initialize(true);
        expect((await readdir(project.root, { recursive: true })).sort()).toEqual(before);
        expect(project.fixture.calls).toEqual([]);
        expect(output).toContain("Graph tools preview");
        expect(output).toContain("Planned actions");
        expect(output).toContain(
          "Preview only. No files, downloads, analysis or processes were changed.",
        );
        expect(output).not.toContain("CodeGraph: installed");
        if (upgraded) expect(await readFile(notes, "utf8")).toBe("Original project notes\n");
      } finally {
        await project.dispose();
      }
    }
  });
});
