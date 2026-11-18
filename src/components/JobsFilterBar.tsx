"use client";

import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
 * plain GET form keeps working when JavaScript is unavailable.
 */
export function JobsFilterBar({ q, status, source, sort }: Draft) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Draft>({ q, status, source, sort });

  const latest = useRef<Draft>({ q, status, source, sort });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="mb-6"
    >
      {/* Keep the GET form functional without JavaScript. */}
      <input type="hidden" name="source" value={values.source} />
      <input type="hidden" name="sort" value={values.sort} />
      <input type="hidden" name="status" value={values.status} />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            name="q"
            value={values.q}
            onChange={(event) => update({ q: event.target.value }, false)}
            placeholder="Search jobs, companies, links…"
            aria-label="Search jobs"
            autoComplete="off"
            spellCheck={false}
            className="h-9 pl-9 pr-9 text-[12.5px]"
          />
          {isPending ? (
            <span
              aria-label="Updating results"
              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border border-line-3 border-t-fg-2"
            />
          ) : values.q ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => update({ q: "" }, true)}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
            >
              <Icon name="close" size={12} />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={values.source || "all"}
            onValueChange={(value) =>
              update({ source: value === "all" ? "" : (value ?? "") }, true)
            }
          >
            <SelectTrigger
              aria-label="Filter by source"
              className="h-9 w-full min-w-32 text-[12.5px] sm:w-36"
            >
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? "Every source"
                    : SOURCES.find((item) => item.value === value)?.label ?? "Every source"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every source</SelectItem>
              {SOURCES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={values.sort}
            onValueChange={(value) => update({ sort: value ?? "new" }, true)}
          >
            <SelectTrigger
              aria-label="Sort jobs"
              className="h-9 w-full min-w-36 text-[12.5px] sm:w-40"
            >
              <SelectValue>
                {(value) =>
                  SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Newest first"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex items-center gap-1 overflow-x-auto" aria-label="Filter by status">
        <Button
          type="button"
          variant={values.status ? "ghost" : "secondary"}
          size="xs"
          aria-pressed={!values.status}
          onClick={() => update({ status: "" }, true)}
          className="shrink-0 text-[11px]"
        >
          All
        </Button>
        {STATUS_ORDER.map((item) => {
          const active = values.status === item;
          return (
            <Button
              key={item}
              type="button"
              variant={active ? "secondary" : "ghost"}
              size="xs"
              aria-pressed={active}
              onClick={() => update({ status: active ? "" : item }, true)}
              className="shrink-0 gap-1.5 text-[11px]"
            >
              <span className={`size-1.5 rounded-full ${STATUS_META[item].dot}`} />
              {STATUS_META[item].short}
            </Button>
          );
        })}
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={reset}
            className="ml-auto shrink-0 text-[11px] text-muted"
          >
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
