import assert from "node:assert/strict";
import test from "node:test";

import {
  ContractViolation,
  bindContract,
  verifyContract,
} from "../src/contracts.js";
import { canonicalJson, sha256 } from "../src/integrity.js";
import { approveHandoff } from "./handoff-fixture.js";

function contractInput(overrides = {}) {
  const proposed = {
    schemaVersion: "2.1.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-001",
    programId: "program_01measurementsuccess",
    createdAt: "2026-09-16T11:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40),
      snapshotSha256: "2".repeat(64),
      worktreeState: "clean",
      remote: "https://github.com/totallymajor/example.git",
    },
    objective: "Add governed execution",
    authority: {
      status: "PROPOSED",
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
        owns: ["src/governor", "test/governor.test.js"],
        acceptanceCriteria: ["Governor decisions are deterministic"],
        validate: ["npm test"],
      },
    ],
    proof: {
      requiredEvidence: ["unit-tests", "integration-tests"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
  };
  return approveHandoff({
    ...proposed,
    ...overrides,
  });
}

function observedAuthority(contract, overrides = {}) {
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
    ...overrides,
  };
}

test("bindContract creates a stable canonical digest", () => {
  const input = contractInput();
  const first = bindContract(input);
  const reordered = bindContract({
    ...input,
    authority: {
      sources: [{ sha256: "1".repeat(64), path: "docs/intent.md" }],
      approvalReceipt: input.authority.approvalReceipt,
      status: input.authority.status,
      approvedBy: input.authority.approvedBy,
      approvedAt: input.authority.approvedAt,
      stateSha256: "3".repeat(64),
      governanceReportSha256: "4".repeat(64),
    },
  });

  assert.equal(first.binding.algorithm, "sha256");
  assert.equal(first.binding.programId, "program_01measurementsuccess");
  assert.match(first.binding.sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.binding.sha256, reordered.binding.sha256);
  assert.equal(first.document.kind, "design-intelligence/governed-task-handoff");
});

test("bindContract rejects the obsolete v1 handoff schema", () => {
  const input = contractInput();
  input.schemaVersion = "1.0.0";

  assert.throws(
    () => bindContract(input),
    (error) =>
      error instanceof ContractViolation &&
      error.code === "UNSUPPORTED_CONTRACT_SCHEMA",
  );
});

test("bindContract rejects malformed program correlation", () => {
  assert.throws(
    () => bindContract(contractInput({ programId: "program with spaces" })),
    (error) =>
      error instanceof ContractViolation && error.code === "INVALID_PROGRAM_ID",
  );
});

test("bindContract accepts schema-valid RFC 3339 timestamps without milliseconds", () => {
  const input = contractInput({ createdAt: "2026-09-16T11:00:00Z" });

  assert.equal(bindContract(input).document.createdAt, "2026-09-16T11:00:00Z");
});

test("verifyContract accepts exact approved authority", () => {
  const contract = bindContract(contractInput());

  assert.deepEqual(verifyContract(contract, observedAuthority(contract)), {
    valid: true,
    contractHash: contract.binding.sha256,
  });
});

test("verifyContract rejects a proposed handoff", () => {
  const input = contractInput();
  input.authority.status = "PROPOSED";
  delete input.authority.approvedBy;
  delete input.authority.approvedAt;
  assert.throws(
    () => bindContract(input),
    (error) =>
      error instanceof ContractViolation && error.code === "INVALID_APPROVAL",
  );
});

test("verifyContract rejects contents changed after approval", () => {
  const contract = bindContract(contractInput());
  contract.document.objective = "Silently changed approved objective";

  assert.throws(
    () => verifyContract(contract, observedAuthority(contract)),
    (error) =>
      error instanceof ContractViolation && error.code === "EXECUTION_APPROVAL_DRIFT",
  );
});

test("verifyContract rejects base revision drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, { baseCommit: "b".repeat(40) }),
      ),
    (error) =>
      error instanceof ContractViolation && error.code === "BASE_COMMIT_DRIFT",
  );
});

test("verifyContract rejects governed snapshot drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, { snapshotSha256: "5".repeat(64) }),
      ),
    (error) =>
      error instanceof ContractViolation && error.code === "SNAPSHOT_DRIFT",
  );
});

test("verifyContract rejects authority state drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, {
          authorityStateSha256: "5".repeat(64),
        }),
      ),
    (error) =>
      error instanceof ContractViolation && error.code === "AUTHORITY_STATE_DRIFT",
  );
});

