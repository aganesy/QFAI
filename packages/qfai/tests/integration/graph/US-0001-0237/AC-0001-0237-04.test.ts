// QFAI:AC-0001-0237-04

import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { graphRuntimePaths } from "../../../../src/core/graph/prepare.js";
import { prepareGraphIntegration } from "../../../../src/core/graph/integration.js";
import { renderGraphPreparation } from "../../../../src/core/graph/presentation.js";

describe("AC-0001-0237-04", () => {
  it("keeps prior runtime bytes when replacement acquisition fails", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      const runtimes = graphRuntimePaths(project.root);
      await writeFile(runtimes.python, "Prior usable interpreter fixture\n");
      const priorCode = await readFile(runtimes.codegraph);
      const priorPython = await readFile(runtimes.python);
      const result = await prepareGraphIntegration(project.root, (command, args, options) => {
        if (command === runtimes.python) return Promise.resolve({ exitCode: 0, stdout: "0.9.85" });
        if (args[0] === "pip") return Promise.resolve({ exitCode: 1, stdout: "" });
        return project.fixture.run(command, args, options);
      });
      expect(await readFile(runtimes.python)).toEqual(priorPython);
      expect(await readFile(runtimes.codegraph)).toEqual(priorCode);
      expect(result.failedStep).toBe("Graphify download");
      expect(result.runtime).toBe("not-ready");
      expect(renderGraphPreparation(result, result.hosts)).toContain(
        "Previous installation: retained",
      );
    } finally {
      await project.dispose();
    }
  });
});
