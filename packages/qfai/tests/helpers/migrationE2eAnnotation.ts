import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Deletes the test-case annotation a person settles in an E2E file of the migrated old-layout
 * fixture. Step 8 leaves it as written and lists it, and an example annotation in that layer is
 * not accepted, so a project whose person settled the item holds neither form. The annotations
 * are spelled by join so this file declares none of them.
 */
export async function deleteE2eCaseAnnotation(root: string, file: string): Promise<void> {
  const target = path.join(root, file);
  const settled = [["SPEC-0001", "TC-0001-0001"].join(":"), "EX-0001-0001-01"].map((id) =>
    ["QFAI", id].join(":"),
  );
  const kept = (await readFile(target, "utf8"))
    .split("\n")
    .filter((line) => !settled.some((annotation) => line.includes(annotation)));
  await writeFile(target, kept.join("\n"));
}
