import assert from "node:assert/strict";
import test from "node:test";

import {
  ContractViolation,
  bindContract,
  verifyContract,
} from "../src/contracts.js";

function contractInput(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-001",
    createdAt: "2026-09-16T11:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40),
      remote: "https://github.com/totallymajor/example.git",
    },
    objective: "Add governed execution",
    authority: {
      status: "APPROVED",
      approvedBy: "repository-owner",
      approvedAt: "2026-09-16T12:00:00.000Z",
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
    ...overrides,
  };
}

function observedAuthority(contract, overrides = {}) {
  return {
    handoffId: contract.binding.id,
    handoffSha256: contract.binding.sha256,
    repositoryId: contract.document.repository.remote,
    baseCommit: contract.document.repository.baseCommit,
    authoritySources: contract.document.authority.sources,
    approvalAuthority: "HUMAN_OR_REPOSITORY",
    ...overrides,
  };
}

test("bindContract creates a stable canonical digest", () => {
  const first = bindContract(contractInput());
  const reordered = bindContract({
    ...contractInput(),
    authority: {
      sources: [{ sha256: "1".repeat(64), path: "docs/intent.md" }],
      status: "APPROVED",
      approvedBy: "repository-owner",
      approvedAt: "2026-09-16T12:00:00.000Z",
    },
  });

  assert.equal(first.binding.algorithm, "sha256");
  assert.match(first.binding.sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.binding.sha256, reordered.binding.sha256);
  assert.equal(first.document.kind, "design-intelligence/governed-task-handoff");
});

test("bindContract accepts schema-valid RFC 3339 timestamps without milliseconds", () => {
  const input = contractInput();
  input.createdAt = "2026-09-16T11:00:00Z";
  input.authority.approvedAt = "2026-09-16T12:00:00Z";

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
  const contract = bindContract(input);

  assert.throws(
    () => verifyContract(contract, observedAuthority(contract)),
    (error) =>
      error instanceof ContractViolation && error.code === "CONTRACT_NOT_APPROVED",
  );
});

test("verifyContract rejects contents changed after approval", () => {
  const contract = bindContract(contractInput());
  contract.document.objective = "Silently changed approved objective";

  assert.throws(
    () => verifyContract(contract, observedAuthority(contract)),
    (error) =>
      error instanceof ContractViolation && error.code === "CONTRACT_HASH_DRIFT",
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
  const input = contractInput();
  input.authority.approvedBy = "decision-intelligence";
  const contract = bindContract(input);

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
