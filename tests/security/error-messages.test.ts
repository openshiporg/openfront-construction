import assert from "node:assert/strict";
import { test } from "node:test";
import { GraphQLError } from "graphql";

import { DOMAIN_ERROR_CODE, domainErrorMessage, maskConstructionError } from "../../features/lib/graphql-error-mask";
import { operatorErrorMessage } from "../../features/lib/operator-error";

test("deliberate resolver errors keep their message", () => {
  assert.equal(domainErrorMessage(new Error("Company slug is invalid")), "Company slug is invalid");
  const wrapped = new GraphQLError("Company slug is invalid", { originalError: new Error("Company slug is invalid"), path: ["onboardConstructionWorkspace"] });
  const masked = maskConstructionError(wrapped, "Unexpected error.", false) as GraphQLError;
  assert.equal(masked.message, "Company slug is invalid");
  assert.equal(masked.extensions.code, DOMAIN_ERROR_CODE);
});

test("unexpected errors stay masked", () => {
  for (const error of [
    new TypeError("Cannot read properties of undefined"),
    new Error("connect ECONNREFUSED 10.0.0.4:5432"),
    new Error("Invalid `prisma.company.create()` invocation"),
    new Error("line one\nline two"),
  ]) {
    assert.equal(domainErrorMessage(error), null);
    const masked = maskConstructionError(new GraphQLError(error.message, { originalError: error }), "Unexpected error.", false) as GraphQLError;
    assert.equal(masked.message, "Unexpected error.");
  }
  class PrismaClientKnownRequestError extends Error {}
  assert.equal(domainErrorMessage(new PrismaClientKnownRequestError("Unique constraint failed")), null);
});

test("operator messages come only from safe codes", () => {
  assert.equal(operatorErrorMessage([{ message: "03-3000 already exists", extensions: { code: "DOMAIN_ERROR" } }]), "03-3000 already exists");
  assert.equal(
    operatorErrorMessage([{ message: "You provided invalid data for this operation.\n  - TradePartner.name: Name is required", extensions: { code: "KS_VALIDATION_FAILURE" } }]),
    "TradePartner.name: Name is required",
  );
  assert.equal(operatorErrorMessage([{ message: "Unexpected error.", extensions: { unexpected: true } as never }]), null);
  assert.equal(operatorErrorMessage([{ message: "Prisma error: x", extensions: { code: "KS_PRISMA_ERROR" } }]), null);
  assert.equal(operatorErrorMessage(undefined), null);
});
