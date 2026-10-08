import { NextResponse } from "next/server";
import { getJobApplicationClients } from "@/features/job-applications/server";
import type { JobApplicationData } from "@/features/job-applications/types";
import { verifyJobPosting } from "@/features/job-applications/verify-url";
import { normalizeJobUrl } from "@/features/job-applications/normalize-url";

export async function GET() {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to track applications." }, { status: 401 });
    const { data, error } = await ctx.db.from("job_applications").select("id,title,company,url,status,verified_at,applied_at").eq("user_id", ctx.userId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ jobs: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load applications." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getJobApplicationClients();
    if (!ctx) return NextResponse.json({ error: "Sign in to track applications." }, { status: 401 });
    const body = (await request.json()) as Partial<JobApplicationData>;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const company = typeof body.company === "string" ? body.company.trim().slice(0, 140) : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!title || !url) return NextResponse.json({ error: "Add a job title and verify its link first." }, { status: 400 });
    const submittedCanonicalUrl = normalizeJobUrl(url);
    const { data: submittedDuplicate, error: submittedDuplicateError } = await ctx.db.from("job_applications").select("id").eq("user_id", ctx.userId).eq("canonical_url", submittedCanonicalUrl).maybeSingle();
    if (submittedDuplicateError) throw submittedDuplicateError;
    if (submittedDuplicate) return NextResponse.json({ error: "You already added this job application." }, { status: 409 });
    const verified = await verifyJobPosting(url);
    const canonicalUrl = normalizeJobUrl(verified.verifiedUrl);
    const { data: existing, error: duplicateError } = await ctx.db.from("job_applications").select("id").eq("user_id", ctx.userId).eq("canonical_url", canonicalUrl).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (existing) return NextResponse.json({ error: "You already added this job application." }, { status: 409 });
    const { data, error } = await ctx.db.from("job_applications").insert({ user_id: ctx.userId, title, company, url: verified.verifiedUrl, canonical_url: canonicalUrl, status: "saved", verified_at: new Date().toISOString() }).select("id,title,company,url,status,verified_at,applied_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "You already added this job application." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ job: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add this job." }, { status: 500 });
  }
}
