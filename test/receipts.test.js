import assert from "node:assert/strict";
import test from "node:test";

import { bindContract } from "../src/contracts.js";
import { createDecisionRecord } from "../src/history.js";
import { sha256 } from "../src/integrity.js";
import {
  ReceiptViolation,
  auditBuildReceipt,
  createBuildReceipt,
} from "../src/receipts.js";

function contract() {
  return bindContract({
    schemaVersion: "2.0.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-receipt",
    createdAt: "2026-09-16T11:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40),
      snapshotSha256: "2".repeat(64),
      worktreeState: "clean",
      remote: "https://github.com/totallymajor/example.git",
    },
    objective: "Issue an auditable AgentFlow build receipt",
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
        id: "RECEIPT-001",
        title: "Issue receipt",
        description: "Capture bounded execution evidence.",
        estimateHours: 1,
        dependsOn: [],
        owns: ["src"],
        acceptanceCriteria: ["Receipt audits against the exact handoff"],
        validate: ["npm test"],
      },
    ],
    proof: {
      requiredEvidence: ["unit-tests"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
  });
}

function receiptInput(boundContract, overrides = {}) {
  const decisionRecord = createDecisionRecord({
    decision: {
      policyVersion: "governor.v1",
      action: "CONTINUE",
      ruleId: "entitled-to-continue",
    },
    observationHash: "5".repeat(64),
    contractHash: boundContract.binding.sha256,
    recordedAt: "2026-09-16T12:09:00.000Z",
  });
  return {
    contract: boundContract,
    authority: {
      handoffId: boundContract.binding.id,
      handoffSha256: boundContract.binding.sha256,
      repositoryId: boundContract.document.repository.remote,
      baseCommit: boundContract.document.repository.baseCommit,
      snapshotSha256: boundContract.document.repository.snapshotSha256,
      worktreeState: boundContract.document.repository.worktreeState,
      authorityStateSha256: boundContract.document.authority.stateSha256,
      governanceReportSha256:
        boundContract.document.authority.governanceReportSha256,
      authoritySources: boundContract.document.authority.sources,
      approvalAuthority: "HUMAN_OR_REPOSITORY",
    },
    build: {
      id: "build-001",
      status: "completed",
      baseCommit: "a".repeat(40),
      integrationCommit: "c".repeat(40),
    },
    tasks: [
      {
        id: "RECEIPT-001",
        status: "integrated",
        resultCommit: "b".repeat(40),
        integrationCommit: "c".repeat(40),
        changedFiles: ["src/receipts.js"],
        validation: [{ command: "npm test", status: "passed" }],
      },
    ],
    evidence: {
      events: [],
      artifacts: [{ id: "unit-tests", sha256: "3".repeat(64) }],
      approvals: [],
    },
    governor: {
      finalDecision: "CONTINUE",
      policyVersions: ["governor.v1"],
      decisionRecordHashes: [decisionRecord.recordHash],
      decisionRecords: [decisionRecord],
    },
    issuedAt: "2026-09-16T12:10:00.000Z",
    ...overrides,
  };
}

test("an integrated build produces a hash-bound local proof receipt", () => {
  const boundContract = contract();
  const receipt = createBuildReceipt(receiptInput(boundContract));

  assert.equal(receipt.document.kind, "agentflow/build-receipt");
  assert.equal(receipt.document.proofBoundary, "LOCAL_EXECUTION_AND_INTEGRATION");
  assert.equal(receipt.document.handoff.sha256, boundContract.binding.sha256);
  assert.deepEqual(auditBuildReceipt(receipt, boundContract), {
    valid: true,
    receiptHash: auditBuildReceipt(receipt, boundContract).receiptHash,
    proofBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
  });
  assert.match(auditBuildReceipt(receipt, boundContract).receiptHash, /^[a-f0-9]{64}$/);
});

test("receipt creation refuses missing required evidence", () => {
  const boundContract = contract();

  assert.throws(
    () =>
      createBuildReceipt(
        receiptInput(boundContract, {
          evidence: { events: [], artifacts: [], approvals: [] },
        }),
      ),
    (error) =>
      error instanceof ReceiptViolation && error.code === "REQUIRED_EVIDENCE_MISSING",
  );
});

