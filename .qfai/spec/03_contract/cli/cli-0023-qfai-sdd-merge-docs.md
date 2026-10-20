# CLI-0023: `qfai sdd merge-docs`

## Ownership boundary

This contract decides which documents `qfai sdd merge-docs` merges, how it merges them, what it writes, and how it exits.

What a story-tree document must look like, and the `QFAI-DOCSCHEMA-001` finding a violation raises, are decided by the `qfai validate` contract (CLI-0014). This command runs that check and reinterprets none of its findings.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0023-0001 | `qfai sdd merge-docs` takes no argument besides `--root`. It merges only the Markdown and YAML files under the configured specs directory that the Git index holds as unmerged, and reads their base, ours and theirs versions from the index stages, so it works the same after a local merge and after a merge GitHub reported as conflicting. With no unmerged document it says there is nothing to merge, writes nothing and exits 0. An unmerged document whose working file holds no conflict marker is left unchanged. Outside a Git work tree, or with a configuration that has issues, it exits 2. | EX-0001-0238-04, EX-0001-0238-05 |
| BR-0023-0002 | A document is merged by line first. A region the line merge cannot settle is merged again: when every line in it is a table row, row by row, keyed by the row's first cell, so rows both sides added are both kept, ours first; otherwise sentence by sentence, splitting after sentence punctuation followed by a space and after each table cell separator. Each line keeps its own line, so a merge adds no line break inside a row. | EX-0001-0238-01, EX-0001-0238-02, EX-0001-0238-03 |
| BR-0023-0003 | A place the merge cannot settle is written as the whole lines it touches, in both versions, between the standard `<<<<<<< ours`, `=======` and `>>>>>>> theirs` markers, and the rest of the document is merged. A document one side deleted, or one holding a line that reads as a merge marker, is left as it is and named. In each of these cases the command exits 1. | EX-0001-0238-06, EX-0001-0238-07 |
| BR-0023-0004 | The command writes the merged text to the working file and stages nothing. It then runs the document-schema check and reports each `QFAI-DOCSCHEMA-001` finding in a document it merged without conflict markers, and exits 1 when there is one. | EX-0001-0238-08 |
