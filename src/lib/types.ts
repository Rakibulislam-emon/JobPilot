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
  status: Status;
  priority: number;
  description: string;
  notes: string;
  screenshot: string | null;
  ai_meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

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
