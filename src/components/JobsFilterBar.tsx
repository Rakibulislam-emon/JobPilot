"use client";

import { Icon } from "@/components/Icon";
import { SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const SORT_OPTIONS = [
  { value: "new", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
  { value: "deadline", label: "Deadline soon" },
  { value: "company", label: "Company A–Z" },
];

const DEBOUNCE_MS = 300;

type Draft = { q: string; status: string; source: string; sort: string };

const EMPTY: Draft = { q: "", status: "", source: "", sort: "new" };

function buildHref(draft: Draft): string {
  const params = new URLSearchParams();
  const term = draft.q.trim();
  if (term) params.set("q", term);
  if (draft.status) params.set("status", draft.status);
  if (draft.source) params.set("source", draft.source);
  if (draft.sort && draft.sort !== "new") params.set("sort", draft.sort);
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

/**
 * Instant job filters. Typing is debounced, dropdowns apply on change and the
 * plain GET form still works if JavaScript is unavailable.
 */
export function JobsFilterBar({ q, status, source, sort }: Draft) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Draft>({ q, status, source, sort });

  const latest = useRef<Draft>({ q, status, source, sort });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the boxes in sync when the URL changes from elsewhere (back/forward,
  // Reset, a link from the dashboard).
  useEffect(() => {
    const incoming = { q, status, source, sort };
    const current = latest.current;
    const same =
      current.status === incoming.status &&
      current.source === incoming.source &&
      current.sort === incoming.sort &&
      current.q.trim() === incoming.q;
    if (same) return;
    latest.current = incoming;
    setValues(incoming);
  }, [q, status, source, sort]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function schedule(next: Draft, immediate: boolean) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const go = () => {
      timer.current = null;
      startTransition(() => {
        router.replace(buildHref(next), { scroll: false });
      });
    };

    if (immediate) go();
    else timer.current = setTimeout(go, DEBOUNCE_MS);
  }

  function update(patch: Partial<Draft>, immediate: boolean) {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setValues(next);
    schedule(next, immediate);
  }

  function reset() {
    latest.current = EMPTY;
    setValues(EMPTY);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    startTransition(() => {
      router.replace("/jobs", { scroll: false });
    });
  }

  const hasFilters = Boolean(
    values.q.trim() || values.status || values.source || values.sort !== "new"
  );

  return (
    <form
      method="get"
      action="/jobs"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        schedule(latest.current, true);
      }}
      className="card mb-4 flex flex-wrap items-end gap-2 p-3"
    >
      <div className="relative min-w-45 flex-1">
        <Icon
          name="search"
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          name="q"
          value={values.q}
          onChange={(event) => update({ q: event.target.value }, false)}
          placeholder="Search company, role, location, link, notes…"
          aria-label="Search jobs"
          autoComplete="off"
          spellCheck={false}
          className="input pl-8 pr-8"
        />
        {isPending && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border border-line-3 border-t-fg-2"
          />
        )}
      </div>

      <select
        name="status"
        value={values.status}
        onChange={(event) => update({ status: event.target.value }, true)}
        aria-label="Filter by status"
        className="input w-auto min-w-35"
      >
        <option value="">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>

      <select
        name="source"
        value={values.source}
        onChange={(event) => update({ source: event.target.value }, true)}
        aria-label="Filter by source"
        className="input w-auto min-w-32.5"
      >
        <option value="">All sources</option>
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        name="sort"
        value={values.sort}
        onChange={(event) => update({ sort: event.target.value }, true)}
        aria-label="Sort jobs"
        className="input w-auto min-w-32.5"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        Apply
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={reset}
          className="btn btn-ghost text-muted"
        >
          Reset
        </button>
      )}
    </form>
  );
}
