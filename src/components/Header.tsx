
import { forwardRef, ElementRef, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const Header = forwardRef<
  ElementRef<"header">,
  ComponentPropsWithoutRef<"header">
>(({ className, ...props }, ref) => {
  return (
    <header
      ref={ref}
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6",
        className
      )}
      {...props}
    />
  );
});

Header.displayName = "Header";

export { Header };
