# Review Artifact Layout

A review round uses one directory under .qfai/review/ named review-<17-digit timestamp>. It contains review_request.md, one RNN_<reviewer-id>.md per response, and summary.json. Record the producer as implement and identify the BF ID, EX ID, evidence path, source revision, and requested reviewers in review_request.md.

summary.json uses the review artifact contract: version 2.0, created_at, producer, target, routing_profile, overall_status, reviewers, revision_form, and revision. A reviewer response records one Result, Reviewed revision, and Audited evidence hash. A blocking REVISE is status FAIL in the summary. A round with no responses still receives a valid FAIL summary and an empty reviewers list.

Seal the completed pack and record its path and seal in the example evidence. The pack is immutable after sealing. A
corrected implementation starts another round with a new directory and current evidence. Every required reviewer judges
the same final revision. The qa-gatekeeper observations for RED and GREEN remain in the example evidence; the review
pack records the completion, implementation, and applicable product-surface verdicts.

The pack must be well formed before a PASS is claimed. A review directory absent on a fresh clone is evaluated through its committed verdict, revision, audited hash, path, and seal. A present malformed pack fails validation. Use the full verify profile to check review packs in addition to the flow checkpoint.
