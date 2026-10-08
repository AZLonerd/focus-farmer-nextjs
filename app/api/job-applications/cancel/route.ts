import { NextResponse } from "next/server";
import { getJobApplicationClients, getServerErrorMessage } from "@/features/job-applications/server";

export async function POST() {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to cancel your goal." }, { status: 401 });
    const { data, error } = await ctx.db.rpc("cancel_job_application_goal", { p_user_id: ctx.userId });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: getServerErrorMessage(error, "Could not cancel your goal.") }, { status: 400 });
  }
}
