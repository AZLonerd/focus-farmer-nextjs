import Link from "next/link";
import { JobApplicationsScreen } from "@/features/job-applications/job-applications-screen";

/** Job application goals and tracking within the daily tasks section. */
export function DailyTasksScreen({ onCoinsEarned }: { onCoinsEarned: () => Promise<void> }) {
  return (
    <>
      <JobApplicationsScreen onCoinsEarned={onCoinsEarned} />
      <Link className="primary full daily-task-back" href="/">
        Go Back to Farm
      </Link>
    </>
  );
}
