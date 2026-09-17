import assert from "node:assert/strict";
import test from "node:test";

import { bindContract } from "../src/contracts.js";
import {
  GOVERNOR_POLICY_V1,
  evaluateGovernor,
  resolveGovernorPolicy,
} from "../src/governor.js";

function approvedContract(overrides = {}) {
  return bindContract({
    schemaVersion: "2.0.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-001",
    createdAt: "2026-09-16T11:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40),
      snapshotSha256: "2".repeat(64),
      worktreeState: "clean",
      remote: "https://github.com/totallymajor/example.git",
    },
    objective: "Implement a deterministic execution governor",
    authority: {
      status: "APPROVED",
      approvedBy: "repository-owner",
      approvedAt: "2026-09-16T12:00:00.000Z",
      stateSha256: "3".repeat(64),
      governanceReportSha256: "4".repeat(64),
      sources: [{ path: "docs/intent.md", sha256: "1".repeat(64) }],
    },
    tasks: [
      {
        id: "GOV-001",
        title: "Implement governor",
        description: "Add deterministic execution governance.",
        estimateHours: 2,
        dependsOn: [],
        owns: ["src", "test"],
        acceptanceCriteria: ["Governor decisions are deterministic"],
        validate: ["npm test"],
      },
    ],
    proof: {
      requiredEvidence: ["unit-tests"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
    ...overrides,
  });
}

function observation(contract, overrides = {}) {
  return {
    schema: "traffic-control/execution-observation@1",
    buildId: "build-1",
    phase: "RUNNING",
    attempt: 1,
    maxAttempts: 3,
    authority: {
      handoffId: contract.binding.id,
      handoffSha256: contract.binding.sha256,
      repositoryId: contract.document.repository.remote,
      baseCommit: contract.document.repository.baseCommit,
      snapshotSha256: contract.document.repository.snapshotSha256,
      worktreeState: contract.document.repository.worktreeState,
      authorityStateSha256: contract.document.authority.stateSha256,
      governanceReportSha256:
        contract.document.authority.governanceReportSha256,
      authoritySources: contract.document.authority.sources,
      approvalAuthority: "HUMAN_OR_REPOSITORY",
    },
    evidence: {
      items: [],
      satisfied: [],
      contradictory: [],
    },
    evidenceDelta: {
      newItems: [],
      newlySatisfied: [],
      newContradictions: [],
      score: 0,
      direction: "ZERO",
    },
    impactDelta: {
      unexpectedChangedPaths: [],
      unexpectedImpactedPaths: [],
      activeTaskCollisions: [],
      expanded: false,
    },
    failure: null,
    failureRepeatCount: 0,
    structuralConcern: null,
    ...overrides,
  };
}

test("Governor policy versions resolve explicitly and unknown versions fail closed", () => {
  assert.equal(resolveGovernorPolicy("governor.v1"), GOVERNOR_POLICY_V1);
  assert.throws(
    () => resolveGovernorPolicy("governor.v0"),
    /unsupported Governor policy version/i,
  );
});

test("the same state, contract, and policy produce the same decision", () => {
  const contract = approvedContract();
  const input = observation(contract);

  assert.deepEqual(
    evaluateGovernor({ contract, observation: input, policy: GOVERNOR_POLICY_V1 }),
    evaluateGovernor({ contract, observation: input, policy: GOVERNOR_POLICY_V1 }),
  );
});

test("authority drift pauses execution", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    authority: {
      ...observation(contract).authority,
      baseCommit: "b".repeat(40),
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "PAUSE_FOR_REVIEW");
  assert.equal(decision.ruleId, "authority-drift");
});

test("unauthorized changed paths block integration", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    phase: "INTEGRATING",
    impactDelta: {
      unexpectedChangedPaths: ["infra/production.tf"],
      unexpectedImpactedPaths: [],
      activeTaskCollisions: [],
      expanded: true,
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "BLOCK_INTEGRATION");
  assert.equal(decision.ruleId, "ownership-violation");
});

test("missing required evidence blocks integration", () => {
  const contract = approvedContract();
  const input = observation(contract, { phase: "INTEGRATING" });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "BLOCK_INTEGRATION");
  assert.equal(decision.ruleId, "required-evidence-missing");
  assert.deepEqual(decision.signals.missingEvidence, ["unit-tests"]);
});

test("contradicted required evidence blocks integration even when marked satisfied", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    phase: "INTEGRATING",
    evidence: {
      items: ["unit-tests"],
      satisfied: ["unit-tests"],
      contradictory: ["unit-tests"],
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "BLOCK_INTEGRATION");
  assert.equal(decision.ruleId, "required-evidence-contradicted");
});

test("repeated deterministic failure without learning proposes a replan", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    attempt: 3,
    failureRepeatCount: 3,
    failure: {
      fingerprint: "d".repeat(64),
      classification: "deterministic",
      retryable: false,
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "PROPOSE_REPLAN");
  assert.equal(decision.ruleId, "repeated-no-progress-failure");
  assert.equal(decision.authorityEffect, "PROPOSAL_ONLY");
});

test("retryable failure delegates retry authority to the runtime", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    failureRepeatCount: 1,
    failure: {
      fingerprint: "e".repeat(64),
      classification: "transient",
      retryable: true,
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "DELEGATE_RETRY");
  assert.equal(decision.ruleId, "runtime-retry-eligible");
});

test("exhausted transient failure pauses instead of falling through to continue", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    attempt: 3,
    maxAttempts: 3,
    failureRepeatCount: 1,
    failure: {
      fingerprint: "e".repeat(64),
      classification: "transient",
      retryable: true,
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "PAUSE_FOR_REVIEW");
  assert.equal(decision.ruleId, "retry-budget-exhausted");
});

test("unclassified failure pauses instead of falling through to continue", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    failureRepeatCount: 1,
    failure: {
      fingerprint: "9".repeat(64),
      classification: "unknown",
      retryable: false,
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "PAUSE_FOR_REVIEW");
  assert.equal(decision.ruleId, "unclassified-failure");
});

test("first deterministic implementation failure requests bounded repair", () => {
  const contract = approvedContract();
  const input = observation(contract, {
    failureRepeatCount: 1,
    failure: {
      fingerprint: "f".repeat(64),
      classification: "deterministic",
      retryable: false,
    },
  });

  assert.equal(
    evaluateGovernor({
      contract,
      observation: input,
      policy: GOVERNOR_POLICY_V1,
    }).action,
    "REQUEST_REPAIR",
  );
});

test("structural concern requests reconsideration without rewriting authority", () => {
  const contract = approvedContract();
  const before = structuredClone(contract);
  const input = observation(contract, {
    structuralConcern: {
      reason: "Canonical ownership may belong in another bounded context",
      source: "execution-evidence",
    },
  });

  const decision = evaluateGovernor({
    contract,
    observation: input,
    policy: GOVERNOR_POLICY_V1,
  });

  assert.equal(decision.action, "REQUEST_RECONSIDER");
  assert.equal(decision.authorityEffect, "PROPOSAL_ONLY");
  assert.equal(decision.requiresApproval, true);
  assert.deepEqual(contract, before);
});
