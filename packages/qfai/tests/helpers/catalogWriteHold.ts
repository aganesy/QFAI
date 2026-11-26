export async function waitForCatalogueWriteHold(
  held: Promise<void>,
  writer: Promise<number>,
  stderr: readonly string[],
): Promise<void> {
  const finishedEarly = writer.then((code) => {
    throw new Error(
      `Catalogue writer exited with code ${code} before reaching the held rename.\n${stderr.join("")}`.trimEnd(),
    );
  });
  await Promise.race([held, finishedEarly]);
}
