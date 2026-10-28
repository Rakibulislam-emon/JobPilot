import type { Status } from "./types";

export const STATUS_ORDER: Status[] = [
  "saved",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
];

export const BOARD_COLUMNS: Status[] = [
  "saved",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
];

export const STATUS_META: Record<
  Status,
  { label: string; short: string; dot: string; pill: string; bar: string }
> = {
  saved: {
    label: "Saved",
    short: "Saved",
    dot: "bg-slate-400",
    pill: "bg-slate-400/10 text-slate-300 border-slate-400/25",
    bar: "bg-slate-400",
  },
  applied: {
    label: "Applied",
    short: "Applied",
    dot: "bg-sky-400",
    pill: "bg-sky-400/10 text-sky-300 border-sky-400/25",
    bar: "bg-sky-400",
  },
  oa: {
    label: "Assessment / OA",
    short: "OA",
    dot: "bg-amber-400",
    pill: "bg-amber-400/10 text-amber-300 border-amber-400/25",
    bar: "bg-amber-400",
  },
  interview: {
    label: "Interview",
    short: "Interview",
    dot: "bg-violet-400",
    pill: "bg-violet-400/10 text-violet-300 border-violet-400/25",
    bar: "bg-violet-400",
  },
  offer: {
    label: "Offer",
    short: "Offer",
    dot: "bg-emerald-400",
    pill: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
    bar: "bg-emerald-400",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    dot: "bg-rose-400",
    pill: "bg-rose-400/10 text-rose-300 border-rose-400/25",
    bar: "bg-rose-400",
  },
  ghosted: {
    label: "Ghosted",
    short: "Ghosted",
    dot: "bg-zinc-500",
    pill: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
    bar: "bg-zinc-500",
  },
  withdrawn: {
    label: "Withdrawn",
    short: "Withdrawn",
    dot: "bg-zinc-500",
    pill: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
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

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Dream",
  2: "High",
  3: "Normal",
  4: "Low",
  5: "Just looking",
};
