'use client';

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { initialCommandState, type CommandState } from "./action-state";

export type KeyedCommandState = CommandState & { idempotencyKey?: string };

/** Picks the idempotency key for the next submission. An error or an unknown
 * outcome keeps the key that was just sent, so a retry is recognised as the
 * same operation; a definitive success (including a replay) starts a new
 * business operation with a fresh key. */
export function nextIdempotencyKey(result: CommandState, sentKey: string, fresh: () => string): string {
  return result.status === "success" ? fresh() : sentKey;
}

export const UNKNOWN_OUTCOME_MESSAGE = "No response was received. Submit again to retry the same request safely.";

/** Server-action form state with per-operation idempotency keys and a
 * targeted data refresh after every definitive success. */
export function useKeyedCommand(
  run: (previous: CommandState, formData: FormData) => Promise<CommandState>,
) {
  const router = useRouter();
  const [initialKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<KeyedCommandState, FormData>(
    async (previous: KeyedCommandState, formData: FormData): Promise<KeyedCommandState> => {
      const sentKey = String(formData.get("idempotencyKey") ?? "");
      let result: CommandState;
      try {
        result = await run(previous, formData);
      } catch {
        result = { status: "error", message: UNKNOWN_OUTCOME_MESSAGE };
      }
      return { ...result, idempotencyKey: nextIdempotencyKey(result, sentKey, () => crypto.randomUUID()) };
    },
    initialCommandState,
  );
  const idempotencyKey = state.idempotencyKey ?? initialKey;
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);
  return { state, action, pending, idempotencyKey };
}
