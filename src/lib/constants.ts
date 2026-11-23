import type { QuestionStatus, Status } from "./types";

export const STATUS_ORDER: Status[] = [
  "saved",
  "applied",
  "interview",
  "oa",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
  "skipped",
];

export const BOARD_COLUMNS: Status[] = [
  "saved",
  "applied",
  "interview",
  "oa",
  "offer",
  "rejected",
  "skipped",
];

export const STATUS_META: Record<
  Status,
  { label: string; short: string; dot: string; pill: string; bar: string }
> = {
  saved: {
    label: "Saved",
    short: "Saved",
    dot: "bg-slate-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-slate-400",
  },
  applied: {
    label: "Applied",
    short: "Applied",
    dot: "bg-sky-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-sky-400",
  },
  oa: {
    label: "Assessment / Training",
    short: "Assessment",
    dot: "bg-amber-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-amber-400",
  },
  interview: {
    label: "Interview",
    short: "Interview",
    dot: "bg-violet-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-violet-400",
  },
  offer: {
    label: "Offer",
    short: "Offer",
    dot: "bg-emerald-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-emerald-400",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    dot: "bg-rose-400",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-rose-400",
  },
  ghosted: {
    label: "Ghosted",
    short: "Ghosted",
    dot: "bg-zinc-500",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-zinc-500",
  },
  withdrawn: {
    label: "Withdrawn",
    short: "Withdrawn",
    dot: "bg-zinc-500",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-zinc-500",
  },
  skipped: {
    label: "Skipped",
    short: "Skipped",
    dot: "bg-zinc-500",
    pill: "bg-surface-2 text-fg-2 border-line-2",
    bar: "bg-zinc-500",
  },
};

export const SOURCES = [
  { value: "bdjobs", label: "BDJobs" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

export const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "remote", label: "Remote" },
];

export const QUESTION_STATUS_ORDER: QuestionStatus[] = ["missed", "shaky", "solid"];

export const QUESTION_STATUS_META: Record<
  QuestionStatus,
  { label: string; short: string; dot: string; pill: string }
> = {
  missed: {
    label: "To review",
    short: "New",
    dot: "bg-slate-400",
    pill: "border-line-2 bg-surface-2 text-fg-2",
  },
  shaky: {
    label: "Shaky",
    short: "Shaky",
    dot: "bg-warn",
    pill: "border-warn/25 bg-warn-soft text-warn",
  },
  solid: {
    label: "Answered well",
    short: "Solid",
    dot: "bg-success",
    pill: "border-success/25 bg-success-soft text-success",
  },
};

export function isQuestionStatus(value: string): value is QuestionStatus {
  return (QUESTION_STATUS_ORDER as string[]).includes(value);
}
