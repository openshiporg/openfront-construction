import type { KeystoneContextLike, KeystoneQueryRecord } from "./tenancy";

export type ValidationHookArgs = {
  operation: "create" | "update";
  resolvedData: Record<string, unknown>;
  item?: ({ id: { toString(): string } } & Record<string, unknown>) | null;
  context: KeystoneContextLike;
  addValidationError(message: string): void;
};

export type RelatedRecord = KeystoneQueryRecord & {
  primeContract?: { id?: string } | null;
  commitment?: { id?: string } | null;
};
