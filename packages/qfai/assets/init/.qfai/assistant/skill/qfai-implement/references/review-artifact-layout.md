# Review Artifact Layout

The stage is reviewed once, after its last step, over every example it implemented.
A review round uses one directory under .qfai/review/ named review-<17-digit timestamp>. It contains review_request.md, one RNN_<reviewer-id>.md per response, and summary.json.
Record the producer as implement and identify the BF ID, every EX ID the stage implemented, the evidence path, source revision, and requested reviewers in review_request.md.

summary.json uses the review artifact contract: version 2.0, created_at, producer, target, routing_profile, overall_status, reviewers, revision_form, and revision. A reviewer response records one Result and one Reviewed revision. A blocking REVISE is status FAIL in the summary. A round with no responses still receives a valid FAIL summary and an empty reviewers list.

Record the completed pack's path in the current round of each example it covers. The pack is not edited after its
summary is written. A corrected implementation starts another round of the examples it changed, and the stage
review runs again with a new directory and current evidence. Every required reviewer judges
the same final revision. The qa-gatekeeper observations for RED and GREEN are made per example as the proof is
taken and remain in the example evidence; the review pack records the completion, implementation, and applicable
product-surface verdicts.

The pack must be well formed before a PASS is claimed. A malformed pack fails validation. Use the full verify profile to check review packs in addition to the flow checkpoint.
