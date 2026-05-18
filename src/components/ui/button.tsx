import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[#cc785c] bg-[#cc785c] text-white shadow-[0_1px_0_rgba(20,20,19,0.08)] hover:border-[#a9583e] hover:bg-[#a9583e] [a]:hover:bg-[#a9583e]",
        outline:
          "border-[#d8cfc6] bg-[#fffaf2] text-[#141413] hover:border-[#cc785c]/60 hover:bg-[#f5f0e8] hover:text-[#141413] aria-expanded:border-[#cc785c]/60 aria-expanded:bg-[#f5f0e8] dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "border-[#252320] bg-[#252320] text-[#fffaf2] hover:bg-[#181715] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-[#3d3d3a] hover:bg-[#efe9de] hover:text-[#141413] aria-expanded:bg-[#efe9de] aria-expanded:text-[#141413] dark:hover:bg-muted/50",
        destructive:
          "border-[#a23d2a]/20 bg-[#fff1e9] text-[#a23d2a] hover:bg-[#f6ded2] focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 gap-1.5 px-5 py-2.5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "min-h-8 gap-1 px-3 py-1 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-10 gap-1 px-4 py-2 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-1.5 px-6 py-3 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs":
          "size-8 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
