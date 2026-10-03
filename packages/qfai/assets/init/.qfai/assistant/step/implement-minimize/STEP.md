---
name: implement-minimize
owner: qfai-implement
purpose: "Shrink the input that makes a program crash to the smallest one that still crashes the same way, without changing any tracked file."
requires: [common-steering-refresh, common-gate-run]
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
routing-profile: default
---

# implement-minimize

A crash came with the input that causes it: a file, a request, a program, a
sequence of calls. This step reduces that input until nothing more can be
removed.

## Passes when

Read first: the report and the reproduction it gives. The step passes when the
report holds no input to reduce, such as a defect with no crashing input or
trace, or when its reproduction is already one command or one input with
nothing left to remove. The pass names which of the two holds and the
reproduction, where there is one.

## Reads

- The report: the request, or the work order, with the input and the trace.
- The commands of `common-gate-run`.

## Procedure

1. Run the input and record the failure's signature: the error kind and the
   top frames of the trace. A smaller input that fails with another signature
   is a different failure.
2. Use a reducer the project or its toolchain already has, such as a fuzzer's
   minimiser or a test-case reducer, before reducing by hand.
3. Otherwise remove one part at a time: a line, a field, a call, a byte range.
   Keep a removal when the same signature still appears, and undo it when it
   does not.
4. Stop when removing any single remaining part loses the signature.

## What it writes

- The step changes no file git tracks, and the result names no changed file.
- The record under `.qfai/evidence/` holds the signature, the original and the
  minimal input, and the command that runs it. It is git-ignored and is named
  in `artifactRefs`. The test that keeps the input is written later, by the
  implement stage.

## Gate

The step is done when the minimal input reproduces the same signature, no
single part of it can be removed without losing it, and no tracked file
changed.
