export type JobApplication = {
  id: string;
  title: string;
  company: string;
  url: string;
  status: "saved" | "applied";
  verified_at: string;
  applied_at: string | null;
};

export type JobApplicationData = Pick<
  JobApplication,
  "title" | "company" | "url" | "status"
>;
