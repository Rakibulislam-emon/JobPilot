"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date | undefined, b: Date): boolean {
  return Boolean(a && dateKey(a) === dateKey(b));
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function fullDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const [focusedDate, setFocusedDate] = useState(() => selected ?? new Date());
  const dayButtons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!selected) return;
    setMonth(startOfMonth(selected));
    setFocusedDate(selected);
  }, [selected]);

  useEffect(() => {
    dayButtons.current.get(dateKey(focusedDate))?.focus();
  }, [focusedDate, month]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = new Date(year, monthIndex, 1).getDay();
  const firstCell = new Date(year, monthIndex, 1 - offset);
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        firstCell.getFullYear(),
        firstCell.getMonth(),
        firstCell.getDate() + index
      )
  );
  const today = new Date();

  function moveMonth(amount: number) {
    const nextMonth = new Date(year, monthIndex + amount, 1);
    setMonth(nextMonth);
    setFocusedDate(nextMonth);
  }

  function handleDayKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    date: Date
  ) {
    let nextDate: Date | null = null;
    if (event.key === "ArrowLeft") nextDate = new Date(year, monthIndex, date.getDate() - 1);
    if (event.key === "ArrowRight") nextDate = new Date(year, monthIndex, date.getDate() + 1);
    if (event.key === "ArrowUp") nextDate = new Date(year, monthIndex, date.getDate() - 7);
    if (event.key === "ArrowDown") nextDate = new Date(year, monthIndex, date.getDate() + 7);
    if (event.key === "Home") nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    if (event.key === "End") nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (6 - date.getDay()));
    if (event.key === "PageUp" || event.key === "PageDown") {
      const direction = event.key === "PageUp" ? -1 : 1;
      const amount = direction * (event.shiftKey ? 12 : 1);
      const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1);
      const lastDay = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0
      ).getDate();
      nextDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        Math.min(date.getDate(), lastDay)
      );
    }

    if (!nextDate) return;
    event.preventDefault();
    setFocusedDate(nextDate);
    if (!sameMonth(nextDate, month)) setMonth(startOfMonth(nextDate));
  }

  return (
    <div
      className={cn(
        "w-70 select-none p-3 text-fg",
        className
      )}
    >
      <div className="mb-2 flex h-9 items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 aria-live="polite" className="text-[13px] font-medium">
          {monthLabel(month)}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => moveMonth(1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <table aria-label={`${monthLabel(month)} calendar`} className="w-full border-collapse">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th
                key={weekday}
                scope="col"
                className="h-8 text-center text-[10px] font-medium text-muted-2"
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, week) => (
            <tr key={week}>
              {days.slice(week * 7, week * 7 + 7).map((date) => {
                const key = dateKey(date);
                const isSelected = sameDay(selected, date);
                const isToday = sameDay(today, date);
                const isCurrentMonth = sameMonth(month, date);
                return (
                  <td key={key} className="p-0 text-center">
                    <button
                      ref={(element) => {
                        if (element) dayButtons.current.set(key, element);
                        else dayButtons.current.delete(key);
                      }}
                      type="button"
                      tabIndex={sameDay(focusedDate, date) ? 0 : -1}
                      aria-label={fullDateLabel(date)}
                      aria-pressed={isSelected}
                      onFocus={() => setFocusedDate(date)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                      onClick={() => {
                        setFocusedDate(date);
                        onSelect?.(date);
                      }}
                      className={cn(
                        "mx-auto grid size-8 place-items-center rounded-md text-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                        isCurrentMonth ? "text-fg" : "text-muted-2",
                        isToday && !isSelected && "bg-surface-3 text-fg",
                        isSelected
                          ? "bg-invert font-medium text-invert-fg hover:bg-invert/90"
                          : "hover:bg-surface-3"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
