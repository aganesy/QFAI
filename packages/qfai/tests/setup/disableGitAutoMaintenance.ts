/**
 * Stops git running background maintenance against the suite's fixture repositories.
 *
 * `git commit` runs `git maintenance run --auto --quiet`, and `gc.autoDetach` defaults to
 * true, so that process is detached and outlives the commit the test waited on. It writes
 * into `.git/objects/pack`. A test that removes its sandbox afterwards is then racing a
 * live writer:
 *
 * ```
 * ENOTEMPTY: directory not empty, rmdir '/tmp/qfai-git-changes-UMDJLR/.git/objects/pack'
 * ```
 *
 * `rm` unlinks a directory's contents and then removes the directory, so a file written
 * between those two steps fails the second one. `force: true` does not cover it: that
 * suppresses an already-absent directory, not a repopulated one.
 *
 * The failure lands on whichever change is under test, which is the expensive part — it
 * reads as an unexplained red on a branch that touches none of the code involved.
 *
 * ## Why the environment, rather than each fixture
 *
 * A spawned git inherits this process's environment, so setting the configuration here
 * reaches every git a test file starts, including the ones inside helpers, and every
 * fixture a later test adds. Twenty test files build a real repository today and eleven of
 * them remove it without retrying — a list nobody maintains, and the wrong thing to ask
 * each new test to remember.
 *
 * ## Why `maintenance.auto` and not `gc.auto`
 *
 * `gc.auto` decides what maintenance does once it has started. It does not decide whether
 * `git commit` starts it: under `gc.auto=0` the trace still carries
 * `run_command: git maintenance run --auto --quiet`. `maintenance.auto=false` removes the
 * invocation, and with it the writer.
 *
 * ## Why removing the writer, rather than retrying around it
 *
 * `tests/helpers/tempTree.ts` retries, for a cause outside the suite's control: Windows
 * releases a child process's handle asynchronously, and no correctness in a test prevents
 * that. This cause is inside the suite's control, and a retry budget still leaves a
 * window. The two compose rather than compete — a fixture repository that lives for one
 * test has no use for maintenance, and the helper still covers writers that are not git.
 */
import { appendGitConfig } from "../helpers/gitConfigEnv.js";

appendGitConfig(process.env, [["maintenance.auto", "false"]]);
