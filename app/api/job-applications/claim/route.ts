import { NextResponse } from "next/server";
import { getJobApplicationClients } from "@/features/job-applications/server";

export async function POST() {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to claim a reward." }, { status: 401 });
    const { data, error } = await ctx.db.rpc("claim_job_application_reward", { p_user_id: ctx.userId });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not claim your reward." }, { status: 400 });
  }
}
