import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-invert text-invert-fg hover:bg-[#d4d4d4]",
        outline:
          "border-line-2 bg-transparent text-fg hover:border-line-3 hover:bg-surface-2",
        secondary:
          "bg-surface-2 text-fg hover:bg-surface-3 aria-expanded:bg-surface-3",
        ghost:
          "text-muted hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2 aria-expanded:text-fg",
        destructive:
          "border-danger/25 bg-danger-soft text-danger hover:bg-danger/15 focus-visible:ring-danger/25",
        link: "text-fg underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 rounded px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[12.5px]",
        lg: "h-10 gap-2 rounded-md px-4 text-[13.5px]",
        icon: "size-9",
        "icon-xs": "size-6 rounded [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
