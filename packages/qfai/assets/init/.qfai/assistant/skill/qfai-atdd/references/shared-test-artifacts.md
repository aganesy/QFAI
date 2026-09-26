# Shared acceptance-test artifacts

A fixture, snapshot or helper read by tests in several flows is part of each
test's proof subject. Record its path in the test manifest before taking RED
or falsifiability evidence. A change to that artifact makes each affected
flow's old proof stale, even if its test file has not changed.

Find every consumer by reading imports and fixture declarations, not by
assuming the editing flow owns the artifact. Rerun each affected selector
against the changed tree, retake its falsifiability proof where needed, and
record the new manifest, hash, command and result in that flow's evidence.
Where a consumer cannot be run, report it as an unresolved cross-flow
obligation. Do not claim the editing flow's completion as proof for another
flow, and do not alter an existing sealed review pack. A new review response
must address the changed proof subject.
