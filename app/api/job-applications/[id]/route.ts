import { NextResponse } from "next/server";
import { getJobApplicationClients } from "@/features/job-applications/server";
import { verifyJobPosting } from "@/features/job-applications/verify-url";
import { normalizeJobUrl } from "@/features/job-applications/normalize-url";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to update applications." }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as { title?: string; company?: string; url?: string; status?: string };
    const { data: current, error: currentError } = await ctx.db.from("job_applications").select("status,applied_at,url,canonical_url").eq("id", id).eq("user_id", ctx.userId).single();
    if (currentError) throw currentError;
    const changes: Record<string, string | null> = {};
    if (typeof body.title === "string") changes.title = body.title.trim().slice(0, 180);
    if (typeof body.company === "string") changes.company = body.company.trim().slice(0, 140);
    if (typeof body.url === "string" && body.url.trim() !== current.url) {
      const verified = await verifyJobPosting(body.url.trim());
      changes.url = verified.verifiedUrl;
      changes.canonical_url = normalizeJobUrl(verified.verifiedUrl);
      changes.verified_at = new Date().toISOString();
    }
    if (body.status === "saved" || body.status === "applied") changes.status = body.status;
    if (body.status === "applied" && current.status !== "applied") changes.applied_at = new Date().toISOString();
    if (body.status === "applied" && current.status === "applied") changes.applied_at = current.applied_at;
    if (body.status === "saved") changes.applied_at = null;
    if (!Object.keys(changes).length || (changes.title !== undefined && !changes.title) || (typeof changes.url === "string" && changes.url.length > 2048)) return NextResponse.json({ error: "There are no valid changes to save." }, { status: 400 });
    if (typeof changes.canonical_url === "string") {
      const { data: duplicate, error: duplicateError } = await ctx.db.from("job_applications").select("id").eq("user_id", ctx.userId).eq("canonical_url", changes.canonical_url).neq("id", id).maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return NextResponse.json({ error: "You already have this job in your applications." }, { status: 409 });
    }
    const { data, error } = await ctx.db.from("job_applications").update(changes).eq("id", id).eq("user_id", ctx.userId).select("id,title,company,url,status,verified_at,applied_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "You already have this job in your applications." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update this job." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to delete applications." }, { status: 401 });
    const { id } = await params;
    const { error } = await ctx.db.from("job_applications").delete().eq("id", id).eq("user_id", ctx.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete this job." }, { status: 500 });
  }
}
