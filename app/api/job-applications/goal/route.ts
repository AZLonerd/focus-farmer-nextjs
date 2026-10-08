import { NextResponse } from "next/server";
import { getJobApplicationClients, getServerErrorMessage } from "@/features/job-applications/server";

export async function GET() {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to manage your goal." }, { status: 401 });
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.parse(`${today}T00:00:00.000Z`) + 86_400_000).toISOString();
    const [{ data: goal, error }, { data: jobs, error: jobsError }, { data: claim, error: claimError }, { data: cancellation, error: cancellationError }] = await Promise.all([
      ctx.db.from("job_application_goals").select("daily_goal").eq("user_id", ctx.userId).maybeSingle(),
      ctx.db.from("job_applications").select("id").eq("user_id", ctx.userId).eq("status", "applied").gte("applied_at", `${today}T00:00:00.000Z`).lt("applied_at", tomorrow),
      ctx.db.from("job_application_rewards").select("reward").eq("user_id", ctx.userId).eq("reward_date", today).maybeSingle(),
      ctx.db.from("job_application_goal_cancellations").select("fee").eq("user_id", ctx.userId).eq("cancellation_date", today).maybeSingle(),
    ]);
    if (error) throw error;
    if (jobsError) throw jobsError;
    if (claimError) throw claimError;
    if (cancellationError) throw cancellationError;
    return NextResponse.json({ goal: goal?.daily_goal ?? 5, configured: !!goal, appliedToday: jobs?.length ?? 0, claimed: !!claim, reward: claim?.reward ?? null, cancelled: !!cancellation, cancellationFee: cancellation?.fee ?? null });
  } catch (error) {
    return NextResponse.json({ error: getServerErrorMessage(error, "Could not load your goal.") }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to manage your goal." }, { status: 401 });
    const { dailyGoal } = (await request.json()) as { dailyGoal?: number };
    if (!Number.isInteger(dailyGoal) || dailyGoal! < 1 || dailyGoal! > 50) return NextResponse.json({ error: "Choose a daily goal from 1 to 50 applications." }, { status: 400 });
    const { error } = await ctx.db.from("job_application_goals").upsert({ user_id: ctx.userId, daily_goal: dailyGoal });
    if (error) throw error;
    return NextResponse.json({ dailyGoal });
  } catch (error) {
    return NextResponse.json({ error: getServerErrorMessage(error, "Could not save your goal.") }, { status: 500 });
  }
}
