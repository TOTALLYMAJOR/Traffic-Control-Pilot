import assert from "node:assert/strict";
import test from "node:test";

import { runDemo } from "../src/demo.js";

test("the demonstration stops blind retry, escalates structure, and audits a superseding build", () => {
  const result = runDemo();

  assert.deepEqual(
    result.stages.map((stage) => stage.decision.action),
    ["PROPOSE_REPLAN", "REQUEST_RECONSIDER", "CONTINUE"],
  );
  assert.deepEqual(result.supersession, {
    from: result.contracts[0].binding.id,
    to: result.contracts[1].binding.id,
    authorityEffect: "HUMAN_APPROVED_REPLACEMENT",
  });
  assert.equal(result.receiptAudit.valid, true);
  assert.equal(result.replay.matchesOriginalDecisions, true);
});
