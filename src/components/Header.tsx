
import { forwardRef, ElementRef, ComponentPropsWithoutRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const Header = forwardRef<
  ElementRef<"header">,
  ComponentPropsWithoutRef<"header">
>(({ className, ...props }, ref) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update the time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      ref={ref}
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background px-4 sm:px-6",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-end">
        <div className="text-sm font-medium">
          {format(currentTime, "EEEE, MMMM d, yyyy")}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(currentTime, "HH:mm")}
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";

export { Header };
