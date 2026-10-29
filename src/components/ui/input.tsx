import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-line-2 bg-black px-3 py-1.5 text-[13px] text-fg transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-fg placeholder:text-muted-2 hover:border-line-3 focus-visible:border-[#525252] focus-visible:ring-2 focus-visible:ring-white/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
