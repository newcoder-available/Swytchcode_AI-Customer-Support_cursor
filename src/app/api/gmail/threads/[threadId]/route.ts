import { NextResponse } from "next/server";
import { getTicketThread } from "@/lib/gmail/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params;
    if (!threadId?.trim()) {
      return NextResponse.json(
        { ok: false, error: "threadId is required" },
        { status: 400 },
      );
    }
    const result = await getTicketThread(threadId.trim());
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "thread failed",
      },
      { status: 500 },
    );
  }
}
