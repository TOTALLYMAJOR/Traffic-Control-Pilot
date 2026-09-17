import assert from "node:assert/strict";
import test from "node:test";

import {
  computeEvidenceDelta,
  computeImpactDelta,
  fingerprintFailure,
  reduceExecutionEvents,
} from "../src/observations.js";

test("failure fingerprints ignore volatile values but retain material identity", () => {
  const first = fingerprintFailure({
    code: "TEST_FAILED",
    classification: "deterministic",
    validation: "unit:governor",
    signature: "HTTP status 401 at /tmp/run-123/governor.js:42:9",
    files: ["src/governor.js", "src/contracts.js"],
    requirementId: "REQ-7",
  });
  const repeated = fingerprintFailure({
    code: "TEST_FAILED",
    classification: "deterministic",
    validation: "unit:governor",
    signature: "HTTP status 401 at /tmp/run-999/governor.js:88:1",
    files: ["src/contracts.js", "src/governor.js"],
    requirementId: "REQ-7",
  });
  const different = fingerprintFailure({
    code: "TEST_FAILED",
    classification: "deterministic",
    validation: "unit:governor",
    signature: "HTTP status 500 at /tmp/run-888/governor.js:42:9",
    files: ["src/contracts.js", "src/governor.js"],
    requirementId: "REQ-7",
  });

  assert.equal(first, repeated);
  assert.notEqual(first, different);
});

test("event reduction enforces ownership for the task that changed a path", () => {
  const contract = {
    document: {
      tasks: [
        { id: "TASK-A", owns: ["src/a"] },
        { id: "TASK-B", owns: ["src/b"] },
      ],
      proof: { requiredEvidence: [] },
    },
  };

  const observation = reduceExecutionEvents(
    [
      {
        sequence: 1,
        type: "files.changed",
        taskId: "TASK-A",
        paths: ["src/a/owned.js", "src/b/not-owned-by-a.js"],
      },
    ],
    { contract },
  );

  assert.deepEqual(observation.impactDelta.unexpectedChangedPaths, [
    "src/b/not-owned-by-a.js",
  ]);
});

test("evidence recorded after a repeated failure updates the current learning delta", () => {
  const contract = {
    document: {
      tasks: [{ id: "TASK-A", owns: ["src"] }],
      proof: { requiredEvidence: [] },
    },
  };
  const failure = {
    code: "TEST_FAILED",
    classification: "deterministic",
    signature: "Expected true, received false",
    files: ["src/a.js"],
    retryable: false,
  };
  const observation = reduceExecutionEvents(
    [
      { sequence: 1, type: "validation.failed", failure },
      { sequence: 2, type: "validation.failed", failure },
      { sequence: 3, type: "validation.failed", failure },
      {
        sequence: 4,
        type: "evidence.recorded",
        items: ["cause:stale-fixture"],
      },
    ],
    { contract },
  );

  assert.equal(observation.failureRepeatCount, 3);
  assert.equal(observation.evidenceDelta.direction, "POSITIVE");
  assert.deepEqual(observation.evidenceDelta.newItems, ["cause:stale-fixture"]);
});

test("evidence delta distinguishes learning from repetition", () => {
  const previous = {
    items: ["failure:test"],
    satisfied: ["unit-tests"],
    contradictory: [],
  };

  assert.deepEqual(computeEvidenceDelta(previous, previous), {
    newItems: [],
    newlySatisfied: [],
    newContradictions: [],
    score: 0,
    direction: "ZERO",
  });
  assert.deepEqual(
    computeEvidenceDelta(previous, {
      items: ["failure:test", "cause:stale-fixture"],
      satisfied: ["unit-tests", "integration-tests"],
      contradictory: [],
    }),
    {
      newItems: ["cause:stale-fixture"],
      newlySatisfied: ["integration-tests"],
      newContradictions: [],
      score: 3,
      direction: "POSITIVE",
    },
  );
});

test("impact delta exposes unauthorized expansion and active-task collisions", () => {
  assert.deepEqual(
    computeImpactDelta({
      plannedPaths: ["src/governor", "test/governor.test.js"],
      actualChangedPaths: [
        "src/governor/engine.js",
        "apps/billing/payment.js",
      ],
      impactedPaths: ["src/governor/engine.js", "apps/billing/payment.js"],
      activeTaskCollisions: ["billing-migration"],
    }),
    {
      unexpectedChangedPaths: ["apps/billing/payment.js"],
      unexpectedImpactedPaths: ["apps/billing/payment.js"],
      activeTaskCollisions: ["billing-migration"],
      expanded: true,
    },
  );
});

test("impact delta uses AgentFlow repository-root ownership semantics", () => {
  assert.deepEqual(
    computeImpactDelta({
      plannedPaths: ["src/governor"],
      actualChangedPaths: ["src/governor/engine.js"],
      impactedPaths: ["src/governor/policy.js"],
      activeTaskCollisions: [],
    }),
    {
      unexpectedChangedPaths: [],
      unexpectedImpactedPaths: [],
      activeTaskCollisions: [],
      expanded: false,
    },
  );
});

test("event reduction counts repeated failures and captures zero evidence gain", () => {
  const contract = {
    document: {
      tasks: [{ owns: ["src"] }],
      proof: { requiredEvidence: ["unit-tests"] },
    },
  };
  const authority = {
    handoffId: "handoff-001",
    handoffSha256: "f".repeat(64),
    repositoryId: "totallymajor/example",
    baseCommit: "a".repeat(40),
    authoritySources: [],
    approvalAuthority: "HUMAN_OR_REPOSITORY",
  };
  const failure = {
    code: "TEST_FAILED",
    classification: "deterministic",
    validation: "unit:governor",
    signature: "expected CONTINUE, received PAUSE at line 77",
    files: ["src/governor.js"],
    requirementId: "REQ-7",
    retryable: false,
  };
  const events = [
    { sequence: 1, type: "authority.observed", authority },
    {
      sequence: 2,
      type: "execution.started",
      buildId: "build-1",
      maxAttempts: 4,
    },
    { sequence: 3, type: "attempt.started", attempt: 1 },
    { sequence: 4, type: "validation.failed", failure },
    { sequence: 5, type: "attempt.started", attempt: 2 },
    { sequence: 6, type: "validation.failed", failure },
    { sequence: 7, type: "attempt.started", attempt: 3 },
    { sequence: 8, type: "validation.failed", failure },
  ];

  const observation = reduceExecutionEvents(events, { contract });

  assert.equal(observation.failureRepeatCount, 3);
  assert.equal(observation.evidenceDelta.direction, "ZERO");
  assert.equal(observation.attempt, 3);
  assert.equal(observation.failure.fingerprint, fingerprintFailure(failure));
});

test("event reduction rejects duplicate sequence numbers", () => {
  const contract = {
    document: {
      tasks: [{ owns: ["src"] }],
      proof: { requiredEvidence: [] },
    },
  };

  assert.throws(
    () =>
      reduceExecutionEvents(
        [
          {
            sequence: 1,
            type: "execution.started",
            buildId: "build-1",
            maxAttempts: 2,
          },
          { sequence: 1, type: "attempt.started", attempt: 1 },
        ],
        { contract },
      ),
    /duplicate execution event sequence/i,
  );
});
