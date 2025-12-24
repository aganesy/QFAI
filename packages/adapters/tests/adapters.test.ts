import assert from "node:assert/strict";
import test from "node:test";
import { access } from "node:fs/promises";

import { getAdaptersDir } from "../src/index.js";

test("getAdaptersDir points to templates directory", async () => {
  const dir = getAdaptersDir();
  await access(dir);
  assert.ok(dir.endsWith("templates"));
});
