"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { deleteJobs, skipJobs } from "@/app/actions";
import { Icon } from "./Icon";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

type SelectionValue = {
  selected: Set<string>;
  all: string[];
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionValue | null>(null);

function useSelection(): SelectionValue {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("JobsSelection components must be used inside JobsSelectionProvider");
  return value;
}

export function JobsSelectionProvider({
  ids,
  children,
}: {
  ids: string[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const key = ids.join("|");

  // A new page / filter / deletion means the old selection is meaningless.
  useEffect(() => {
    setSelected(new Set());
  }, [key]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));

  const clear = () => setSelected(new Set());

  return (
    <SelectionContext.Provider value={{ selected, all: ids, toggle, toggleAll, clear }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function SelectAllCheckbox() {
  const { selected, all, toggleAll } = useSelection();
  const partial = selected.size > 0 && selected.size < all.length;

  return (
    <Checkbox
      checked={all.length > 0 && selected.size === all.length}
      indeterminate={partial}
      onCheckedChange={toggleAll}
      aria-label="Select all jobs on this page"
    />
  );
}

export function JobCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection();
  return (
    <Checkbox
      checked={selected.has(id)}
      onCheckedChange={() => toggle(id)}
      aria-label={`Select ${label}`}
    />
  );
}

function DeleteSelectedButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
      className="h-8 gap-1.5 px-2.5 text-[11.5px] disabled:cursor-wait"
    >
      <Icon name="trash" size={13} />
      {pending ? "Deleting…" : `Delete ${count}`}
    </Button>
  );
}

function SkipSelectedButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="h-8 px-2.5 text-[11.5px]"
    >
      {pending ? "Skipping…" : `Skip ${count}`}
    </Button>
  );
}

export function BulkJobActions() {
  const { selected, clear } = useSelection();
  const count = selected.size;
  if (count === 0) return null;

  const ids = Array.from(selected);
  const noun = count === 1 ? "job" : "jobs";

  return (
    <div className="sticky top-14 z-20 -mx-1 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/25 bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-md md:top-0">
      <span className="text-[11.5px] text-fg-2">
        <span className="mono text-fg">{count}</span> {noun} selected
      </span>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="h-8 px-2.5 text-[11.5px]">
          Clear
        </Button>
        <form
          action={skipJobs}
        >
          {ids.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <SkipSelectedButton count={count} />
        </form>
        <form
          action={deleteJobs}
          onSubmit={(event) => {
            const message = `Delete ${count} ${noun} and all their history? This cannot be undone.`;
            if (!window.confirm(message)) event.preventDefault();
          }}
        >
          {ids.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <DeleteSelectedButton count={count} />
        </form>
      </div>
    </div>
  );
}
