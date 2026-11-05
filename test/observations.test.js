import assert from "node:assert/strict";
import test from "node:test";

import { bindContract } from "../src/contracts.js";
import { evaluateGovernor, GOVERNOR_POLICY_V1 } from "../src/governor.js";
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

const nativeEvidenceType = "agentflow/native-task-validation-evidence";
const zeroEvidenceDelta = {
  newItems: [], newlySatisfied: [], newContradictions: [],
  score: 0, direction: "ZERO",
};

function nativeContract() {
  return bindContract({
    schemaVersion: "2.1.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-native-observation",
    createdAt: "2026-11-05T00:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40), snapshotSha256: "2".repeat(64),
      worktreeState: "clean", remote: "https://github.com/example/native.git",
    },
    objective: "Qualify native current-attempt observation correspondence",
    authority: {
      status: "APPROVED", approvedBy: "repository-owner",
      approvedAt: "2026-11-05T00:00:00.000Z",
      approvalReceipt: {
        kind: "proofloom/execution-approval-receipt",
        receiptId: `HAR-${"A".repeat(20)}`,
      },
      stateSha256: "3".repeat(64), governanceReportSha256: "4".repeat(64),
      sources: [{ path: "docs/intent.md", sha256: "1".repeat(64) }],
    },
    tasks: [{
      id: "NATIVE-001", title: "Validate current attempt",
      description: "Run the approved ordered validation commands.",
      estimateHours: 1, dependsOn: [], owns: ["src"],
      acceptanceCriteria: ["Current proof remains separate from history"],
      validate: ["npm test", "npm run check"],
      produces: [{ name: "focused tests", type: nativeEvidenceType, version: "1.0.0" }],
    }],
    proof: {
      requiredEvidence: ["focused tests"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
  });
}

function nativeStart(contract) {
  return [
    { type: "authority.observed", authority: {
      handoffId: contract.document.handoffId,
      handoffSha256: contract.binding.sha256,
      repositoryId: contract.document.repository.remote,
      baseCommit: contract.document.repository.baseCommit,
      snapshotSha256: contract.document.repository.snapshotSha256,
      worktreeState: contract.document.repository.worktreeState,
      authorityStateSha256: contract.document.authority.stateSha256,
      governanceReportSha256: contract.document.authority.governanceReportSha256,
      authoritySources: contract.document.authority.sources,
      approvalAuthority: "HUMAN_OR_REPOSITORY",
    } },
    { type: "execution.started", buildId: "native-build", maxAttempts: 4 },
    { type: "attempt.started", attempt: 1 },
  ];
}

function numbered(events) {
  return events.map((event, index) => ({ sequence: index + 1, ...event }));
}

function certificateSnapshot(digit, contradictory = []) {
  // Synthetic normalized input only; native authentication belongs to AgentFlow.
  return {
    type: "evidence.recorded", items: [digit.repeat(64)],
    satisfied: ["focused tests"], contradictory,
  };
}

function nativeFailure(signature = "Integration check failed") {
  return {
    code: "TEST_FAILED", classification: "deterministic",
    validation: "npm run check", signature, files: ["src/native.js"],
    retryable: false,
  };
}

test("native current evidence replaces snapshots while failures retain their own attempt", () => {
  const contract = nativeContract();
  const failure = nativeFailure();
  const events = numbered([
    ...nativeStart(contract),
    certificateSnapshot("a"),
    { type: "validation.passed" },
    { type: "validation.failed", failure },
    { type: "attempt.started", attempt: 2 },
    certificateSnapshot("b"),
    { type: "validation.passed" },
    { type: "validation.failed", failure },
    { type: "attempt.started", attempt: 3 },
    { type: "validation.passed" },
    certificateSnapshot("c"),
    { type: "execution.integrated" },
  ]);
  const reducePrefix = (length) => reduceExecutionEvents(events.slice(0, length), { contract });
  const action = (observation) => evaluateGovernor({
    contract, observation, policy: GOVERNOR_POLICY_V1,
  }).action;
  const firstSuccess = reducePrefix(5);
  assert.equal(firstSuccess.phase, "INTEGRATING");
  assert.deepEqual(firstSuccess.evidenceDelta, zeroEvidenceDelta);
  const firstFailure = reducePrefix(6);
  assert.equal(firstFailure.phase, "RUNNING");
  assert.equal(action(firstFailure), "REQUEST_REPAIR");
  const retry = reducePrefix(7);
  assert.equal(retry.failure, null);
  assert.equal(retry.failureRepeatCount, 0);
  assert.deepEqual(retry.evidence, { items: [], satisfied: [], contradictory: [] });
  assert.equal(action(retry), "CONTINUE");
  const repeated = reducePrefix(10);
  assert.equal(repeated.failureRepeatCount, 2);
  assert.deepEqual(repeated.evidence.items, ["b".repeat(64)]);
  assert.deepEqual(repeated.evidenceDelta, {
    newItems: ["b".repeat(64)], newlySatisfied: [], newContradictions: [],
    score: 1, direction: "POSITIVE",
  });
  const beforeCertificate = reducePrefix(12);
  assert.equal(beforeCertificate.phase, "INTEGRATING");
  assert.deepEqual(beforeCertificate.evidenceDelta, zeroEvidenceDelta);
  assert.equal(action(beforeCertificate), "BLOCK_INTEGRATION");
  const current = reducePrefix(13);
  assert.deepEqual(current.evidence, {
    items: ["c".repeat(64)], satisfied: ["focused tests"], contradictory: [],
  });
  assert.deepEqual(current.failureHistory, [
    { fingerprint: fingerprintFailure(failure), evidence: {
      items: ["a".repeat(64)], satisfied: ["focused tests"], contradictory: [],
    } },
    { fingerprint: fingerprintFailure(failure), evidence: {
      items: ["b".repeat(64)], satisfied: ["focused tests"], contradictory: [],
    } },
  ]);
  assert.deepEqual(current.evidenceDelta, {
    newItems: ["c".repeat(64)], newlySatisfied: ["focused tests"],
    newContradictions: [], score: 3, direction: "POSITIVE",
  });
  assert.equal(action(current), "CONTINUE");
  assert.equal(reducePrefix(14).phase, "INTEGRATED");
});

test("native success ignores bare evidenceId and an explicit empty snapshot revokes current proof", () => {
  const contract = nativeContract();
  const events = [
    ...nativeStart(contract),
    { type: "validation.passed", evidenceId: "focused tests" },
  ];
  const unverified = reduceExecutionEvents(numbered(events), { contract });
  assert.deepEqual(unverified.evidence.satisfied, []);
  assert.equal(evaluateGovernor({ contract, observation: unverified,
    policy: GOVERNOR_POLICY_V1 }).action, "BLOCK_INTEGRATION");
  const revoked = reduceExecutionEvents(numbered([
    ...events, certificateSnapshot("a"),
    { type: "evidence.recorded", items: [], satisfied: [], contradictory: [] },
  ]), { contract });
  assert.deepEqual(revoked.evidence, { items: [], satisfied: [], contradictory: [] });
});

test("native contradictions persist across retry and complete current snapshots", () => {
  const contract = nativeContract();
  const observation = reduceExecutionEvents(numbered([
    ...nativeStart(contract), certificateSnapshot("a", ["focused tests"]),
    { type: "validation.failed", failure: nativeFailure() },
    { type: "attempt.started", attempt: 2 },
    certificateSnapshot("b"), { type: "validation.passed" },
  ]), { contract });
  assert.deepEqual(observation.evidence, {
    items: ["b".repeat(64)], satisfied: ["focused tests"],
    contradictory: ["focused tests"],
  });
  assert.deepEqual(observation.evidenceDelta, {
    newItems: ["b".repeat(64)], newlySatisfied: ["focused tests"],
    newContradictions: ["focused tests"], score: 1, direction: "POSITIVE",
  });
  assert.equal(evaluateGovernor({ contract, observation,
    policy: GOVERNOR_POLICY_V1 }).ruleId, "required-evidence-contradicted");
});

test("native active failure uses the preceding matching fingerprint rather than the last failure", () => {
  const contract = nativeContract();
  const first = nativeFailure("Failure X");
  const other = nativeFailure("Failure Y");
  const observation = reduceExecutionEvents(numbered([
    ...nativeStart(contract), certificateSnapshot("a"),
    { type: "validation.failed", failure: first },
    { type: "attempt.started", attempt: 2 }, certificateSnapshot("b"),
    { type: "validation.failed", failure: other },
    { type: "attempt.started", attempt: 3 }, certificateSnapshot("c"),
    { type: "validation.failed", failure: first },
    { type: "evidence.recorded", items: ["a".repeat(64)],
      satisfied: ["focused tests"], contradictory: [] },
  ]), { contract });
  assert.equal(observation.failureRepeatCount, 2);
  assert.deepEqual(observation.failureHistory.map((entry) => entry.evidence.items), [
    ["a".repeat(64)], ["b".repeat(64)], ["c".repeat(64)],
  ]);
  assert.deepEqual(observation.evidenceDelta, zeroEvidenceDelta);
});

test("native declaration permits unrelated artifacts without changing the approved command order", () => {
  const contract = nativeContract();
  contract.document.tasks[0].produces.push({
    name: "capability-plan", type: "plan-binding", version: "1.0.0", path: "plan.json",
  });
  const before = structuredClone(contract);
  assert.doesNotThrow(() => reduceExecutionEvents([], { contract }));
  assert.deepEqual(contract, before);
});

for (const [name, mutate] of [
  ["multiple tasks", (document) => document.tasks.push({ ...document.tasks[0], id: "NATIVE-002" })],
  ["dependency topology", (document) => document.tasks[0].dependsOn.push("NATIVE-002")],
  ["empty checks", (document) => { document.tasks[0].validate = []; }],
  ["blank check", (document) => document.tasks[0].validate.push(" ")],
  ["unsupported version", (document) => { document.tasks[0].produces[0].version = "2.0.0"; }],
  ["repository path", (document) => { document.tasks[0].produces[0].path = "proof.json"; }],
  ["duplicate mapping", (document) => document.tasks[0].produces.push({ ...document.tasks[0].produces[0] })],
  ["conflicting mapping", (document) => document.tasks[0].produces.push({ name: "focused tests", type: "other", version: "1.0.0" })],
  ["unbound requirement", (document) => document.proof.requiredEvidence.push("other proof")],
  ["duplicate requirement", (document) => document.proof.requiredEvidence.push("focused tests")],
  ["empty requirements", (document) => { document.proof.requiredEvidence = []; }],
  ["undeclared native label", (document) => { document.tasks[0].produces[0].name = "alias"; }],
]) {
  test(`native convention refuses ${name} rather than falling back to legacy`, () => {
    const contract = nativeContract();
    mutate(contract.document);
    assert.throws(() => reduceExecutionEvents([], { contract }), /native.*evidence/i);
  });
}

for (const event of [
  { type: "evidence.recorded", items: [], satisfied: [] },
  { type: "evidence.recorded", items: [], satisfied: "focused tests", contradictory: [] },
  { type: "evidence.recorded", items: [], satisfied: ["alias"], contradictory: [] },
]) {
  test(`native complete snapshots refuse malformed or unbound inputs: ${JSON.stringify(event)}`, () => {
    const contract = nativeContract();
    assert.throws(() => reduceExecutionEvents(numbered([
      ...nativeStart(contract), event,
    ]), { contract }), /native.*evidence/i);
  });
}

test("non-opt-in legacy whole observations retain cumulative evidence and active failure lifetime", () => {
  const contract = { document: {
    tasks: [{ id: "LEGACY-001", owns: ["src"], produces: [
      { name: "focused tests", type: "other-validation-evidence", version: "9.0.0" },
    ] }], proof: { requiredEvidence: ["focused tests"] },
  } };
  const failure = nativeFailure();
  const fingerprint = fingerprintFailure(failure);
  const events = numbered([
    { type: "execution.started", buildId: "legacy-build", maxAttempts: 3 },
    { type: "attempt.started", attempt: 1 },
    { type: "evidence.recorded", items: ["A"], satisfied: [], contradictory: [] },
    { type: "validation.failed", failure },
    { type: "evidence.recorded", items: ["B"] },
    { type: "attempt.started", attempt: 2 },
  ]);
  const expected = {
    schema: "traffic-control/execution-observation@1", buildId: "legacy-build",
    phase: "RUNNING", attempt: 2, maxAttempts: 3, authority: null,
    evidence: { items: ["A", "B"], satisfied: [], contradictory: [] },
    changedPaths: [], impactedPaths: [], activeTaskCollisions: [],
    failure: { ...failure, fingerprint },
    failureHistory: [{ fingerprint, evidence: { items: ["A"], satisfied: [], contradictory: [] } }],
    failureRepeatCount: 1,
    evidenceDelta: { newItems: ["B"], newlySatisfied: [], newContradictions: [], score: 1, direction: "POSITIVE" },
    impactDelta: { unexpectedChangedPaths: [], unexpectedImpactedPaths: [], activeTaskCollisions: [], expanded: false },
    structuralConcern: null,
  };
  assert.deepEqual(reduceExecutionEvents(events, { contract }), expected);
  assert.deepEqual(reduceExecutionEvents([
    ...events, { sequence: 7, type: "validation.passed", evidenceId: "focused tests" },
  ], { contract }), {
    ...expected, failure: null, failureRepeatCount: 0,
    evidence: { ...expected.evidence, satisfied: ["focused tests"] },
  });
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
