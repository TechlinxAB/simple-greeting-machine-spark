
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileTableCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTableCard({ children, className }: MobileTableCardProps) {
  return (
    <Card className={cn("mb-3 p-4", className)}>
      <CardContent className="p-0 space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileCardRow({ label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn("flex justify-between items-center py-1", className)}>
      <span className="text-sm text-muted-foreground font-medium">{label}:</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

interface MobileCardActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCardActions({ children, className }: MobileCardActionsProps) {
  return (
    <div className={cn("flex justify-end gap-2 pt-2 border-t", className)}>
      {children}
    </div>
  );
}
