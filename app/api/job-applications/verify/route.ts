import { NextResponse } from "next/server";
import { getJobApplicationClients } from "@/features/job-applications/server";
import { verifyJobPosting } from "@/features/job-applications/verify-url";

export async function POST(request: Request) {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to verify job links." }, { status: 401 });
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string") return NextResponse.json({ error: "Paste a job posting link." }, { status: 400 });
    const result = await verifyJobPosting(body.url.trim());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this link." }, { status: 400 });
  }
}
