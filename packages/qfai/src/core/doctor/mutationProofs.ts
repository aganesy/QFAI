import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readStoryTests } from "../validators/storyTreeObligations.js";

/**
 * A mutation proof written under an example's annotation:
 * `// Mutation: <path> \`<original>\` -> \`<substitute>\` fails <assertion>`.
 */
const PROOF_LINE = /^\s*(?:\/\/|#|\*)\s*Mutation:\s*(\S+)\s+`([^`]+)`\s*->\s*`([^`]*)`\s+fails\s+(.+)$/;

export type MutationProofsCheck = {
  id: "tests.mutationProofs";
  severity: "ok" | "warning";
  title: string;
  message: string;
  details: { stale: { test: string; line: number; target: string; original: string }[] };
};

type Proof = { test: string; line: number; target: string; original: string };

function proofsIn(test: string, content: string): Proof[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = PROOF_LINE.exec(line);
    if (!match) return [];
    return [{ test, line: index + 1, target: match[1] ?? "", original: match[2] ?? "" }];
  });
}

async function stillApplies(root: string, proof: Proof): Promise<boolean> {
  try {
    return (await readFile(path.resolve(root, proof.target), "utf8")).includes(proof.original);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Whether every mutation proof in the example tests still names code that
 * exists. A proof whose file is gone, or whose original text the file no
 * longer holds, can no longer be replayed, so the test it backs is unproven.
 * Returns `null` when no test carries a proof.
 */
export async function checkMutationProofs(
  root: string,
  config: QfaiConfig,
): Promise<MutationProofsCheck | null> {
  let read: Awaited<ReturnType<typeof readStoryTests>>;
  try {
    read = await readStoryTests(root, config);
  } catch {
    // An unusable test glob is the configuration check's to report; with no
    // test files to read there is no proof to check.
    return null;
  }
  const tests = read.files.filter((file) => file.selectedForExample);
  const proofs = tests.flatMap((file) =>
    proofsIn(path.relative(root, file.file).replace(/\\/g, "/"), file.content),
  );
  if (proofs.length === 0) return null;
  const stale: Proof[] = [];
  for (const proof of proofs) if (!(await stillApplies(root, proof))) stale.push(proof);
  const title = "Mutation proofs";
  if (stale.length === 0) {
    return {
      id: "tests.mutationProofs",
      severity: "ok",
      title,
      message: `${proofs.length} mutation proof(s) name code that still exists`,
      details: { stale },
    };
  }
  return {
    id: "tests.mutationProofs",
    severity: "warning",
    title,
    message:
      `${stale.length} mutation proof(s) name code that no longer exists: ` +
      stale.map((proof) => `${proof.test}:${proof.line} (${proof.target})`).join(", ") +
      ". Take the proof again against the current code and rewrite the comment.",
    details: { stale },
  };
}
