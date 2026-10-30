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
      className="card mb-4 overflow-hidden"
    >
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-45 flex-1">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              value={values.q}
              onChange={(event) => update({ q: event.target.value }, false)}
              placeholder="Search jobs, companies, links…"
              aria-label="Search jobs"
              autoComplete="off"
              spellCheck={false}
              className="input h-10 pl-9 pr-9"
            />
            {isPending ? (
              <span
                aria-label="Updating results"
                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border border-line-3 border-t-fg-2"
              />
            ) : values.q ? (
              <button
                type="button"
                onClick={() => update({ q: "" }, true)}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fg"
              >
                <Icon name="close" size={12} />
              </button>
            ) : null}
          </div>
          <select
            name="source"
            value={values.source}
            onChange={(event) => update({ source: event.target.value }, true)}
            aria-label="Filter by source"
            className="input h-10 w-full sm:w-auto sm:min-w-32.5"
          >
            <option value="">Every source</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            name="sort"
            value={values.sort}
            onChange={(event) => update({ sort: event.target.value }, true)}
            aria-label="Sort jobs"
            className="input h-10 w-full sm:w-auto sm:min-w-36"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Apply</button>
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-line pt-3" aria-label="Filter by status">
          <button
            type="button"
            aria-pressed={!values.status}
            onClick={() => update({ status: "" }, true)}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] transition ${!values.status ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
          >
            All jobs
          </button>
          {STATUS_ORDER.map((status) => {
            const active = values.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: active ? "" : status }, true)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition ${active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
                {STATUS_META[status].short}
              </button>
            );
          })}
          {hasFilters && (
            <button type="button" onClick={reset} className="ml-auto shrink-0 px-2.5 py-1.5 text-[11px] text-muted transition hover:text-fg">
              Clear filters
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
