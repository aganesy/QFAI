export async function waitForCatalogueWriteHold(
  held: Promise<void>,
  writer: Promise<number>,
  stderr: readonly string[],
): Promise<void> {
  const code = await Promise.race([held, writer]);
  if (code === undefined) return;
  throw new Error(
    `Catalogue writer exited with code ${code} before reaching the held rename.\n${stderr.join("")}`.trimEnd(),
  );
}
