import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // RG Family custom variants
        excel: "border-transparent bg-zinc-700 text-zinc-100",
        crew: "border-transparent bg-zinc-600 text-zinc-200",
        live: "border-transparent bg-[#ef4444] text-white animate-pulse",
        vip: "border-transparent bg-gradient-to-r from-[#ffd700] to-[#fdb931] text-black",
        gold: "border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700]",
        silver: "border-[#c0c0c0] bg-[#c0c0c0]/10 text-[#c0c0c0]",
        bronze: "border-[#cd7f32] bg-[#cd7f32]/10 text-[#cd7f32]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
