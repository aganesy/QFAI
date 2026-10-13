# Codex Cloud dependency preparation

Read before configuring an environment-owned Install script or Start skill, or
when a fresh checkout cannot pass the canonical launcher preflight. Init writes
the preparation entry and this guide; it performs no installation or host setup.

## Before execution

Review the project-declared executable, separate argv and absolute checkout cwd.
Read the declared Install command from the project's Standard commands; translate
it into a reviewed native executable and arguments before configuration. The entry
does not parse Markdown, shell text or choose a package manager.

Covered authority for the command and its lifecycle scripts must already exist.
Preserve network, secret, trust and publication permissions. A generated file,
invocation or flag grants no authority. Missing authority blocks execution.
Review argument and output contents before retaining or sharing them.

## Install script

Use the generated entry with the reviewed tuple:

```text
node .qfai/assistant/skill/qfai-run/scripts/codex-cloud-install.mjs --cwd <absolute-checkout> -- <executable> [argument...]
```

Replace the placeholders with the reviewed values and configure the host's
supported Install script. The executable and arguments are passed with no shell
parsing at the explicit cwd. Do not supply an entire shell command as one argument.
Do not use a parent, remote or cached command as a substitute.

Missing inputs, an unknown option, a relative cwd or an unreadable target directory
fail before installation. Unavailable tools, spawn errors, signals, nonzero exit
and observed timeout remain failed preparation. Retain the actual reason; there
is no automatic retry, extra timeout option or new deadline.

After successful installation the entry checks the same cwd for its local
`node_modules/.bin/qfai`, or a root `.pnp.cjs` / `.pnp.loader.mjs` marker with a
declared qfai dependency and native `yarn exec qfai --help` exiting 0. A failed
installation stays failed even if a launcher already exists. A Windows wrapper
that cannot start natively remains a tool failure; no shell fallback is added.

## Start skill

Check successful preparation and the canonical proof at the same reviewed cwd
before dependent planning. Failure or missing covered authority blocks planning;
report the actual blocker and owner required to resume. The entry starts no plan.
Use the launcher that the existing canonical preflight established for that target.
Preparation is neither global validation nor formal workflow completion.

## Environment setup

Confirm current environment support for the Install script and Start skill before
real configuration. The operator performs authorized setup and publication;
init and the generated entry do not register an account or configure the host.

Saving configuration, preparing and publishing a filesystem for new tasks are
distinct operations. A refresh does not rerun installation or startup. Existing
tasks retain their own state. Confirm the actual host behavior before claiming
that preparation or a Start skill ran for a task; changing a local file is not
evidence of a published environment or a new task using it.

## Reminders and trust

Existing reminder-only exit-0 behavior stays unchanged. Project-edited hook groups
keep their existing merge behavior. Keep linked-path refusals, unreadable-file warnings and hook
review. Preparation does not grant hook trust. No universal SessionStart installer
is added, and reminder hooks do not perform this installation.

## Evidence limits

Distinguish generated assets, controlled native CI and actual Cloud configuration,
publication or task execution. Retain reviewed command and argv, cwd, actual exit
or signal, and canonical result without exposing secrets. A failed or interrupted
run is not ready; missing outcomes remain unknown.

Controlled native fixtures cannot prove host lifecycle or startup execution.
Actual Cloud setup and execution remain unobserved without their own receipts.
Keep existing workflow gates, trust and independent review; preparation replaces
none of them.
