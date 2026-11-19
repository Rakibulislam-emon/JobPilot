"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date
    : undefined;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DeadlinePicker({
  id,
  name,
  value,
  onChange,
  ariaLabel = "Choose application deadline",
  placeholder = "Pick a deadline",
  clearLabel = "Clear deadline",
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = parseDate(value);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-label={ariaLabel}
              aria-expanded={open}
              className="h-9 w-full justify-between px-3 text-left font-normal"
            />
          }
        >
          <span className={date ? "text-fg" : "text-muted-2"}>
            {date ? formatDisplayDate(date) : placeholder}
          </span>
          <CalendarDays aria-hidden="true" className="size-4 text-muted" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          positionerClassName="z-[110]"
          className="w-auto gap-0 border-line-2 bg-surface p-1"
        >
          <Calendar
            selected={date}
            onSelect={(nextDate) => {
              onChange(formatDateValue(nextDate));
              setOpen(false);
            }}
          />
          {date && (
            <div className="border-t border-line px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full text-muted"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {clearLabel}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
