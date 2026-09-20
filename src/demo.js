import { bindContract } from "./contracts.js";
import { GOVERNOR_POLICY_V1, evaluateGovernor } from "./governor.js";
import { createDecisionRecord, replayHistory } from "./history.js";
import { sha256 } from "./integrity.js";
import { reduceExecutionEvents } from "./observations.js";
import { auditBuildReceipt, createBuildReceipt } from "./receipts.js";

function handoffInput({ id, objective, approvedAt }) {
  const baseCommit = "a".repeat(40);
  const authorityStateSha256 = "3".repeat(64);
  const governanceReportSha256 = "4".repeat(64);
  const sources = [
    { path: "docs/product-intent.md", sha256: "1".repeat(64) },
  ];
  const snapshotSha256 = sha256({
    baseCommit,
    worktreeState: "clean",
    authorityStateSha256,
    governanceReportSha256,
    sources,
  });
  return {
    schemaVersion: "2.0.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: id,
    createdAt: "2026-09-16T11:00:00.000Z",
      repository: {
        baseCommit,
        snapshotSha256,
        worktreeState: "clean",
        remote: "https://github.com/totallymajor/traffic-control-consumer.git",
    },
    objective,
    authority: {
      status: "APPROVED",
        approvedBy: "repository-owner",
        approvedAt,
        stateSha256: authorityStateSha256,
        governanceReportSha256,
        sources,
    },
    tasks: [
      {
        id: "CHECKOUT-STATE",
        title: "Implement checkout authority",
        description: "Implement the approved checkout authority boundary.",
        estimateHours: 2,
        dependsOn: [],
        owns: ["src/checkout", "test/checkout.test.js"],
        acceptanceCriteria: ["Checkout state follows approved authority"],
        validate: ["npm test"],
      },
    ],
    proof: {
      requiredEvidence: ["unit-tests", "rendered-checkout"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
  };
}

function authority(contract) {
  return {
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
  };
}

function failedEvents(contract) {
  const failure = {
    code: "CHECKOUT_STATE_TEST_FAILED",
    classification: "deterministic",
    validation: "unit:checkout-state",
    signature: "Expected authorized state, received stale state at line 41",
    files: ["src/checkout/state.js"],
    requirementId: "CHECKOUT-STATE",
    retryable: false,
  };
  return [
    { sequence: 1, type: "authority.observed", authority: authority(contract) },
    {
      sequence: 2,
      type: "execution.started",
      buildId: "build-v1",
      maxAttempts: 4,
    },
    { sequence: 3, type: "attempt.started", attempt: 1 },
    { sequence: 4, type: "validation.failed", failure },
    { sequence: 5, type: "attempt.started", attempt: 2 },
    { sequence: 6, type: "validation.failed", failure },
    { sequence: 7, type: "attempt.started", attempt: 3 },
    { sequence: 8, type: "validation.failed", failure },
  ];
}

function structuralEvents(contract) {
  return [
    { sequence: 1, type: "authority.observed", authority: authority(contract) },
    {
      sequence: 2,
      type: "execution.started",
      buildId: "build-v1",
      maxAttempts: 4,
    },
    {
      sequence: 3,
      type: "structural.concern",
      reason: "Checkout authority belongs in the commercial bounded context",
      source: "decision-intelligence-draft",
    },
  ];
}

function successfulEvents(contract) {
  return [
    { sequence: 1, type: "authority.observed", authority: authority(contract) },
    {
      sequence: 2,
      type: "execution.started",
      buildId: "build-v2",
      maxAttempts: 3,
    },
    { sequence: 3, type: "attempt.started", attempt: 1 },
    {
      sequence: 4,
      type: "files.changed",
      taskId: "CHECKOUT-STATE",
      paths: ["src/checkout/state.js", "test/checkout.test.js"],
    },
    {
      sequence: 5,
      type: "evidence.recorded",
      items: ["validation:unit-tests", "visual:rendered-checkout"],
      satisfied: ["unit-tests", "rendered-checkout"],
    },
    { sequence: 6, type: "integration.requested" },
  ];
}

function evaluateStage(contract, events) {
  const observation = reduceExecutionEvents(events, { contract });
  const decision = evaluateGovernor({
    contract,
    observation,
    policy: GOVERNOR_POLICY_V1,
  });
  return { observation, decision };
}

export function runDemo() {
  const firstContract = bindContract(
    handoffInput({
      id: "handoff-checkout-v1",
      objective: "Repair checkout authority in its current bounded context",
      approvedAt: "2026-09-16T12:00:00.000Z",
    }),
  );
  const firstEvents = failedEvents(firstContract);
  const structural = structuralEvents(firstContract);
  const firstStage = evaluateStage(firstContract, firstEvents);
  const secondStage = evaluateStage(firstContract, structural);

  const secondContract = bindContract(
    handoffInput({
      id: "handoff-checkout-v2",
      objective: "Move checkout authority to the approved commercial boundary",
      approvedAt: "2026-09-16T12:02:30.000Z",
    }),
  );
  const finalEvents = successfulEvents(secondContract);
  const finalStage = evaluateStage(secondContract, finalEvents);
  const stages = [firstStage, secondStage, finalStage];
  const recordedTimes = [
    "2026-09-16T12:01:00.000Z",
    "2026-09-16T12:02:00.000Z",
    "2026-09-16T12:03:00.000Z",
  ];
  const decisionRecords = stages.reduce((records, stage, index) => {
    const record = createDecisionRecord({
      decision: stage.decision,
      observationHash: sha256(stage.observation),
      contractHash:
        index < 2 ? firstContract.binding.sha256 : secondContract.binding.sha256,
      previousRecordHash: records.at(-1)?.recordHash ?? null,
      recordedAt: recordedTimes[index],
    });
    records.push(record);
    return records;
  }, []);

  const receipt = createBuildReceipt({
    contract: secondContract,
    authority: authority(secondContract),
    build: {
      id: "build-v2",
      status: "completed",
      baseCommit: secondContract.document.repository.baseCommit,
      integrationCommit: "c".repeat(40),
    },
    tasks: [
      {
        id: "CHECKOUT-STATE",
        status: "integrated",
        resultCommit: "b".repeat(40),
        integrationCommit: "c".repeat(40),
        changedFiles: ["src/checkout/state.js", "test/checkout.test.js"],
        validation: [{ command: "npm test", status: "passed" }],
      },
    ],
    evidence: {
      events: [],
      artifacts: [
        { id: "unit-tests", sha256: "2".repeat(64) },
        { id: "rendered-checkout", sha256: "3".repeat(64) },
      ],
      approvals: [
        { type: "repository-owner", approvedBy: "repository-owner" },
      ],
    },
    governor: {
      finalDecision: finalStage.decision.action,
      policyVersions: [GOVERNOR_POLICY_V1.version],
      decisionRecordHashes: decisionRecords.map((record) => record.recordHash),
      decisionRecords,
    },
    issuedAt: "2026-09-16T12:04:00.000Z",
  });

  const replayed = replayHistory({
    contract: firstContract,
    eventBatches: [
      { contract: firstContract, events: firstEvents },
      { contract: firstContract, events: structural },
      { contract: secondContract, events: finalEvents },
    ],
    policy: GOVERNOR_POLICY_V1,
  });
  const originalActions = stages.map((stage) => stage.decision.action);
  const replayedActions = replayed.map((stage) => stage.decision.action);

  return {
    policyVersion: GOVERNOR_POLICY_V1.version,
    contracts: [firstContract, secondContract],
    supersession: {
      from: firstContract.binding.id,
      to: secondContract.binding.id,
      authorityEffect: "HUMAN_APPROVED_REPLACEMENT",
    },
    stages,
    decisionRecords,
    receipt,
    receiptAudit: auditBuildReceipt(receipt, secondContract),
    replay: {
      decisions: replayed.map((stage) => stage.decision),
      matchesOriginalDecisions:
        JSON.stringify(originalActions) === JSON.stringify(replayedActions),
    },
  };
}
