import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../src/lib/args.js";

test("parseArgs handles root and flags", () => {
  const result = parseArgs(["init", "--root", "C:/repo", "--force"], "C:/cwd");
  assert.equal(result.command, "init");
  assert.equal(result.options.root, "C:/repo");
  assert.equal(result.options.force, true);
});