test("verifyContract rejects governance report drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, {
          governanceReportSha256: "5".repeat(64),
        }),
      ),
    (error) =>
      error instanceof ContractViolation &&
      error.code === "GOVERNANCE_REPORT_DRIFT",
  );
});

test("verifyContract rejects authority source drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, {
          authoritySources: [
            { path: "docs/intent.md", sha256: "2".repeat(64) },
          ],
        }),
      ),
    (error) =>
      error instanceof ContractViolation && error.code === "AUTHORITY_SOURCE_DRIFT",
  );
});

test("verifyContract classifies malformed observed authority sources as drift", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, { authoritySources: [null] }),
      ),
    (error) =>
      error instanceof ContractViolation && error.code === "AUTHORITY_SOURCE_DRIFT",
  );
});

test("verifyContract rejects advisory output masquerading as approval", () => {
  const contract = bindContract(contractInput());

  assert.throws(
    () =>
      verifyContract(
        contract,
        observedAuthority(contract, { approvalAuthority: "ADVISORY_MODEL" }),
      ),
    (error) =>
      error instanceof ContractViolation &&
      error.code === "INVALID_APPROVAL_AUTHORITY",
  );
});

test("bindContract rejects a missing execution approval receipt", () => {
  const input = contractInput();
  delete input.authority.approvalReceipt;
  assert.throws(
    () => bindContract(input),
    (error) => error instanceof ContractViolation && error.code === "INVALID_EXECUTION_APPROVAL",
  );
});

test("bindContract rejects a changed execution approval receipt", () => {
  const input = contractInput();
  input.authority.approvalReceipt.receiptId = `HAR-${"A".repeat(20)}`;
  assert.throws(
    () => bindContract(input),
    (error) => error instanceof ContractViolation && error.code === "EXECUTION_APPROVAL_DRIFT",
  );
});

test("bindContract rejects an expired execution approval receipt", () => {
  const proposed = contractInput();
  const receipt = proposed.authority.approvalReceipt;
  receipt.validUntil = "2020-01-01T00:00:00Z";
  const receiptWithoutId = Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "receiptId"),
  );
  receipt.receiptId = `HAR-${sha256(canonicalJson(receiptWithoutId)).slice(0, 20).toUpperCase()}`;
  assert.throws(
    () => bindContract(proposed),
    (error) => error instanceof ContractViolation && error.code === "EXECUTION_APPROVAL_EXPIRED",
  );
});

test("bindContract rejects a task dependency outside the handoff", () => {
  const input = contractInput();
  input.tasks[0].dependsOn = ["MISSING-TASK"];

  assert.throws(
    () => bindContract(input),
    (error) =>
      error instanceof ContractViolation && error.code === "INVALID_TASK_DEPENDENCY",
  );
});

test("bindContract rejects unsafe ownership roots", () => {
  const input = contractInput();
  input.tasks[0].owns = ["../outside-repository"];

  assert.throws(
    () => bindContract(input),
    (error) =>
      error instanceof ContractViolation && error.code === "INVALID_OWNERSHIP",
  );
});

test("bindContract rejects malformed approved handoffs", () => {
  const cases = [
    {
      code: "INVALID_APPROVAL",
      mutate(input) {
        delete input.authority.approvedBy;
      },
    },
    {
      code: "INVALID_REPOSITORY_BINDING",
      mutate(input) {
        input.repository.baseCommit = "not-a-commit";
      },
    },
    {
      code: "INVALID_REPOSITORY_BINDING",
      mutate(input) {
        input.repository.snapshotSha256 = "not-a-digest";
      },
    },
    {
      code: "INVALID_REPOSITORY_BINDING",
      mutate(input) {
        input.repository.worktreeState = "dirty";
      },
    },
    {
      code: "INVALID_APPROVAL",
      mutate(input) {
        delete input.authority.stateSha256;
      },
    },
    {
      code: "INVALID_APPROVAL",
      mutate(input) {
        delete input.authority.governanceReportSha256;
      },
    },
    {
      code: "INVALID_AUTHORITY_SOURCES",
      mutate(input) {
        input.authority.sources[0].sha256 = "not-a-digest";
      },
    },
    {
      code: "INVALID_TASK_IDENTITY",
      mutate(input) {
        input.tasks[0].id = "invalid task id";
      },
    },
    {
      code: "INVALID_REQUIRED_EVIDENCE",
      mutate(input) {
        input.proof.requiredEvidence = [];
      },
    },
  ];

  for (const item of cases) {
    const input = contractInput();
    item.mutate(input);
    assert.throws(
      () => bindContract(input),
      (error) => error instanceof ContractViolation && error.code === item.code,
      item.code,
    );
  }
});
