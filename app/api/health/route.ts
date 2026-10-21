import { NextResponse } from "next/server";

import { keystoneContext } from "@/features/keystone/context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await Promise.race([
      keystoneContext.prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database health check timed out")), 2_000)),
    ]);
    return NextResponse.json(
      { status: "ok", service: "openfront-construction" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", service: "openfront-construction" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
