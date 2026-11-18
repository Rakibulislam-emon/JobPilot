"use client";

import { useEffect, useState } from "react";
import {
  isQuestionStatus,
  QUESTION_STATUS_META,
  QUESTION_STATUS_ORDER,
} from "@/lib/constants";
import type { QuestionStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Client wrapper for the shadcn Select so it can be used inside server-rendered
 * forms. Base UI writes the chosen value to a hidden input named `status`.
 */
export function StatusSelect({ defaultValue }: { defaultValue: QuestionStatus }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <Select
      name="status"
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string" && isQuestionStatus(nextValue)) {
          setValue(nextValue);
        }
      }}
    >
      <SelectTrigger aria-label="How it went" className="h-9 w-full text-[12.5px]">
        <SelectValue>
          {(value) => {
            const key = String(value) as QuestionStatus;
            return QUESTION_STATUS_META[key]?.label ?? QUESTION_STATUS_META.missed.label;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {QUESTION_STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            {QUESTION_STATUS_META[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
