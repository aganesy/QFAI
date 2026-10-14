import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { prepareGraphIntegration, renderGraphPreparation } from "../packages/qfai/dist/index.mjs";

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const result = await prepareGraphIntegration(root);
    process.stdout.write(renderGraphPreparation(result, result.hosts) + "\n");
    for (const conflict of result.conflicts) process.stderr.write(conflict + "\n");
    if (result.failedStep) process.exitCode = 1;
  } catch (cause) {
    process.stderr.write(
      (cause instanceof Error ? cause.message : "Graph preparation failed.") + "\n",
    );
    process.exitCode = 1;
  }
}

await main();
