export type Status =
  | "saved"
  | "applied"
  | "oa"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted"
  | "withdrawn";

export type Job = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  job_type: string;
  source: string;
  url: string;
  deadline: string | null;
  applied_at: string | null;
  interview_date: string | null;
  status: Status;
  priority: number;
  description: string;
  notes: string;
  screenshot: string | null;
  ai_meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Narrow shapes for list screens — never fetch raw posts for a card. */
export type JobDashboard = Pick<
  Job,
  "id" | "company" | "title" | "status" | "source" | "deadline" | "created_at" | "updated_at"
>;

export type JobSummary = Pick<
  Job,
  | "id"
  | "company"
  | "title"
  | "location"
  | "status"
  | "source"
  | "url"
  | "deadline"
  | "created_at"
  | "updated_at"
>;

export type JobBoard = Pick<
  Job,
  "id" | "company" | "title" | "status" | "source" | "deadline" | "updated_at"
>;

export type Activity = {
  id: string;
  job_id: string;
  kind: "created" | "status" | "note" | "interview" | "followup";
  from_status: string | null;
  to_status: string | null;
  note: string;
  happened_at: string;
};

export type Contact = {
  id: string;
  job_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type QuestionStatus = "missed" | "shaky" | "solid";

export type InterviewQuestion = {
  id: string;
  job_id: string;
  user_id: string;
  round: string;
  question: string;
  answer: string;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
};

export type Draft = {
  company: string;
  title: string;
  location: string;
  salary: string;
  currency: string;
  job_type: string;
  source: string;
  deadline: string;
  description: string;
  contacts: { name: string; role: string; email: string; phone: string }[];
  confidence: Record<string, number>;
};
