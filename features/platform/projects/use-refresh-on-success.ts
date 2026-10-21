'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRefreshOnSuccess(status: string, receipt?: unknown) {
  const router = useRouter();
  useEffect(() => {
    if (status !== "success") return;
    router.refresh();
  }, [router, status, receipt]);
}
