import assert from "node:assert/strict";
import test from "node:test";
import { access } from "node:fs/promises";

import { getTemplatesDir } from "../src/index.js";

test("getTemplatesDir points to templates directory", async () => {
  const dir = getTemplatesDir();
  await access(dir);
  assert.ok(dir.endsWith("templates"));
});
