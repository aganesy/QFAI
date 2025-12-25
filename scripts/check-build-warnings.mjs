/* global process */
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["-C", "packages/qfai", "build"], {
  encoding: "utf-8",
});

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const patterns = [
  "empty-import-meta",
  '"import.meta" is not available with the "cjs" output format',
];

const hits = patterns.filter((pattern) => output.includes(pattern));
if (hits.length > 0) {
  process.stderr.write(
    ["Build warnings detected:", ...hits.map((hit) => `- ${hit}`)].join("\n") +
      "\n",
  );
  process.exit(1);
}
