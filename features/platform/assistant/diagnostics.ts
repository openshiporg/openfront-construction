export type AssistantFailureCode = "PROVIDER_VALIDATION_FAILED" | "PROVIDER_UNAVAILABLE" | "STREAM_FAILED" | "CLOSE_FAILED";
export function reportAssistantFailure(code: AssistantFailureCode, sink: (event: { code: AssistantFailureCode }) => void = console.error) {
  sink({ code });
}
/** Never serialize SDK errors: they contain prompts, headers and tool results. */
export function publicAssistantFailure(_error: unknown): string {
  return "The response could not be generated. Try again.";
}
