import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/swytchcode/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = getHealthReport();
    // Never include secrets — health uses CLI status + tooling IDs only.
    return NextResponse.json(report, { status: report.ok ? 200 : 503 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "health check failed",
      },
      { status: 500 },
    );
  }
}
