#!/usr/bin/env node
import { run } from "./main.js";

run(process.argv.slice(2), process.cwd()).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