test("receipt audit rejects mutation and contract substitution", () => {
  const boundContract = contract();
  const receipt = createBuildReceipt(receiptInput(boundContract));
  receipt.document.build.integrationCommit = "d".repeat(40);

  assert.throws(
    () => auditBuildReceipt(receipt, boundContract),
    (error) =>
      error instanceof ReceiptViolation && error.code === "RECEIPT_HASH_DRIFT",
  );

  const otherContract = bindContract({
    ...structuredClone(contract().document),
    handoffId: "handoff-other",
  });
  const intactReceipt = createBuildReceipt(receiptInput(boundContract));
  assert.throws(
    () => auditBuildReceipt(intactReceipt, otherContract),
    (error) =>
      error instanceof ReceiptViolation && error.code === "RECEIPT_CONTRACT_MISMATCH",
  );
});

test("receipt audit rejects an approved contract mutated after receipt issuance", () => {
  const boundContract = contract();
  const receipt = createBuildReceipt(receiptInput(boundContract));
  boundContract.document.objective = "Mutated after approval";

  assert.throws(
    () => auditBuildReceipt(receipt, boundContract),
    (error) =>
      error instanceof ReceiptViolation && error.code === "CONTRACT_HASH_DRIFT",
  );
});

test("receipt creation reconciles build, tasks, and hashed proof to the handoff", () => {
  const boundContract = contract();
  const cases = [
    {
      code: "TASKS_NOT_INTEGRATED",
      overrides: { tasks: [] },
    },
    {
      code: "BUILD_BASE_COMMIT_MISMATCH",
      overrides: {
        build: {
          id: "build-001",
          status: "completed",
          baseCommit: "d".repeat(40),
          integrationCommit: "c".repeat(40),
        },
      },
    },
    {
      code: "INVALID_INTEGRATION_COMMIT",
      overrides: {
        build: {
          id: "build-001",
          status: "completed",
          baseCommit: "a".repeat(40),
          integrationCommit: null,
        },
      },
    },
    {
      code: "REQUIRED_EVIDENCE_MISSING",
      overrides: {
        evidence: {
          events: [],
          artifacts: [{ id: "unit-tests" }],
          approvals: [],
        },
      },
    },
    {
      code: "INVALID_GOVERNOR_PROVENANCE",
      overrides: {
        governor: {
          finalDecision: "CONTINUE",
          policyVersions: [],
          decisionRecordHashes: [],
          decisionRecords: [],
        },
      },
    },
    {
      code: "INVALID_APPROVAL_AUTHORITY",
      overrides: {
        authority: {
          ...receiptInput(boundContract).authority,
          approvalAuthority: "ADVISORY_MODEL",
        },
      },
    },
    {
      code: "TASKS_NOT_INTEGRATED",
      overrides: {
        tasks: [
          {
            ...receiptInput(boundContract).tasks[0],
            changedFiles: ["outside/owned-scope.js"],
          },
        ],
      },
    },
    {
      code: "TASKS_NOT_INTEGRATED",
      overrides: {
        tasks: [
          {
            ...receiptInput(boundContract).tasks[0],
            validation: [{ command: "npm test", status: "failed" }],
          },
        ],
      },
    },
  ];

  for (const item of cases) {
    assert.throws(
      () =>
        createBuildReceipt(receiptInput(boundContract, item.overrides)),
      (error) => error instanceof ReceiptViolation && error.code === item.code,
      item.code,
    );
  }
});

test("receipt audit rejects recomputed but invalid Governor provenance", () => {
  const boundContract = contract();
  const receipt = createBuildReceipt(receiptInput(boundContract));
  const event = receipt.document.evidence.events.find(
    (candidate) => candidate.type === "governor.decision",
  );
  event.decisionRecordHashes = [];

  receipt.binding.sha256 = sha256(receipt.document);

  assert.throws(
    () => auditBuildReceipt(receipt, boundContract),
    (error) =>
      error instanceof ReceiptViolation &&
      error.code === "INVALID_GOVERNOR_PROVENANCE",
  );
});

test("multi-task receipts allow distinct valid task integration commits", () => {
  const document = structuredClone(contract().document);
  document.tasks.push({
    id: "RECEIPT-002",
    title: "Audit second task",
    description: "Prove independent sequential task integration.",
    estimateHours: 1,
    dependsOn: ["RECEIPT-001"],
    owns: ["lib"],
    acceptanceCriteria: ["Second task is represented in the receipt"],
    validate: ["node --test"],
  });
  const boundContract = bindContract(document);
  const input = receiptInput(boundContract);
  input.tasks.push({
    id: "RECEIPT-002",
    status: "integrated",
    resultCommit: "d".repeat(40),
    integrationCommit: "e".repeat(40),
    changedFiles: ["lib/audit.js"],
    validation: [{ command: "node --test", status: "passed" }],
  });

  const receipt = createBuildReceipt(input);
  assert.equal(auditBuildReceipt(receipt, boundContract).valid, true);
});
