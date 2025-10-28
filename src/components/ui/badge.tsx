import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-neon-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-critical",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success text-black hover:bg-success/80 shadow-neon-sm",
        warning: "border-transparent bg-warning text-black hover:bg-warning/80 shadow-warning",
        running: "border-success/50 bg-success/20 text-success animate-neon-pulse",
        stopped: "border-muted-foreground/50 bg-muted text-muted-foreground",
        emergency: "border-destructive/50 bg-destructive/20 text-destructive animate-neon-pulse",
        fault: "border-warning/50 bg-warning/20 text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }