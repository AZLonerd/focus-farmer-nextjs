"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobApplication, JobApplicationData } from "./types";

type GoalData = { goal: number; configured: boolean; appliedToday: number; claimed: boolean; reward: number | null; cancelled: boolean; cancellationFee: number | null };
type Props = { onCoinsEarned: () => Promise<void> };

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

/** Goal, verified postings, and application checklist backed by the server API. */
export function JobApplicationsScreen({ onCoinsEarned }: Props) {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [goal, setGoal] = useState(5);
  const [goalInput, setGoalInput] = useState("5");
  const [goalConfigured, setGoalConfigured] = useState(false);
  const [goalLoading, setGoalLoading] = useState(true);
  const [appliedToday, setAppliedToday] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancellationFee, setCancellationFee] = useState<number | null>(null);
  const [reward, setReward] = useState<number | null>(null);
  const [draft, setDraft] = useState<JobApplicationData>({ title: "", company: "", url: "", status: "saved" });
  const [verified, setVerified] = useState(false);
  const [verificationText, setVerificationText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentDay = useRef(utcDayKey());

  const refresh = useCallback(async () => {
    const [jobData, goalData] = await Promise.all([
      api<{ jobs: JobApplication[] }>("/api/job-applications"),
      api<GoalData>("/api/job-applications/goal"),
    ]);
    setJobs(jobData.jobs);
    setGoal(goalData.goal);
    setGoalInput(String(goalData.goal));
    setGoalConfigured(goalData.configured);
    setAppliedToday(goalData.appliedToday);
    setClaimed(goalData.claimed);
    setReward(goalData.reward);
    setCancelled(goalData.cancelled);
    setCancellationFee(goalData.cancellationFee);
    setGoalLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not load applications.");
      setGoalLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let active = true;
    const refreshIfNewDay = () => {
      const day = utcDayKey();
      if (day === currentDay.current) return;
      currentDay.current = day;
      void refresh().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Could not refresh today's applications.");
      });
    };
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      timeout = setTimeout(() => {
        if (!active) return;
        refreshIfNewDay();
        scheduleMidnightRefresh();
      }, midnight - now.getTime() + 25);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshIfNewDay();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    scheduleMidnightRefresh();
    return () => {
      active = false;
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verifyDraft = () => run(async () => {
    setVerified(false);
    setVerificationText("Checking the posting...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const result = await api<{ verifiedUrl: string; suggestedTitle: string; verificationMethod: "page" | "link" }>("/api/job-applications/verify", {
        method: "POST", body: JSON.stringify({ url: draft.url }), signal: controller.signal,
      });
      setDraft((current) => ({ ...current, url: result.verifiedUrl, title: current.title || result.suggestedTitle }));
      setVerified(true);
      setVerificationText(result.verificationMethod === "link"
        ? "The site blocked the page check, but this link looks like a specific job posting. You can add it."
        : "Job posting found. You can add it to your list.");
    } catch (error) {
      const detail = error instanceof DOMException && error.name === "AbortError"
        ? "The check took too long. Try again or use another link."
        : error instanceof Error ? error.message : "Please try another link.";
      setVerificationText(`Could not verify this link. ${detail}`);
    } finally {
      clearTimeout(timeout);
    }
  });

  const addJob = () => run(async () => {
    const result = await api<{ job: JobApplication }>("/api/job-applications", { method: "POST", body: JSON.stringify(draft) });
    setJobs((current) => [result.job, ...current]);
    setDraft({ title: "", company: "", url: "", status: "saved" });
    setVerified(false);
    setVerificationText("");
  });

  const saveJob = (job: JobApplication) => run(async () => {
    await api(`/api/job-applications/${job.id}`, { method: "PATCH", body: JSON.stringify({ title: job.title, company: job.company, url: job.url, status: job.status }) });
    await refresh();
  });

  const markApplied = (job: JobApplication, isApplied: boolean) => run(async () => {
    const result = await api<{ job: JobApplication }>(`/api/job-applications/${job.id}`, {
      method: "PATCH", body: JSON.stringify({ status: isApplied ? "applied" : "saved" }),
    });
    setJobs((current) => current.map((item) => item.id === job.id ? result.job : item));
    await refresh();
  });

  const claimReward = () => run(async () => {
    const result = await api<{ reward: number; alreadyClaimed: boolean }>("/api/job-applications/claim", { method: "POST" });
    setClaimed(true);
    setReward(result.reward);
    await onCoinsEarned();
    await refresh();
  });

  const saveGoal = () => run(async () => {
    const dailyGoal = Number(goalInput);
    await api<{ dailyGoal: number }>("/api/job-applications/goal", { method: "PUT", body: JSON.stringify({ dailyGoal }) });
    await refresh();
  });

  const cancelGoal = () => {
    if (!window.confirm(`Cancel today's goal? Up to ${goal * 10} gold will be deducted. If your balance is below that amount, cancellation is free. Today's reward will be unavailable.`)) return;
    void run(async () => {
      const result = await api<{ fee: number }>("/api/job-applications/cancel", { method: "POST" });
      setCancelled(true);
      setCancellationFee(result.fee);
      await onCoinsEarned();
      await refresh();
    });
  };

  return (
    <section className="card daily-tasks job-applications">
      <div className="eyebrow">YOUR DAILY GROWTH</div>
      <h1>Job Applications</h1>
      <p className="subtle">Verify job posts, track the roles you apply to, and earn gold for reaching your daily goal.</p>

      <section className="job-goal-panel" aria-label="Daily application goal">
        <div>
          <h2>Daily goal</h2>
          {goalConfigured && <>
            <p>{appliedToday} of {goal} applications marked applied today</p>
            <p className="job-reward-note">Reach your goal to earn {goal * 10} gold. Bigger goals earn more.</p>
          </>}
        </div>
        {goalLoading ? <p role="status">Loading your daily goal...</p> : !goalConfigured && <form className="job-goal-form" onSubmit={(event) => { event.preventDefault(); void saveGoal(); }}>
          <label htmlFor="daily-job-goal">Set jobs per day to get started</label>
          <input id="daily-job-goal" type="number" min="1" max="50" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} />
          <button className="secondary" disabled={busy}>Save goal and continue</button>
        </form>}
        {cancelled && <p className="job-cancelled" role="status">A goal was cancelled today; {cancellationFee ? `${cancellationFee} gold deducted` : "no gold deducted because your balance was below the cancellation fee"}. Today&apos;s reward is unavailable.</p>}
        {goalConfigured && (cancelled
          ? null
          : <>
              {claimed ? <p className="job-claimed" role="status">Today's reward: +{reward ?? goal * 10} gold claimed!</p> : appliedToday >= goal ? <button className="primary full" disabled={busy} onClick={() => void claimReward()}>Claim {goal * 10} gold</button> : null}
              <button className="job-cancel-goal" disabled={busy} onClick={cancelGoal}>Cancel today&apos;s goal (up to {goal * 10} gold)</button>
            </>)}
      </section>

      {goalConfigured && <>
      <form className="job-add-form" onSubmit={(event) => { event.preventDefault(); void addJob(); }}>
        <h2>Add a job posting</h2>
        <label htmlFor="job-link">Job posting link</label>
        <input id="job-link" type="url" required disabled={busy} placeholder="https://company.com/careers/job" value={draft.url} onChange={(event) => { setDraft({ ...draft, url: event.target.value }); setVerified(false); setVerificationText(""); }} />
        <button type="button" className="secondary" disabled={busy || !draft.url} onClick={() => void verifyDraft()}>Verify link</button>
        {verificationText && <p className={verified ? "job-verified" : "job-checking"} role="status">{verificationText}</p>}
        <label htmlFor="job-title">Job title</label>
        <input id="job-title" required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <label htmlFor="job-company">Company <span>(optional)</span></label>
        <input id="job-company" maxLength={140} value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} />
        <button className="primary full" disabled={busy || !verified || !draft.title.trim()}>Add verified job</button>
      </form>

      <div className="job-list-heading"><h2>My applications</h2><span>{jobs.length}</span></div>
      {jobs.length === 0 ? <p className="subtle">No applications yet. Verify a job link above to get started.</p> : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.id}>
              <details className="job-row">
                <summary className="job-row-summary">
                  <span className="job-row-title">{job.title || "Untitled job"}</span>
                  {job.company && <span className="job-row-company">{job.company}</span>}
                  <span className={`job-status ${job.status}`}>{job.status === "applied" ? "Applied" : "Saved"}</span>
                </summary>
                <div className="job-row-content">
                  <div className="job-row-fields">
                    <label>Job title<input value={job.title} maxLength={180} onChange={(event) => setJobs((current) => current.map((item) => item.id === job.id ? { ...item, title: event.target.value } : item))} /></label>
                    <label>Company<input value={job.company} maxLength={140} onChange={(event) => setJobs((current) => current.map((item) => item.id === job.id ? { ...item, company: event.target.value } : item))} /></label>
                  </div>
                  <label className="job-url-field">Verified job link<input type="url" value={job.url} onChange={(event) => setJobs((current) => current.map((item) => item.id === job.id ? { ...item, url: event.target.value } : item))} /></label>
                  <label className="job-applied-toggle"><input type="checkbox" checked={job.status === "applied"} disabled={busy} onChange={(event) => void markApplied(job, event.target.checked)} /> Applied</label>
                  <div className="job-row-actions">
                    <button className="secondary" disabled={busy || !job.title.trim()} onClick={() => void saveJob(job)}>Save changes</button>
                    <button className="job-delete" disabled={busy} onClick={() => void run(async () => { await api(`/api/job-applications/${job.id}`, { method: "DELETE" }); setJobs((current) => current.filter((item) => item.id !== job.id)); await refresh(); })}>Delete</button>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      </>}
      {message && <p className="notice" role="alert">{message}</p>}
    </section>
  );
}
