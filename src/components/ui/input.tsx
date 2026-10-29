import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-line-2 bg-surface-2 px-3 py-1.5 text-sm text-fg transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg placeholder:text-muted-2 focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
