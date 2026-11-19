// QFAI:AC-0001-0234-01

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0234-01", () => {
  it("routes code exploration through the CLI and reads evidence before a specific document follow-up", async () => {
    const fixture = await documentAnalysisFixture();

    try {
      const reply = (
        await graphCliResult(
          fixture.root,
          ["code", "checkout callers and change impact"],
          fixture.run,
        )
      ).value;
      expect(JSON.stringify(reply)).toContain('"engine":"codegraph"');
      expect(JSON.stringify(reply)).toContain("checkout.ts");
      expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
      expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
      const calls = fixture.calls.length;
      expect(await readFile(path.join(fixture.root, "checkout.ts"), "utf8")).toContain(
        "function checkout",
      );
      expect(fixture.calls).toHaveLength(calls);
      const unresolved = "Which requirement explains checkout?";
      const next = await graphCliResult(fixture.root, ["documents", unresolved], fixture.run);
      expect(next.value).toMatchObject({ engine: "graphify", status: "answered" });
      const queries = fixture.calls.filter((call) => call.args.includes("query"));
      expect(queries).toHaveLength(1);
      expect(queries[0]?.args).toContain(unresolved);
      expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
    } finally {
      await fixture.dispose();
    }
  });
});
