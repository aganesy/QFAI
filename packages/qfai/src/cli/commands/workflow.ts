import { readFile } from "node:fs/promises";
import path from "node:path";

import { planOf, refusal, type PlanDocument } from "../../core/workflow/plan.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

// The one operation, as `npx qfai workflow --help` or `-h` prints it. Help and the version
// (`--version` or `-V`) are the outputs that are not a JSON document.
export const WORKFLOW_HELP = [
  "plan --in <path|->   Print the route plan for the request extraction in the file, or on stdin",
  "plan --route <route> Print the plan of the named route",
].join("\n");

export interface WorkflowOptions {
  root: string;
  inPath?: string;
  route?: string;
}

// Every invocation but help (`--help`, `-h`) and version (`--version`, `-V`) prints exactly one
// JSON document on stdout.
export function emitPlanDocument(document: PlanDocument): number {
  process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
  if (document.ok) return EXIT_CODES.ok;
  const unreadable = document.reasons.some(
    (each) => each.reason === "plan-invalid" || each.reason === "io-error",
  );
  return unreadable ? EXIT_CODES.findings : EXIT_CODES.inputError;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

type Read = { ok: true; value: unknown } | { ok: false; document: PlanDocument };

// The extraction `--in` names, read from the file or from standard input and parsed as JSON.
async function readExtraction(root: string, inPath: string): Promise<Read> {
  let text: string;
  try {
    text = inPath === "-" ? await readStdin() : await readFile(path.resolve(root, inPath), "utf8");
  } catch {
    const message = "The input file cannot be read, so check the path and try again.";
    return { ok: false, document: refusal(message, [{ reason: "io-error", subject: inPath }]) };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    const message = "The input is not one JSON object, so fix it and try again.";
    return {
      ok: false,
      document: refusal(message, [{ reason: "invalid-input", subject: inPath }]),
    };
  }
}

// `npx qfai workflow plan`, given exactly one of `--in` and `--route`.
export async function runWorkflowPlan(options: WorkflowOptions): Promise<number> {
  if (options.route !== undefined) {
    return emitPlanDocument(await planOf(options.root, { route: options.route }));
  }
  const read = await readExtraction(options.root, options.inPath ?? "-");
  if (!read.ok) return emitPlanDocument(read.document);
  return emitPlanDocument(await planOf(options.root, { extraction: read.value }));
}
