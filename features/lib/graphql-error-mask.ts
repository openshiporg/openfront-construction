import { GraphQLError } from "graphql";
import { createGraphQLError, maskError, type MaskError } from "graphql-yoga";

/** Code sent with a deliberate domain message so clients can show it. */
export const DOMAIN_ERROR_CODE = "DOMAIN_ERROR";

const UNSAFE = /:\/\/|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|prisma|invocation|\b\d{1,3}(?:\.\d{1,3}){3}\b/i;

/** Resolvers throw plain `new Error("…")` for validation and state rules; those
 * messages are written for the operator. Subclasses (TypeError, Prisma, network)
 * and anything multi-line or address-like stay masked. */
export function domainErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error) || error.constructor !== Error) return null;
  const message = error.message.trim();
  if (!message || message.length > 300 || /[\r\n]/.test(message) || UNSAFE.test(message)) return null;
  return message;
}

export const maskConstructionError: MaskError = (error, message, isDev) => {
  const domain = error instanceof GraphQLError ? domainErrorMessage(error.originalError) : null;
  if (domain && error instanceof GraphQLError) {
    return createGraphQLError(domain, { nodes: error.nodes, positions: error.positions, path: error.path, extensions: { code: DOMAIN_ERROR_CODE } });
  }
  return maskError(error, message, isDev);
};
