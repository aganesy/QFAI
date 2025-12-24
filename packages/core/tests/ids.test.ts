import assert from "node:assert/strict";
import test from "node:test";

import { extractIds } from "../src/ids.js";

test("extractIds returns unique ids by prefix", () => {
  const text = "SPEC-0001 BR-ORDER-001 BR-ORDER-001 SC-0001";
  assert.deepEqual(extractIds(text, "BR"), ["BR-ORDER-001"]);
  assert.deepEqual(extractIds(text, "SPEC"), ["SPEC-0001"]);
});
