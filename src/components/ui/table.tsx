
import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsLaptop } from "@/hooks/use-mobile";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { isCompact?: boolean }
>(({ className, isCompact, ...props }, ref) => {
  const autoIsLaptop = useIsLaptop();
  // Use the explicit prop if provided, otherwise fallback to the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom", 
          compact ? "text-xs" : "text-sm", 
          className
        )}
        {...props}
      />
    </div>
  );
})
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { isCompact?: boolean }
>(({ className, isCompact, ...props }, ref) => {
  const autoIsLaptop = useIsLaptop();
  // Use the explicit prop if provided, otherwise fallback to the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        compact ? "h-8" : "", // Reduce height in compact mode
        className
      )}
      {...props}
    />
  );
})
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { isCompact?: boolean }
>(({ className, isCompact, ...props }, ref) => {
  const autoIsLaptop = useIsLaptop();
  // Use the explicit prop if provided, otherwise fallback to the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  return (
    <th
      ref={ref}
      className={cn(
        "text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        compact ? "h-8 px-2 text-xs" : "h-12 px-4",
        className
      )}
      {...props}
    />
  );
})
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { isCompact?: boolean }
>(({ className, isCompact, ...props }, ref) => {
  const autoIsLaptop = useIsLaptop();
  // Use the explicit prop if provided, otherwise fallback to the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  return (
    <td
      ref={ref}
      className={cn(
        "align-middle [&:has([role=checkbox])]:pr-0",
        compact ? "p-2 text-xs" : "p-4",
        className
      )}
      {...props}
    />
  );
})
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement> & { isCompact?: boolean }
>(({ className, isCompact, ...props }, ref) => {
  const autoIsLaptop = useIsLaptop();
  // Use the explicit prop if provided, otherwise fallback to the hook
  const compact = isCompact !== undefined ? isCompact : autoIsLaptop;
  
  return (
    <caption
      ref={ref}
      className={cn(
        "mt-4 text-muted-foreground",
        compact ? "text-xs" : "text-sm",
        className
      )}
      {...props}
    />
  );
})
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
